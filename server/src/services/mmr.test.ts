import { describe, it, expect } from 'vitest'
import { calculateExpectedScore, calculateNewRatings, getRatingTier } from './mmr.js'

describe('MMR Service', () => {
  describe('calculateExpectedScore', () => {
    it('should return 0.5 for equal ratings', () => {
      const expected = calculateExpectedScore(1000, 1000)
      expect(expected).toBe(0.5)
    })

    it('should return higher expected score for higher rated player', () => {
      const expected = calculateExpectedScore(1200, 1000)
      expect(expected).toBeGreaterThan(0.5)
    })

    it('should return lower expected score for lower rated player', () => {
      const expected = calculateExpectedScore(1000, 1200)
      expect(expected).toBeLessThan(0.5)
    })

    it('should return approximately 0.76 for 200 point difference', () => {
      const expected = calculateExpectedScore(1200, 1000)
      expect(expected).toBeCloseTo(0.76, 1)
    })
  })

  describe('calculateNewRatings', () => {
    it('should increase winner rating and decrease loser rating', () => {
      const { newRating1, newRating2 } = calculateNewRatings(1000, 1000, true)
      expect(newRating1).toBeGreaterThan(1000)
      expect(newRating2).toBeLessThan(1000)
    })

    it('should change ratings by equal amounts for equal initial ratings', () => {
      const { change1, change2 } = calculateNewRatings(1000, 1000, true)
      expect(change1).toBe(-change2)
    })

    it('should give larger gain to underdog winner', () => {
      const { change1: underdogWinChange } = calculateNewRatings(1000, 1200, true)
      const { change1: favoriteWinChange } = calculateNewRatings(1200, 1000, true)
      expect(underdogWinChange).toBeGreaterThan(favoriteWinChange)
    })

    it('should give smaller loss to underdog loser', () => {
      const { change1: underdogLossChange } = calculateNewRatings(1000, 1200, false)
      const { change1: favoriteLossChange } = calculateNewRatings(1200, 1000, false)
      expect(Math.abs(underdogLossChange)).toBeLessThan(Math.abs(favoriteLossChange))
    })

    it('should return integer ratings', () => {
      const { newRating1, newRating2 } = calculateNewRatings(1000, 1000, true)
      expect(Number.isInteger(newRating1)).toBe(true)
      expect(Number.isInteger(newRating2)).toBe(true)
    })
  })

  describe('getRatingTier', () => {
    it('should return Iron for very low ratings', () => {
      expect(getRatingTier(500)).toBe('Iron')
      expect(getRatingTier(799)).toBe('Iron')
    })

    it('should return Bronze for 800-999', () => {
      expect(getRatingTier(800)).toBe('Bronze')
      expect(getRatingTier(999)).toBe('Bronze')
    })

    it('should return Silver for 1000-1199', () => {
      expect(getRatingTier(1000)).toBe('Silver')
      expect(getRatingTier(1199)).toBe('Silver')
    })

    it('should return Gold for 1200-1399', () => {
      expect(getRatingTier(1200)).toBe('Gold')
      expect(getRatingTier(1399)).toBe('Gold')
    })

    it('should return Platinum for 1400-1599', () => {
      expect(getRatingTier(1400)).toBe('Platinum')
    })

    it('should return Diamond for 1600-1799', () => {
      expect(getRatingTier(1600)).toBe('Diamond')
    })

    it('should return Master for 1800-1999', () => {
      expect(getRatingTier(1800)).toBe('Master')
    })

    it('should return Grandmaster for 2000+', () => {
      expect(getRatingTier(2000)).toBe('Grandmaster')
      expect(getRatingTier(2500)).toBe('Grandmaster')
    })
  })
})
