import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../index.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { calculateNewRatings } from '../services/mmr.js'

const router = Router()

const createMatchSchema = z.object({
  player2Id: z.string().uuid(),
  player1Score: z.number().int().min(0).optional(),
  player2Score: z.number().int().min(0).optional(),
})

const updateScoreSchema = z.object({
  player1Score: z.number().int().min(0),
  player2Score: z.number().int().min(0),
})

// Get all matches for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ player1Id: req.user!.id }, { player2Id: req.user!.id }],
      },
      include: {
        player1: { select: { id: true, username: true, mmr: true } },
        player2: { select: { id: true, username: true, mmr: true } },
        tournament: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(matches)
  } catch (error) {
    next(error)
  }
})

// Create a new standalone match
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMatchSchema.parse(req.body)

    if (data.player2Id === req.user!.id) {
      throw new AppError('Cannot create a match against yourself', 400)
    }

    const opponent = await prisma.user.findUnique({
      where: { id: data.player2Id },
    })

    if (!opponent) {
      throw new AppError('Opponent not found', 404)
    }

    const hasScores = data.player1Score !== undefined && data.player2Score !== undefined

    const match = await prisma.match.create({
      data: {
        player1Id: req.user!.id,
        player2Id: data.player2Id,
        player1Score: data.player1Score,
        player2Score: data.player2Score,
        status: hasScores ? 'AWAITING_CONFIRM' : 'PENDING',
        createdById: req.user!.id,
      },
      include: {
        player1: { select: { id: true, username: true, mmr: true } },
        player2: { select: { id: true, username: true, mmr: true } },
      },
    })

    res.status(201).json(match)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// Submit score for a match
router.patch('/:id/score', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const data = updateScoreSchema.parse(req.body)

    const match = await prisma.match.findUnique({
      where: { id },
    })

    if (!match) {
      throw new AppError('Match not found', 404)
    }

    if (match.player1Id !== req.user!.id && match.player2Id !== req.user!.id) {
      throw new AppError('You are not a participant in this match', 403)
    }

    if (match.status === 'CONFIRMED') {
      throw new AppError('Match is already confirmed', 400)
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        player1Score: data.player1Score,
        player2Score: data.player2Score,
        status: 'AWAITING_CONFIRM',
        createdById: req.user!.id,
      },
      include: {
        player1: { select: { id: true, username: true, mmr: true } },
        player2: { select: { id: true, username: true, mmr: true } },
      },
    })

    res.json(updatedMatch)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// Confirm match result
router.post('/:id/confirm', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        player1: true,
        player2: true,
      },
    })

    if (!match) {
      throw new AppError('Match not found', 404)
    }

    if (match.player1Id !== req.user!.id && match.player2Id !== req.user!.id) {
      throw new AppError('You are not a participant in this match', 403)
    }

    if (match.status !== 'AWAITING_CONFIRM') {
      throw new AppError('Match is not awaiting confirmation', 400)
    }

    // The person who entered the score cannot confirm it
    if (match.createdById === req.user!.id) {
      throw new AppError('You cannot confirm your own score submission', 400)
    }

    if (match.player1Score === null || match.player2Score === null) {
      throw new AppError('Match scores are not set', 400)
    }

    // Calculate new MMR ratings
    const player1Won = match.player1Score > match.player2Score
    const { newRating1, newRating2 } = calculateNewRatings(
      match.player1.mmr,
      match.player2.mmr,
      player1Won
    )

    // Update match and player ratings in transaction
    const [updatedMatch] = await prisma.$transaction([
      prisma.match.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedById: req.user!.id,
        },
        include: {
          player1: { select: { id: true, username: true, mmr: true } },
          player2: { select: { id: true, username: true, mmr: true } },
        },
      }),
      prisma.user.update({
        where: { id: match.player1Id },
        data: { mmr: newRating1 },
      }),
      prisma.user.update({
        where: { id: match.player2Id },
        data: { mmr: newRating2 },
      }),
    ])

    res.json({
      ...updatedMatch,
      mmrChanges: {
        player1: { old: match.player1.mmr, new: newRating1 },
        player2: { old: match.player2.mmr, new: newRating2 },
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get single match
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        player1: { select: { id: true, username: true, mmr: true } },
        player2: { select: { id: true, username: true, mmr: true } },
        tournament: { select: { id: true, name: true } },
      },
    })

    if (!match) {
      throw new AppError('Match not found', 404)
    }

    res.json(match)
  } catch (error) {
    next(error)
  }
})

export default router
