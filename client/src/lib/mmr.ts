/**
 * MMR (Match Making Rating) utility functions
 * These mirror the server-side logic for consistent tier display
 */

export type RatingTier =
  | 'Iron'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster'

/**
 * Get the rating tier based on MMR value
 * Tiers are based on the Elo rating system ranges
 */
export function getRatingTier(mmr: number): RatingTier {
  if (mmr < 800) return 'Iron'
  if (mmr < 1000) return 'Bronze'
  if (mmr < 1200) return 'Silver'
  if (mmr < 1400) return 'Gold'
  if (mmr < 1600) return 'Platinum'
  if (mmr < 1800) return 'Diamond'
  if (mmr < 2000) return 'Master'
  return 'Grandmaster'
}

/**
 * Get the Tailwind CSS color class for a rating tier
 */
export function getTierColor(tier: RatingTier): string {
  const colors: Record<RatingTier, string> = {
    Iron: 'text-gray-500',
    Bronze: 'text-amber-700',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
    Platinum: 'text-cyan-400',
    Diamond: 'text-blue-400',
    Master: 'text-purple-500',
    Grandmaster: 'text-red-500',
  }
  return colors[tier]
}

/**
 * Get the Tailwind CSS background color class for a rating tier (lighter version)
 */
export function getTierBgColor(tier: RatingTier): string {
  const colors: Record<RatingTier, string> = {
    Iron: 'bg-gray-100',
    Bronze: 'bg-amber-50',
    Silver: 'bg-gray-100',
    Gold: 'bg-yellow-50',
    Platinum: 'bg-cyan-50',
    Diamond: 'bg-blue-50',
    Master: 'bg-purple-50',
    Grandmaster: 'bg-red-50',
  }
  return colors[tier]
}
