import type { Match, TournamentPlayer } from '@/types'

export interface PlayerStanding {
  rank: number
  playerId: string
  username: string
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

export interface EliminationBracket {
  quarterfinals: Match[]
  semifinals: Match[]
  final: Match | null
}

/**
 * Calculate standings for tournament players based on confirmed matches
 * @param players - Tournament players
 * @param matches - All tournament matches
 * @param groupName - Optional group name to filter by (for GROUP_ELIMINATION)
 * @returns Sorted array of player standings
 */
export function calculateStandings(
  players: TournamentPlayer[],
  matches: Match[],
  groupName?: string
): PlayerStanding[] {
  // Filter players by group if specified
  const filteredPlayers = groupName
    ? players.filter((p) => p.groupName === groupName)
    : players

  // Filter matches to only confirmed ones
  // For group standings, also filter by group stage
  const confirmedMatches = matches.filter((m) => {
    if (m.status !== 'CONFIRMED') return false
    if (groupName && m.tournamentStage !== 'GROUP') return false
    if (groupName && m.groupName !== groupName) return false
    return true
  })

  // Initialize standings map
  const standingsMap = new Map<
    string,
    {
      username: string
      matchesPlayed: number
      wins: number
      draws: number
      losses: number
      pointsFor: number
      pointsAgainst: number
    }
  >()

  for (const player of filteredPlayers) {
    standingsMap.set(player.userId, {
      username: player.user.username,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    })
  }

  // Process each confirmed match
  for (const match of confirmedMatches) {
    const p1Stats = standingsMap.get(match.player1Id)
    const p2Stats = standingsMap.get(match.player2Id)

    if (!p1Stats || !p2Stats) continue
    if (match.player1Score === null || match.player2Score === null) continue

    // Update matches played
    p1Stats.matchesPlayed++
    p2Stats.matchesPlayed++

    // Update points
    p1Stats.pointsFor += match.player1Score
    p1Stats.pointsAgainst += match.player2Score
    p2Stats.pointsFor += match.player2Score
    p2Stats.pointsAgainst += match.player1Score

    // Determine winner/loser/draw
    if (match.player1Score > match.player2Score) {
      p1Stats.wins++
      p2Stats.losses++
    } else if (match.player2Score > match.player1Score) {
      p2Stats.wins++
      p1Stats.losses++
    } else {
      // Draw (equal scores)
      p1Stats.draws++
      p2Stats.draws++
    }
  }

  // Convert to array and sort
  const standings: PlayerStanding[] = Array.from(standingsMap.entries()).map(
    ([playerId, stats]) => ({
      rank: 0, // Will be set after sorting
      playerId,
      ...stats,
    })
  )

  // Sort by wins (desc), then by point differential (desc), then by points for (desc)
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    const aDiff = a.pointsFor - a.pointsAgainst
    const bDiff = b.pointsFor - b.pointsAgainst
    if (bDiff !== aDiff) return bDiff - aDiff
    return b.pointsFor - a.pointsFor
  })

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.rank = index + 1
  })

  return standings
}

/**
 * Build elimination bracket from matches
 * @param matches - All tournament matches
 * @returns Organized bracket with quarterfinals, semifinals, and final
 */
export function buildEliminationBracket(matches: Match[]): EliminationBracket {
  const quarterfinals = matches.filter((m) => m.tournamentStage === 'QUARTERFINAL')
  const semifinals = matches.filter((m) => m.tournamentStage === 'SEMIFINAL')
  const finalMatches = matches.filter((m) => m.tournamentStage === 'FINAL')

  return {
    quarterfinals,
    semifinals,
    final: finalMatches.length > 0 ? finalMatches[0] : null,
  }
}

/**
 * Get the winner of a match
 * @param match - The match to check
 * @returns The winner's player object or null if not determined
 */
export function getMatchWinner(match: Match): { id: string; username: string } | null {
  if (match.status !== 'CONFIRMED') return null
  if (match.player1Score === null || match.player2Score === null) return null

  if (match.player1Score > match.player2Score) {
    return { id: match.player1Id, username: match.player1.username }
  } else if (match.player2Score > match.player1Score) {
    return { id: match.player2Id, username: match.player2.username }
  }

  return null // Draw - no winner
}
