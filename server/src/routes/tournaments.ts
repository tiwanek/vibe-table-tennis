import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../index.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { generateSwissPairings, generateGroupStage, generateEliminationBracket, calculateSwissRounds, calculateGroupStandings } from '../services/tournament.js'

const router = Router()

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.enum(['SWISS', 'GROUP_ELIMINATION']),
})

// Get all tournaments
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        creator: { select: { id: true, username: true } },
        players: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
        _count: { select: { matches: true, players: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(tournaments)
  } catch (error) {
    next(error)
  }
})

// Create a tournament
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createTournamentSchema.parse(req.body)

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        type: data.type,
        creatorId: req.user!.id,
      },
      include: {
        creator: { select: { id: true, username: true } },
      },
    })

    res.status(201).json(tournament)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// Get tournament by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, username: true } },
        players: {
          include: {
            user: { select: { id: true, username: true, mmr: true } },
          },
        },
        matches: {
          include: {
            player1: { select: { id: true, username: true } },
            player2: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!tournament) {
      throw new AppError('Tournament not found', 404)
    }

    res.json(tournament)
  } catch (error) {
    next(error)
  }
})

// Register for a tournament
router.post('/:id/register', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
    })

    if (!tournament) {
      throw new AppError('Tournament not found', 404)
    }

    if (tournament.status !== 'OPEN') {
      throw new AppError('Tournament is not open for registration', 400)
    }

    const existingRegistration = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: req.params.id,
          userId: req.user!.id,
        },
      },
    })

    if (existingRegistration) {
      throw new AppError('You are already registered for this tournament', 400)
    }

    const registration = await prisma.tournamentPlayer.create({
      data: {
        tournamentId: req.params.id,
        userId: req.user!.id,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    })

    res.status(201).json(registration)
  } catch (error) {
    next(error)
  }
})

// Unregister from a tournament
router.delete('/:id/register', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
    })

    if (!tournament) {
      throw new AppError('Tournament not found', 404)
    }

    if (tournament.status !== 'OPEN') {
      throw new AppError('Cannot unregister from a tournament that has started', 400)
    }

    await prisma.tournamentPlayer.delete({
      where: {
        tournamentId_userId: {
          tournamentId: req.params.id,
          userId: req.user!.id,
        },
      },
    })

    res.json({ message: 'Successfully unregistered from tournament' })
  } catch (error) {
    next(error)
  }
})

// Start a tournament (creator only)
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        players: {
          include: {
            user: { select: { id: true, username: true, mmr: true } },
          },
        },
      },
    })

    if (!tournament) {
      throw new AppError('Tournament not found', 404)
    }

    if (tournament.creatorId !== req.user!.id) {
      throw new AppError('Only the tournament creator can start the tournament', 403)
    }

    if (tournament.status !== 'OPEN') {
      throw new AppError('Tournament is not in OPEN status', 400)
    }

    if (tournament.players.length < 2) {
      throw new AppError('Need at least 2 players to start a tournament', 400)
    }

    // Generate matches based on tournament type
    let matches: Array<{
      player1Id: string
      player2Id: string
      tournamentStage: string
      groupName?: string
    }> = []

    if (tournament.type === 'SWISS') {
      matches = generateSwissPairings(
        tournament.players.map((p) => ({
          id: p.userId,
          mmr: p.user.mmr,
        })),
        1
      )
    } else if (tournament.type === 'GROUP_ELIMINATION') {
      const { groups, groupMatches } = generateGroupStage(
        tournament.players.map((p) => ({
          id: p.userId,
          mmr: p.user.mmr,
        }))
      )

      // Update player group assignments
      for (const [groupName, playerIds] of Object.entries(groups)) {
        for (const playerId of playerIds) {
          await prisma.tournamentPlayer.update({
            where: {
              tournamentId_userId: {
                tournamentId: tournament.id,
                userId: playerId,
              },
            },
            data: { groupName },
          })
        }
      }

      matches = groupMatches
    }

    // Create matches in database
    await prisma.match.createMany({
      data: matches.map((m) => ({
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        tournamentId: tournament.id,
        tournamentStage: m.tournamentStage,
        groupName: m.groupName,
        createdById: req.user!.id,
      })),
    })

    // Update tournament status
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        status: 'LIVE',
        currentRound: tournament.type === 'SWISS' ? 1 : null,
      },
      include: {
        creator: { select: { id: true, username: true } },
        players: {
          include: {
            user: { select: { id: true, username: true, mmr: true } },
          },
        },
        matches: {
          include: {
            player1: { select: { id: true, username: true } },
            player2: { select: { id: true, username: true } },
          },
        },
      },
    })

    res.json(updatedTournament)
  } catch (error) {
    next(error)
  }
})

