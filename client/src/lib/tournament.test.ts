import { describe, it, expect } from 'vitest'
import { calculateStandings, buildEliminationBracket, getMatchWinner } from './tournament'
import type { Match, TournamentPlayer } from '@/types'

// Helper to create a mock TournamentPlayer
function createPlayer(id: string, username: string, groupName?: string): TournamentPlayer {
  return {
    id: `tp-${id}`,
    tournamentId: 'tournament-1',
    userId: id,
    groupName: groupName || null,
    eliminated: false,
    seed: null,
    user: { id, username, mmr: 1000 },
  }
}

// Helper to create a mock Match
function createMatch(
  id: string,
  player1Id: string,
  player2Id: string,
  player1Score: number | null,
  player2Score: number | null,
  status: 'PENDING' | 'AWAITING_CONFIRM' | 'CONFIRMED' = 'CONFIRMED',
  tournamentStage: string = 'SWISS_ROUND_1',
  groupName?: string
): Match {
  return {
    id,
    player1Id,
    player2Id,
    player1Score,
    player2Score,
    status,
    createdById: player1Id,
    confirmedById: status === 'CONFIRMED' ? player2Id : null,
    tournamentId: 'tournament-1',
    tournamentStage,
    groupName: groupName || null,
    createdAt: new Date().toISOString(),
    player1: { id: player1Id, username: `Player ${player1Id}`, mmr: 1000 },
    player2: { id: player2Id, username: `Player ${player2Id}`, mmr: 1000 },
  }
}

