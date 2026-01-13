/**
 * Tournament generation and management services
 */

interface Player {
  id: string
  mmr: number
  wins?: number
}

interface MatchPairing {
  player1Id: string
  player2Id: string
  tournamentStage: string
  groupName?: string
}

/**
 * Generate Swiss-system pairings for a round
 * Players are sorted by score (wins) and MMR, then paired top-down
 * Avoids rematches from previous rounds
 */
export function generateSwissPairings(
  players: Player[],
  round: number,
  previousMatches: Array<{ player1Id: string; player2Id: string }> = []
): MatchPairing[] {
  const pairings: MatchPairing[] = []

  // Sort by wins (descending), then by MMR (descending)
  const sorted = [...players].sort((a, b) => {
    if ((b.wins || 0) !== (a.wins || 0)) {
      return (b.wins || 0) - (a.wins || 0)
    }
    return b.mmr - a.mmr
  })

  const paired = new Set<string>()
  const previousPairs = new Set(
    previousMatches.map((m) => [m.player1Id, m.player2Id].sort().join('-'))
  )

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].id)) continue

    // Find best opponent (closest in standing, hasn't been paired)
    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].id)) continue

      const pairKey = [sorted[i].id, sorted[j].id].sort().join('-')
      if (previousPairs.has(pairKey)) continue

      pairings.push({
        player1Id: sorted[i].id,
        player2Id: sorted[j].id,
        tournamentStage: `SWISS_ROUND_${round}`,
      })

      paired.add(sorted[i].id)
      paired.add(sorted[j].id)
      break
    }
  }

  // Handle odd number of players (bye)
  // The unpaired player gets a bye (automatic win)
  // For simplicity, we don't create a bye match here

  return pairings
}

/**
 * Generate group stage for group + elimination tournament
 * Players are seeded by MMR and distributed across groups using snake draft
 */
export function generateGroupStage(players: Player[]): {
  groups: Record<string, string[]>
  groupMatches: MatchPairing[]
} {
  // Determine number of groups (aim for 3-4 players per group)
  const numGroups = Math.max(2, Math.ceil(players.length / 4))
  const groupNames = 'ABCDEFGH'.slice(0, numGroups).split('')

  // Sort by MMR (descending) for seeding
  const sorted = [...players].sort((a, b) => b.mmr - a.mmr)

  // Snake draft to distribute players evenly
  const groups: Record<string, string[]> = {}
  for (const name of groupNames) {
    groups[name] = []
  }

  let direction = 1
  let groupIndex = 0

  for (const player of sorted) {
    groups[groupNames[groupIndex]].push(player.id)

    groupIndex += direction
    if (groupIndex >= numGroups || groupIndex < 0) {
      direction *= -1
      groupIndex += direction
    }
  }

  // Generate round-robin matches for each group
  const groupMatches: MatchPairing[] = []

  for (const [groupName, playerIds] of Object.entries(groups)) {
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        groupMatches.push({
          player1Id: playerIds[i],
          player2Id: playerIds[j],
          tournamentStage: 'GROUP',
          groupName,
        })
      }
    }
  }

  return { groups, groupMatches }
}

/**
 * Calculate group standings
 */
export function calculateGroupStandings(
  groupPlayers: string[],
  matches: Array<{
    player1Id: string
    player2Id: string
    player1Score: number | null
    player2Score: number | null
    status: string
  }>
): Array<{ playerId: string; wins: number; losses: number; pointsFor: number; pointsAgainst: number }> {
  const standings = new Map<
    string,
    { wins: number; losses: number; pointsFor: number; pointsAgainst: number }
  >()

  for (const playerId of groupPlayers) {
    standings.set(playerId, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 })
  }

  for (const match of matches) {
    if (match.status !== 'CONFIRMED') continue
    if (match.player1Score === null || match.player2Score === null) continue

    const p1Stats = standings.get(match.player1Id)
    const p2Stats = standings.get(match.player2Id)

    if (!p1Stats || !p2Stats) continue

    if (match.player1Score > match.player2Score) {
      p1Stats.wins++
      p2Stats.losses++
    } else {
      p2Stats.wins++
      p1Stats.losses++
    }

    p1Stats.pointsFor += match.player1Score
    p1Stats.pointsAgainst += match.player2Score
    p2Stats.pointsFor += match.player2Score
    p2Stats.pointsAgainst += match.player1Score
  }

  return Array.from(standings.entries())
    .map(([playerId, stats]) => ({ playerId, ...stats }))
    .sort((a, b) => {
      // Sort by wins, then point differential
      if (b.wins !== a.wins) return b.wins - a.wins
      const aDiff = a.pointsFor - a.pointsAgainst
      const bDiff = b.pointsFor - b.pointsAgainst
      return bDiff - aDiff
    })
}

/**
 * Generate single-elimination bracket from group stage qualifiers
 * Takes top N players from each group
 */
export function generateEliminationBracket(
  qualifiers: Array<{ playerId: string; groupName: string; seed: number }>
): MatchPairing[] {
  const matches: MatchPairing[] = []

  // Sort qualifiers for bracket seeding
  // Group winners vs runners-up from other groups
  const sorted = [...qualifiers].sort((a, b) => {
    if (a.seed !== b.seed) return a.seed - b.seed
    return a.groupName.localeCompare(b.groupName)
  })

  // Determine tournament stage based on number of qualifiers
  // 2 qualifiers -> FINAL, 4 qualifiers -> SEMIFINAL, 8 -> QUARTERFINAL
  const numQualifiers = sorted.length
  let tournamentStage: string
  if (numQualifiers <= 2) {
    tournamentStage = 'FINAL'
  } else if (numQualifiers <= 4) {
    tournamentStage = 'SEMIFINAL'
  } else {
    tournamentStage = 'QUARTERFINAL'
  }

  // Pair 1st seed vs last seed, 2nd vs second-to-last, etc.
  // This creates proper cross-group matchups (Group A winner vs Group B runner-up)
  const numMatches = Math.floor(sorted.length / 2)

  for (let i = 0; i < numMatches; i++) {
    const topSeed = sorted[i]
    const bottomSeed = sorted[sorted.length - 1 - i]

    if (topSeed && bottomSeed && topSeed.playerId !== bottomSeed.playerId) {
      matches.push({
        player1Id: topSeed.playerId,
        player2Id: bottomSeed.playerId,
        tournamentStage,
      })
    }
  }

  return matches
}

/**
 * Calculate number of Swiss rounds needed
 * Standard formula: ceil(log2(n)) rounds for n players
 */
export function calculateSwissRounds(playerCount: number): number {
  return Math.ceil(Math.log2(playerCount))
}
