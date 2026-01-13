import { describe, it, expect } from 'vitest'
import { getRatingTier, getTierColor, getTierBgColor } from './mmr'

describe('MMR Utilities', () => {
  describe('getRatingTier', () => {
    it('returns Iron for MMR below 800', () => {
      expect(getRatingTier(0)).toBe('Iron')
      expect(getRatingTier(500)).toBe('Iron')
      expect(getRatingTier(799)).toBe('Iron')
    })

    it('returns Bronze for MMR 800-999', () => {
      expect(getRatingTier(800)).toBe('Bronze')
      expect(getRatingTier(900)).toBe('Bronze')
      expect(getRatingTier(999)).toBe('Bronze')
    })

    it('returns Silver for MMR 1000-1199', () => {
      expect(getRatingTier(1000)).toBe('Silver')
      expect(getRatingTier(1100)).toBe('Silver')
      expect(getRatingTier(1199)).toBe('Silver')
    })

    it('returns Gold for MMR 1200-1399', () => {
      expect(getRatingTier(1200)).toBe('Gold')
      expect(getRatingTier(1300)).toBe('Gold')
      expect(getRatingTier(1399)).toBe('Gold')
    })

    it('returns Platinum for MMR 1400-1599', () => {
      expect(getRatingTier(1400)).toBe('Platinum')
      expect(getRatingTier(1500)).toBe('Platinum')
      expect(getRatingTier(1599)).toBe('Platinum')
    })

    it('returns Diamond for MMR 1600-1799', () => {
      expect(getRatingTier(1600)).toBe('Diamond')
      expect(getRatingTier(1700)).toBe('Diamond')
      expect(getRatingTier(1799)).toBe('Diamond')
    })

    it('returns Master for MMR 1800-1999', () => {
      expect(getRatingTier(1800)).toBe('Master')
      expect(getRatingTier(1900)).toBe('Master')
      expect(getRatingTier(1999)).toBe('Master')
    })

    it('returns Grandmaster for MMR 2000+', () => {
      expect(getRatingTier(2000)).toBe('Grandmaster')
      expect(getRatingTier(2500)).toBe('Grandmaster')
      expect(getRatingTier(3000)).toBe('Grandmaster')
    })
  })

  describe('getTierColor', () => {
    it('returns correct text color class for Iron', () => {
      expect(getTierColor('Iron')).toBe('text-gray-500')
    })

    it('returns correct text color class for Bronze', () => {
      expect(getTierColor('Bronze')).toBe('text-amber-700')
    })

    it('returns correct text color class for Silver', () => {
      expect(getTierColor('Silver')).toBe('text-gray-400')
    })

    it('returns correct text color class for Gold', () => {
      expect(getTierColor('Gold')).toBe('text-yellow-500')
    })

    it('returns correct text color class for Platinum', () => {
      expect(getTierColor('Platinum')).toBe('text-cyan-400')
    })

    it('returns correct text color class for Diamond', () => {
      expect(getTierColor('Diamond')).toBe('text-blue-400')
    })

    it('returns correct text color class for Master', () => {
      expect(getTierColor('Master')).toBe('text-purple-500')
    })

    it('returns correct text color class for Grandmaster', () => {
      expect(getTierColor('Grandmaster')).toBe('text-red-500')
    })
  })

  describe('getTierBgColor', () => {
    it('returns correct background color class for each tier', () => {
      expect(getTierBgColor('Iron')).toBe('bg-gray-100')
      expect(getTierBgColor('Bronze')).toBe('bg-amber-50')
      expect(getTierBgColor('Silver')).toBe('bg-gray-100')
      expect(getTierBgColor('Gold')).toBe('bg-yellow-50')
      expect(getTierBgColor('Platinum')).toBe('bg-cyan-50')
      expect(getTierBgColor('Diamond')).toBe('bg-blue-50')
      expect(getTierBgColor('Master')).toBe('bg-purple-50')
      expect(getTierBgColor('Grandmaster')).toBe('bg-red-50')
    })
  })
})
