import { test, expect } from '@playwright/test'
import {
  createTestUsers,
  loginAs,
  createMatchViaAPI,
  submitScoreViaAPI,
  confirmMatchViaAPI,
  getUserViaAPI,
  TestUser,
} from './fixtures/test-utils'

test.describe('Leaderboard', () => {
  let users: TestUser[]

  test.beforeAll(async ({ request }) => {
    // Create 3 test users for leaderboard testing
    users = await createTestUsers(request, 3)
  })

  test('displays leaderboard with all users ranked by MMR', async ({ page }) => {
    const user = users[0]

    // Login and navigate to leaderboard
    await loginAs(page, user.email, user.password)
    await page.goto('/leaderboard')

    // Verify page loads with title
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()

    // Verify "All Players" section is visible
    await expect(page.getByText('All Players')).toBeVisible()

    // Verify users are displayed in the leaderboard table
    const leaderboardTable = page.locator('main')
    for (const u of users) {
      await expect(leaderboardTable.getByText(u.username).first()).toBeVisible()
    }

    // Verify MMR values are displayed (all users start at 1000)
    await expect(leaderboardTable.getByText('1000').first()).toBeVisible()
  })

  test('highlights current user row', async ({ page }) => {
    const user = users[0]

    await loginAs(page, user.email, user.password)
    await page.goto('/leaderboard')

    // Verify current user's row is highlighted
    const currentUserRow = page.getByTestId('current-user-row')
    await expect(currentUserRow).toBeVisible()

    // Verify "(You)" marker is shown
    await expect(currentUserRow.getByText('(You)')).toBeVisible()

    // Verify the row contains the current user's username
    await expect(currentUserRow.getByText(user.username)).toBeVisible()
  })

  test('shows current user rank summary card', async ({ page }) => {
    const user = users[0]

    await loginAs(page, user.email, user.password)
    await page.goto('/leaderboard')

    // Verify "Your Ranking" card is displayed
    await expect(page.getByText('Your Ranking')).toBeVisible()
    await expect(page.getByText('Your current position on the leaderboard')).toBeVisible()

    // Verify rank number is shown (starts with #)
    await expect(page.getByText(/^#\d+$/)).toBeVisible()

    // Verify user's name appears in the rank summary section
    // The username appears in the "Your Ranking" card area
    await expect(page.locator('.font-medium').filter({ hasText: user.username }).first()).toBeVisible()
  })

  test('displays rating tiers for players', async ({ page }) => {
    const user = users[0]

    await loginAs(page, user.email, user.password)
    await page.goto('/leaderboard')

    // All test users start at 1000 MMR which is "Bronze" tier
    // Verify tier badges are displayed
    await expect(page.getByText('Bronze').first()).toBeVisible()
  })

  test('navigation link works from header', async ({ page }) => {
    const user = users[0]

    await loginAs(page, user.email, user.password)

    // Click on leaderboard link in navigation
    await page.click('a:has-text("Leaderboard")')

    // Verify we're on the leaderboard page
    await expect(page).toHaveURL('/leaderboard')
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()
  })

  test('leaderboard reflects MMR changes after match', async ({ page, request }) => {
    // Use users[1] and users[2] to play a match
    // users[1] will be the winner
    const winner = users[1]
    const loser = users[2]

    // Get initial MMR values
    const winnerInitialData = await getUserViaAPI(request, winner.token)
    const loserInitialData = await getUserViaAPI(request, loser.token)

    // Play a match: winner beats loser
    const match = await createMatchViaAPI(request, winner.token, loser.id, {
      player1Score: 11,
      player2Score: 5,
    })

    // Loser confirms the match
    await confirmMatchViaAPI(request, loser.token, match.id)

    // Get updated MMR values
    const winnerAfterData = await getUserViaAPI(request, winner.token)
    const loserAfterData = await getUserViaAPI(request, loser.token)

    // Verify MMR changed
    expect(winnerAfterData.mmr).toBeGreaterThan(winnerInitialData.mmr)
    expect(loserAfterData.mmr).toBeLessThan(loserInitialData.mmr)

    // Update local user data for subsequent tests
    users[1].mmr = winnerAfterData.mmr
    users[2].mmr = loserAfterData.mmr

    // Login as winner and check leaderboard
    await loginAs(page, winner.email, winner.password)
    await page.goto('/leaderboard')

    // Verify MMR values changed (winner has higher MMR than loser)
    expect(winnerAfterData.mmr).toBeGreaterThan(loserAfterData.mmr)

    // Verify the leaderboard shows updated MMR values
    // Look for the winner's row with their updated MMR
    const winnerRow = page.locator('[class*="grid-cols-12"]').filter({ hasText: winner.username })
    await expect(winnerRow.first()).toContainText(winnerAfterData.mmr.toString())

    // Look for the loser's row with their updated MMR
    const loserRow = page.locator('[class*="grid-cols-12"]').filter({ hasText: loser.username })
    await expect(loserRow.first()).toContainText(loserAfterData.mmr.toString())

    // Get all player rows and verify winner appears before loser
    const playerRows = page.locator('[class*="grid-cols-12"][class*="py-3"]')
    const rowTexts = await playerRows.allTextContents()

    // Find positions of winner and loser
    let winnerPosition = -1
    let loserPosition = -1

    rowTexts.forEach((text, index) => {
      if (text.includes(winner.username)) {
        winnerPosition = index
      }
      if (text.includes(loser.username)) {
        loserPosition = index
      }
    })

    // Winner should appear before loser (lower index = higher rank)
    expect(winnerPosition).toBeGreaterThan(-1)
    expect(loserPosition).toBeGreaterThan(-1)
    expect(winnerPosition).toBeLessThan(loserPosition)
  })
})