describe('Tournament Utilities', () => {
  describe('calculateStandings', () => {
    it('returns correct wins and losses for each player', () => {
      const players = [createPlayer('1', 'Alice'), createPlayer('2', 'Bob'), createPlayer('3', 'Charlie')]

      const matches = [
        createMatch('m1', '1', '2', 11, 5), // Alice beats Bob
        createMatch('m2', '1', '3', 11, 8), // Alice beats Charlie
        createMatch('m3', '2', '3', 11, 9), // Bob beats Charlie
      ]

      const standings = calculateStandings(players, matches)

      expect(standings).toHaveLength(3)

      const alice = standings.find((s) => s.playerId === '1')
      const bob = standings.find((s) => s.playerId === '2')
      const charlie = standings.find((s) => s.playerId === '3')

      expect(alice?.wins).toBe(2)
      expect(alice?.losses).toBe(0)
      expect(alice?.matchesPlayed).toBe(2)

      expect(bob?.wins).toBe(1)
      expect(bob?.losses).toBe(1)
      expect(bob?.matchesPlayed).toBe(2)

      expect(charlie?.wins).toBe(0)
      expect(charlie?.losses).toBe(2)
      expect(charlie?.matchesPlayed).toBe(2)
    })

    it('handles draws correctly (equal scores)', () => {
      const players = [createPlayer('1', 'Alice'), createPlayer('2', 'Bob')]

      const matches = [createMatch('m1', '1', '2', 10, 10)] // Draw

      const standings = calculateStandings(players, matches)

      const alice = standings.find((s) => s.playerId === '1')
      const bob = standings.find((s) => s.playerId === '2')

      expect(alice?.wins).toBe(0)
      expect(alice?.draws).toBe(1)
      expect(alice?.losses).toBe(0)

      expect(bob?.wins).toBe(0)
      expect(bob?.draws).toBe(1)
      expect(bob?.losses).toBe(0)
    })

    it('sorts by wins first, then by point differential', () => {
      const players = [
        createPlayer('1', 'Alice'),
        createPlayer('2', 'Bob'),
        createPlayer('3', 'Charlie'),
        createPlayer('4', 'Diana'),
      ]

      const matches = [
        createMatch('m1', '1', '2', 11, 5), // Alice beats Bob by 6
        createMatch('m2', '3', '4', 11, 9), // Charlie beats Diana by 2
        createMatch('m3', '1', '3', 5, 11), // Charlie beats Alice
        createMatch('m4', '2', '4', 11, 5), // Bob beats Diana
      ]

      const standings = calculateStandings(players, matches)

      // Alice: 1W, 1L, diff = (11+5) - (5+11) = 0
      // Bob: 1W, 1L, diff = (5+11) - (11+5) = 0
      // Charlie: 2W, 0L, diff = (11+11) - (9+5) = 8
      // Diana: 0W, 2L, diff = (9+5) - (11+11) = -8

      expect(standings[0].playerId).toBe('3') // Charlie: 2 wins
      expect(standings[0].rank).toBe(1)

      // Alice and Bob both have 1 win, same diff - check they're ranked 2 and 3
      const middleIds = [standings[1].playerId, standings[2].playerId]
      expect(middleIds).toContain('1')
      expect(middleIds).toContain('2')

      expect(standings[3].playerId).toBe('4') // Diana: 0 wins
      expect(standings[3].rank).toBe(4)
    })

    it('ignores non-CONFIRMED matches', () => {
      const players = [createPlayer('1', 'Alice'), createPlayer('2', 'Bob')]

      const matches = [
        createMatch('m1', '1', '2', 11, 5, 'PENDING'),
        createMatch('m2', '1', '2', 11, 5, 'AWAITING_CONFIRM'),
      ]

      const standings = calculateStandings(players, matches)

      expect(standings[0].wins).toBe(0)
      expect(standings[0].matchesPlayed).toBe(0)
      expect(standings[1].wins).toBe(0)
      expect(standings[1].matchesPlayed).toBe(0)
    })

    it('filters by group correctly', () => {
      const players = [
        createPlayer('1', 'Alice', 'A'),
        createPlayer('2', 'Bob', 'A'),
        createPlayer('3', 'Charlie', 'B'),
        createPlayer('4', 'Diana', 'B'),
      ]

      const matches = [
        createMatch('m1', '1', '2', 11, 5, 'CONFIRMED', 'GROUP', 'A'),
        createMatch('m2', '3', '4', 11, 9, 'CONFIRMED', 'GROUP', 'B'),
      ]

      const groupAStandings = calculateStandings(players, matches, 'A')
      const groupBStandings = calculateStandings(players, matches, 'B')

      expect(groupAStandings).toHaveLength(2)
      expect(groupAStandings.map((s) => s.playerId)).toEqual(['1', '2'])

      expect(groupBStandings).toHaveLength(2)
      expect(groupBStandings.map((s) => s.playerId)).toEqual(['3', '4'])
    })

    it('returns empty standings when no players', () => {
      const standings = calculateStandings([], [])
      expect(standings).toHaveLength(0)
    })

    it('returns standings with zero values when no matches', () => {
      const players = [createPlayer('1', 'Alice'), createPlayer('2', 'Bob')]

      const standings = calculateStandings(players, [])

      expect(standings).toHaveLength(2)
      expect(standings[0].wins).toBe(0)
      expect(standings[0].losses).toBe(0)
      expect(standings[0].matchesPlayed).toBe(0)
    })

    it('calculates points for and against correctly', () => {
      const players = [createPlayer('1', 'Alice'), createPlayer('2', 'Bob')]

      const matches = [
        createMatch('m1', '1', '2', 11, 5), // Alice 11, Bob 5
        createMatch('m2', '2', '1', 11, 8), // Bob 11, Alice 8
      ]

      const standings = calculateStandings(players, matches)

      const alice = standings.find((s) => s.playerId === '1')
      const bob = standings.find((s) => s.playerId === '2')

      expect(alice?.pointsFor).toBe(11 + 8) // 19
      expect(alice?.pointsAgainst).toBe(5 + 11) // 16

      expect(bob?.pointsFor).toBe(5 + 11) // 16
      expect(bob?.pointsAgainst).toBe(11 + 8) // 19
    })
  })

  describe('buildEliminationBracket', () => {
    it('categorizes matches by stage correctly', () => {
      const matches = [
        createMatch('qf1', '1', '2', 11, 5, 'CONFIRMED', 'QUARTERFINAL'),
        createMatch('qf2', '3', '4', 11, 8, 'CONFIRMED', 'QUARTERFINAL'),
        createMatch('sf1', '1', '3', 11, 9, 'CONFIRMED', 'SEMIFINAL'),
        createMatch('sf2', '5', '6', 11, 7, 'CONFIRMED', 'SEMIFINAL'),
        createMatch('f1', '1', '5', 11, 6, 'CONFIRMED', 'FINAL'),
      ]

      const bracket = buildEliminationBracket(matches)

      expect(bracket.quarterfinals).toHaveLength(2)
      expect(bracket.semifinals).toHaveLength(2)
      expect(bracket.final).not.toBeNull()
      expect(bracket.final?.id).toBe('f1')
    })

    it('returns null final when not played', () => {
      const matches = [
        createMatch('sf1', '1', '3', 11, 9, 'CONFIRMED', 'SEMIFINAL'),
        createMatch('sf2', '5', '6', 11, 7, 'CONFIRMED', 'SEMIFINAL'),
      ]

      const bracket = buildEliminationBracket(matches)

      expect(bracket.semifinals).toHaveLength(2)
      expect(bracket.final).toBeNull()
    })

    it('returns empty arrays when no elimination matches', () => {
      const matches = [
        createMatch('g1', '1', '2', 11, 5, 'CONFIRMED', 'GROUP', 'A'),
        createMatch('g2', '3', '4', 11, 8, 'CONFIRMED', 'GROUP', 'B'),
      ]

      const bracket = buildEliminationBracket(matches)

      expect(bracket.quarterfinals).toHaveLength(0)
      expect(bracket.semifinals).toHaveLength(0)
      expect(bracket.final).toBeNull()
    })
  })

  describe('getMatchWinner', () => {
    it('returns player1 when they have higher score', () => {
      const match = createMatch('m1', '1', '2', 11, 5)
      const winner = getMatchWinner(match)

      expect(winner).not.toBeNull()
      expect(winner?.id).toBe('1')
    })

    it('returns player2 when they have higher score', () => {
      const match = createMatch('m1', '1', '2', 5, 11)
      const winner = getMatchWinner(match)

      expect(winner).not.toBeNull()
      expect(winner?.id).toBe('2')
    })

    it('returns null for draw', () => {
      const match = createMatch('m1', '1', '2', 10, 10)
      const winner = getMatchWinner(match)

      expect(winner).toBeNull()
    })

    it('returns null for non-confirmed match', () => {
      const match = createMatch('m1', '1', '2', 11, 5, 'PENDING')
      const winner = getMatchWinner(match)

      expect(winner).toBeNull()
    })

    it('returns null when scores are null', () => {
      const match = createMatch('m1', '1', '2', null, null, 'CONFIRMED')
      const winner = getMatchWinner(match)

      expect(winner).toBeNull()
    })
  })
})