// Get tournament matches
router.get('/:id/matches', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const matches = await prisma.match.findMany({
      where: { tournamentId: req.params.id },
      include: {
        player1: { select: { id: true, username: true, mmr: true } },
        player2: { select: { id: true, username: true, mmr: true } },
      },
      orderBy: [{ tournamentStage: 'asc' }, { groupName: 'asc' }, { createdAt: 'asc' }],
    })

    res.json(matches)
  } catch (error) {
    next(error)
  }
})

// Advance Swiss tournament to next round
router.post('/:id/advance', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        players: {
          include: {
            user: { select: { id: true, username: true, mmr: true } },
          },
        },
        matches: {
          where: { status: 'CONFIRMED' },
        },
      },
    })

    if (!tournament) {
      throw new AppError('Tournament not found', 404)
    }

    if (tournament.creatorId !== req.user!.id) {
      throw new AppError('Only the tournament creator can advance the round', 403)
    }

    if (tournament.type === 'SWISS') {
      // ===== SWISS TOURNAMENT ADVANCEMENT =====
      // Check all current round matches are confirmed
      const currentRoundMatches = await prisma.match.findMany({
        where: {
          tournamentId: tournament.id,
          tournamentStage: `SWISS_ROUND_${tournament.currentRound}`,
        },
      })

      const pendingMatches = currentRoundMatches.filter((m) => m.status !== 'CONFIRMED')
      if (pendingMatches.length > 0) {
        throw new AppError('All current round matches must be confirmed before advancing', 400)
      }

      // Calculate standings and generate next round pairings
      const standings = calculateSwissStandings(tournament.matches, tournament.players)
      const nextRound = (tournament.currentRound || 1) + 1
      const maxRounds = calculateSwissRounds(tournament.players.length)

      // Check if tournament is complete (all rounds played)
      if (nextRound > maxRounds) {
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: 'FINISHED' },
        })
        return res.json({ message: 'Tournament finished', standings })
      }

      const newMatches = generateSwissPairings(standings, nextRound)

      if (newMatches.length === 0) {
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: 'FINISHED' },
        })
        return res.json({ message: 'Tournament finished', standings })
      }

      // Create new round matches
      await prisma.match.createMany({
        data: newMatches.map((m) => ({
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          tournamentId: tournament.id,
          tournamentStage: m.tournamentStage,
          createdById: req.user!.id,
        })),
      })

      // Update tournament round
      const updatedTournament = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { currentRound: nextRound },
        include: {
          matches: {
            include: {
              player1: { select: { id: true, username: true } },
              player2: { select: { id: true, username: true } },
            },
          },
        },
      })

      return res.json(updatedTournament)
    } else if (tournament.type === 'GROUP_ELIMINATION') {
      // ===== GROUP+ELIMINATION TOURNAMENT ADVANCEMENT =====
      const allMatches = await prisma.match.findMany({
        where: { tournamentId: tournament.id },
      })

      const groupMatches = allMatches.filter((m) => m.tournamentStage === 'GROUP')
      const eliminationMatches = allMatches.filter((m) =>
        m.tournamentStage === 'SEMIFINAL' || m.tournamentStage === 'FINAL'
      )

      // Check if we need to advance from group stage to elimination
      if (eliminationMatches.length === 0) {
        // Still in group stage - check all group matches are confirmed
        const pendingGroupMatches = groupMatches.filter((m) => m.status !== 'CONFIRMED')
        if (pendingGroupMatches.length > 0) {
          throw new AppError('All group stage matches must be confirmed before advancing to elimination', 400)
        }

        // Calculate standings for each group and determine qualifiers
        const groups = new Map<string, string[]>()
        for (const player of tournament.players) {
          if (player.groupName) {
            if (!groups.has(player.groupName)) {
              groups.set(player.groupName, [])
            }
            groups.get(player.groupName)!.push(player.userId)
          }
        }

        const qualifiers: Array<{ playerId: string; groupName: string; seed: number }> = []

        for (const [groupName, playerIds] of groups) {
          const groupMatchesForStandings = groupMatches
            .filter((m) => m.groupName === groupName)
            .map((m) => ({
              player1Id: m.player1Id,
              player2Id: m.player2Id,
              player1Score: m.player1Score,
              player2Score: m.player2Score,
              status: m.status,
            }))

          const standings = calculateGroupStandings(playerIds, groupMatchesForStandings)

          // Top 2 from each group advance
          standings.slice(0, 2).forEach((standing, index) => {
            qualifiers.push({
              playerId: standing.playerId,
              groupName,
              seed: index + 1, // 1 for winner, 2 for runner-up
            })
          })
        }

        // Generate elimination bracket
        const eliminationBracketMatches = generateEliminationBracket(qualifiers)

        if (eliminationBracketMatches.length === 0) {
          throw new AppError('Could not generate elimination bracket', 500)
        }

        // Create elimination matches
        await prisma.match.createMany({
          data: eliminationBracketMatches.map((m) => ({
            player1Id: m.player1Id,
            player2Id: m.player2Id,
            tournamentId: tournament.id,
            tournamentStage: m.tournamentStage,
            createdById: req.user!.id,
          })),
        })

        const updatedTournament = await prisma.tournament.update({
          where: { id: tournament.id },
          include: {
            matches: {
              include: {
                player1: { select: { id: true, username: true } },
                player2: { select: { id: true, username: true } },
              },
            },
            players: {
              include: {
                user: { select: { id: true, username: true } },
              },
            },
          },
        })

        return res.json({
          message: 'Advanced to elimination stage',
          qualifiers,
          tournament: updatedTournament
        })
      } else {
        // Already in elimination stage - check if we can advance or finish
        const pendingElimination = eliminationMatches.filter((m) => m.status !== 'CONFIRMED')

        if (pendingElimination.length > 0) {
          throw new AppError('All current elimination matches must be confirmed before advancing', 400)
        }

        const semifinals = eliminationMatches.filter((m) => m.tournamentStage === 'SEMIFINAL')
        const finals = eliminationMatches.filter((m) => m.tournamentStage === 'FINAL')

        // If semifinals are done but no final exists, create final
        if (semifinals.length > 0 && finals.length === 0) {
          const semifinalWinners = semifinals.map((m) => {
            if (m.player1Score !== null && m.player2Score !== null) {
              return m.player1Score > m.player2Score ? m.player1Id : m.player2Id
            }
            return null
          }).filter((id): id is string => id !== null)

          if (semifinalWinners.length === 2) {
            await prisma.match.create({
              data: {
                player1Id: semifinalWinners[0],
                player2Id: semifinalWinners[1],
                tournamentId: tournament.id,
                tournamentStage: 'FINAL',
                createdById: req.user!.id,
              },
            })

            const updatedTournament = await prisma.tournament.update({
              where: { id: tournament.id },
              include: {
                matches: {
                  include: {
                    player1: { select: { id: true, username: true } },
                    player2: { select: { id: true, username: true } },
                  },
                },
              },
            })

            return res.json({ message: 'Final match created', tournament: updatedTournament })
          }
        }

        // If final is done, tournament is finished
        if (finals.length > 0 && finals[0].status === 'CONFIRMED') {
          const finalMatch = finals[0]
          const winner = finalMatch.player1Score! > finalMatch.player2Score!
            ? finalMatch.player1Id
            : finalMatch.player2Id

          await prisma.tournament.update({
            where: { id: tournament.id },
            data: { status: 'FINISHED' },
          })

          return res.json({ message: 'Tournament finished', winner })
        }

        throw new AppError('No advancement needed at this time', 400)
      }
    } else {
      throw new AppError('Unknown tournament type', 400)
    }
  } catch (error) {
    next(error)
  }
})

// Helper function
function calculateSwissStandings(
  matches: Array<{ player1Id: string; player2Id: string; player1Score: number | null; player2Score: number | null }>,
  players: Array<{ userId: string; user: { id: string; mmr: number } }>
): Array<{ id: string; mmr: number; wins: number }> {
  const standings = new Map<string, { wins: number; mmr: number }>()

  for (const player of players) {
    standings.set(player.userId, { wins: 0, mmr: player.user.mmr })
  }

  for (const match of matches) {
    if (match.player1Score !== null && match.player2Score !== null) {
      const winner = match.player1Score > match.player2Score ? match.player1Id : match.player2Id
      const current = standings.get(winner)
      if (current) {
        standings.set(winner, { ...current, wins: current.wins + 1 })
      }
    }
  }

  return Array.from(standings.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.wins - a.mmr || b.mmr - a.mmr)
}

export default router
