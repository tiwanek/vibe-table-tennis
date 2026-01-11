import { describe, it, expect } from 'vitest'
import {
  generateSwissPairings,
  generateGroupStage,
  calculateGroupStandings,
  calculateSwissRounds,
} from './tournament.js'

describe('Tournament Service', () => {
  describe('generateSwissPairings', () => {
    it('should pair players in first round by MMR', () => {
      const players = [
        { id: '1', mmr: 1200 },
        { id: '2', mmr: 1100 },
        { id: '3', mmr: 1000 },
        { id: '4', mmr: 900 },
      ]

      const pairings = generateSwissPairings(players, 1)

      expect(pairings).toHaveLength(2)
      // Highest MMR paired with second highest
      expect(pairings[0].player1Id).toBe('1')
      expect(pairings[0].player2Id).toBe('2')
      expect(pairings[0].tournamentStage).toBe('SWISS_ROUND_1')
    })

    it('should avoid rematches from previous rounds', () => {
      const players = [
        { id: '1', mmr: 1200, wins: 1 },
        { id: '2', mmr: 1100, wins: 1 },
        { id: '3', mmr: 1000, wins: 0 },
        { id: '4', mmr: 900, wins: 0 },
      ]

      const previousMatches = [
        { player1Id: '1', player2Id: '2' },
        { player1Id: '3', player2Id: '4' },
      ]

      const pairings = generateSwissPairings(players, 2, previousMatches)

      // Should not repeat 1 vs 2 or 3 vs 4
      for (const pairing of pairings) {
        const pairKey = [pairing.player1Id, pairing.player2Id].sort().join('-')
        expect(pairKey).not.toBe('1-2')
        expect(pairKey).not.toBe('3-4')
      }
    })

    it('should handle odd number of players', () => {
      const players = [
        { id: '1', mmr: 1200 },
        { id: '2', mmr: 1100 },
        { id: '3', mmr: 1000 },
      ]

      const pairings = generateSwissPairings(players, 1)

      // One player gets a bye (no match)
      expect(pairings).toHaveLength(1)
    })

    it('should pair by wins first, then MMR', () => {
      const players = [
        { id: '1', mmr: 1200, wins: 0 },
        { id: '2', mmr: 1100, wins: 1 },
        { id: '3', mmr: 1000, wins: 1 },
        { id: '4', mmr: 900, wins: 0 },
      ]

      const pairings = generateSwissPairings(players, 2)

      // Players with 1 win should be paired together
      const firstPairing = pairings[0]
      expect(['2', '3']).toContain(firstPairing.player1Id)
      expect(['2', '3']).toContain(firstPairing.player2Id)
    })
  })

  describe('generateGroupStage', () => {
    it('should create groups with snake draft seeding', () => {
      const players = [
        { id: '1', mmr: 1400 },
        { id: '2', mmr: 1300 },
        { id: '3', mmr: 1200 },
        { id: '4', mmr: 1100 },
        { id: '5', mmr: 1000 },
        { id: '6', mmr: 900 },
        { id: '7', mmr: 800 },
        { id: '8', mmr: 700 },
      ]

      const { groups, groupMatches } = generateGroupStage(players)

      // Should have 2 groups with 4 players each
      expect(Object.keys(groups)).toHaveLength(2)
      expect(groups['A']).toHaveLength(4)
      expect(groups['B']).toHaveLength(4)

      // Snake draft: A gets 1,4,5,8 and B gets 2,3,6,7
      // Or similar distribution ensuring balanced groups
      const groupAMmrSum = groups['A'].reduce((sum, id) => {
        const player = players.find((p) => p.id === id)
        return sum + (player?.mmr || 0)
      }, 0)
      const groupBMmrSum = groups['B'].reduce((sum, id) => {
        const player = players.find((p) => p.id === id)
        return sum + (player?.mmr || 0)
      }, 0)

      // Groups should be relatively balanced
      expect(Math.abs(groupAMmrSum - groupBMmrSum)).toBeLessThan(500)
    })

    it('should generate round-robin matches for each group', () => {
      const players = [
        { id: '1', mmr: 1200 },
        { id: '2', mmr: 1100 },
        { id: '3', mmr: 1000 },
        { id: '4', mmr: 900 },
      ]

      const { groups, groupMatches } = generateGroupStage(players)

      // With 2 groups of 2 players, each group should have 1 match
      // With 1 group of 4 players, should have 6 matches (4 choose 2)
      const groupAPlayers = groups['A'].length
      const expectedGroupAMatches = (groupAPlayers * (groupAPlayers - 1)) / 2

      const groupAMatches = groupMatches.filter((m) => m.groupName === 'A')
      expect(groupAMatches.length).toBe(expectedGroupAMatches)
    })

    it('should set correct tournament stage and group name', () => {
      const players = [
        { id: '1', mmr: 1200 },
        { id: '2', mmr: 1100 },
        { id: '3', mmr: 1000 },
        { id: '4', mmr: 900 },
      ]

      const { groupMatches } = generateGroupStage(players)

      for (const match of groupMatches) {
        expect(match.tournamentStage).toBe('GROUP')
        expect(['A', 'B']).toContain(match.groupName)
      }
    })
  })

  describe('calculateGroupStandings', () => {
    it('should calculate wins and losses correctly', () => {
      const groupPlayers = ['1', '2', '3']
      const matches = [
        { player1Id: '1', player2Id: '2', player1Score: 11, player2Score: 5, status: 'CONFIRMED' },
        { player1Id: '1', player2Id: '3', player1Score: 11, player2Score: 8, status: 'CONFIRMED' },
        { player1Id: '2', player2Id: '3', player1Score: 11, player2Score: 9, status: 'CONFIRMED' },
      ]

      const standings = calculateGroupStandings(groupPlayers, matches)

      const player1 = standings.find((s) => s.playerId === '1')
      const player2 = standings.find((s) => s.playerId === '2')
      const player3 = standings.find((s) => s.playerId === '3')

      expect(player1?.wins).toBe(2)
      expect(player1?.losses).toBe(0)
      expect(player2?.wins).toBe(1)
      expect(player2?.losses).toBe(1)
      expect(player3?.wins).toBe(0)
      expect(player3?.losses).toBe(2)
    })

    it('should sort by wins first', () => {
      const groupPlayers = ['1', '2', '3']
      const matches = [
        { player1Id: '1', player2Id: '2', player1Score: 11, player2Score: 5, status: 'CONFIRMED' },
        { player1Id: '1', player2Id: '3', player1Score: 11, player2Score: 8, status: 'CONFIRMED' },
        { player1Id: '2', player2Id: '3', player1Score: 11, player2Score: 9, status: 'CONFIRMED' },
      ]

      const standings = calculateGroupStandings(groupPlayers, matches)

      expect(standings[0].playerId).toBe('1')
      expect(standings[1].playerId).toBe('2')
      expect(standings[2].playerId).toBe('3')
    })

    it('should ignore non-confirmed matches', () => {
      const groupPlayers = ['1', '2']
      const matches = [
        { player1Id: '1', player2Id: '2', player1Score: 11, player2Score: 5, status: 'PENDING' },
      ]

      const standings = calculateGroupStandings(groupPlayers, matches)

      expect(standings[0].wins).toBe(0)
      expect(standings[1].wins).toBe(0)
    })

    it('should calculate point differential for tiebreaker', () => {
      const groupPlayers = ['1', '2']
      const matches = [
        { player1Id: '1', player2Id: '2', player1Score: 11, player2Score: 5, status: 'CONFIRMED' },
      ]

      const standings = calculateGroupStandings(groupPlayers, matches)
      const player1 = standings.find((s) => s.playerId === '1')

      expect(player1?.pointsFor).toBe(11)
      expect(player1?.pointsAgainst).toBe(5)
    })
  })

  describe('calculateSwissRounds', () => {
    it('should return correct number of rounds', () => {
      expect(calculateSwissRounds(2)).toBe(1)
      expect(calculateSwissRounds(4)).toBe(2)
      expect(calculateSwissRounds(8)).toBe(3)
      expect(calculateSwissRounds(16)).toBe(4)
    })

    it('should round up for non-power-of-2 player counts', () => {
      expect(calculateSwissRounds(3)).toBe(2)
      expect(calculateSwissRounds(5)).toBe(3)
      expect(calculateSwissRounds(10)).toBe(4)
    })
  })
})
