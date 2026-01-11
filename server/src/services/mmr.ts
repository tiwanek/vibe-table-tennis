/**
 * MMR (Matchmaking Rating) calculation using Elo rating system
 *
 * The Elo rating system calculates expected win probability and adjusts
 * ratings based on match outcomes. Higher rated players are expected to win
 * more often against lower rated players.
 */

const K_FACTOR = 32 // Standard K-factor for rating changes

/**
 * Calculate expected score (probability of winning)
 * @param ratingA - Rating of player A
 * @param ratingB - Rating of player B
 * @returns Expected score for player A (0-1)
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Calculate new ratings after a match
 * @param rating1 - Current rating of player 1
 * @param rating2 - Current rating of player 2
 * @param player1Won - Whether player 1 won the match
 * @returns New ratings for both players
 */
export function calculateNewRatings(
  rating1: number,
  rating2: number,
  player1Won: boolean
): { newRating1: number; newRating2: number; change1: number; change2: number } {
  const expected1 = calculateExpectedScore(rating1, rating2)
  const expected2 = 1 - expected1

  const actual1 = player1Won ? 1 : 0
  const actual2 = player1Won ? 0 : 1

  const change1 = Math.round(K_FACTOR * (actual1 - expected1))
  const change2 = Math.round(K_FACTOR * (actual2 - expected2))

  return {
    newRating1: rating1 + change1,
    newRating2: rating2 + change2,
    change1,
    change2,
  }
}

/**
 * Get rating tier based on MMR
 * @param mmr - Player's MMR rating
 * @returns Rating tier name
 */
export function getRatingTier(mmr: number): string {
  if (mmr >= 2000) return 'Grandmaster'
  if (mmr >= 1800) return 'Master'
  if (mmr >= 1600) return 'Diamond'
  if (mmr >= 1400) return 'Platinum'
  if (mmr >= 1200) return 'Gold'
  if (mmr >= 1000) return 'Silver'
  if (mmr >= 800) return 'Bronze'
  return 'Iron'
}
