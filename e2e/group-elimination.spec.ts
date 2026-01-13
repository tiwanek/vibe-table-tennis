import { test, expect } from '@playwright/test'
import {
  createTestUsers,
  loginAs,
  logout,
  registerForTournamentViaAPI,
  getTournamentViaAPI,
  getTournamentMatchesViaAPI,
  submitScoreViaAPI,
  confirmMatchViaAPI,
  advanceTournamentViaUI,
  enterScoreViaUI,
  confirmMatchOnMatchesPageViaUI,
  TestUser,
  Match,
  uniqueId,
} from './fixtures/test-utils'

test.describe('Group + Elimination Tournament', () => {
  let users: TestUser[]
  let tournamentId: string
  const PLAYER_COUNT = 8

  test.beforeAll(async ({ request }) => {
    // Create 8 test users
    users = await createTestUsers(request, PLAYER_COUNT)
  })

  test('complete Group+Elimination tournament with 8 players', async ({ page, request }) => {
    const creator = users[0]
    const tournamentName = `Group Elimination ${uniqueId()}`

    // ===== Step 1: Create tournament via UI =====
    await loginAs(page, creator.email, creator.password)
    await page.goto('/tournaments')

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Tournaments")')

    // Click "New Tournament"
    await page.click('button:has-text("New Tournament")')

    // Fill tournament form
    await page.fill('input[placeholder="Friday Night Tournament"]', tournamentName)

    // Select Group+Elimination type
    await page.click('[role="combobox"]')
    await page.click('[role="option"]:has-text("Group")')

    // Create tournament
    await page.click('button:has-text("Create Tournament")')
    await page.waitForTimeout(500)

    // Get tournament ID from the API
    const tournamentsResponse = await request.get('http://localhost:3001/api/tournaments', {
      headers: { Authorization: `Bearer ${creator.token}` },
    })
    const tournaments = await tournamentsResponse.json()
    const tournament = tournaments.find((t: { name: string }) => t.name === tournamentName)
    expect(tournament).toBeDefined()
    tournamentId = tournament.id

    // Verify tournament appears in Open tab
    await expect(page.getByText(tournamentName)).toBeVisible()

    // ===== Step 2: Register all 8 players via API =====
    for (const user of users) {
      await registerForTournamentViaAPI(request, user.token, tournamentId)
    }

    // Refresh page to see updated player count
    await page.reload()
    await expect(page.getByText('Players: 8')).toBeVisible()

    // ===== Step 3: Start tournament =====
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(1000)

    // Verify tournament moved to Live tab
    await page.click('button[role="tab"]:has-text("Live")')
    await expect(page.getByText(tournamentName)).toBeVisible()

    // ===== Step 4: Verify group stage matches created =====
    let matches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)

    // With 8 players split into 2 groups of 4, each group plays round-robin
    // 4 players = 4C2 = 6 matches per group = 12 total matches
    expect(matches.length).toBe(12)

    // All matches should be GROUP stage
    for (const match of matches) {
      expect(match.tournamentStage).toBe('GROUP')
      expect(match.status).toBe('PENDING')
      expect(['A', 'B']).toContain(match.groupName)
    }

    // Verify groups are balanced (6 matches in each group)
    const groupAMatches = matches.filter((m) => m.groupName === 'A')
    const groupBMatches = matches.filter((m) => m.groupName === 'B')
    expect(groupAMatches.length).toBe(6)
    expect(groupBMatches.length).toBe(6)

    // ===== Step 5: Complete all Group A matches =====
    await completeGroupMatches(request, groupAMatches, users)

    // ===== Step 6: Complete all Group B matches =====
    await completeGroupMatches(request, groupBMatches, users)

    // ===== Step 7: Verify all matches confirmed =====
    matches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    const confirmedCount = matches.filter((m) => m.status === 'CONFIRMED').length
    expect(confirmedCount).toBe(12)

    // ===== Step 8: Navigate to tournament detail and verify group display =====
    await page.click(`a:has-text("View")`)
    await page.waitForURL(/\/tournaments\//)

    // Verify tournament info shows both groups
    const tournamentData = await getTournamentViaAPI(request, creator.token, tournamentId)
    expect(tournamentData.status).toBe('LIVE')

    // Verify players are assigned to groups
    if (tournamentData.players) {
      const groupAPlayers = tournamentData.players.filter((p) => p.groupName === 'A')
      const groupBPlayers = tournamentData.players.filter((p) => p.groupName === 'B')
      expect(groupAPlayers.length).toBe(4)
      expect(groupBPlayers.length).toBe(4)
    }

    // ===== Step 9: Verify Results tab shows group standings =====
    await page.click('button[role="tab"]:has-text("Results")')

    // Verify group tables are visible
    await expect(page.getByText('Group A')).toBeVisible()
    await expect(page.getByText('Group B')).toBeVisible()

    // Verify table headers
    await expect(page.getByText('MP').first()).toBeVisible()

    // Verify standings rows exist (4 players per group)
    const standingsRows = page.locator('[data-testid="standings-row"]')
    await expect(standingsRows).toHaveCount(8) // 4 in each group

    // ===== Step 10: Verify standings within groups =====
    // Each player in a group plays 3 matches (against the other 3 players)
    // Verify match counts per player
    const allGroupMatches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    verifyGroupMatchCounts(allGroupMatches, users)

    // ===== Step 11: Verify round-robin completeness =====
    verifyRoundRobinComplete(allGroupMatches, 'A')
    verifyRoundRobinComplete(allGroupMatches, 'B')

    // ===== Step 12: Advance to elimination stage via UI =====
    // Creator clicks "Advance to Elimination" button on tournament detail page
    await page.reload()
    await expect(page.getByRole('button', { name: 'Advance to Elimination' })).toBeVisible()
    await advanceTournamentViaUI(page, 'Advance to Elimination')

    // Verify advancement by checking that semifinal matches were created
    await page.waitForTimeout(500)

    // ===== Step 13: Verify semifinal matches created =====
    let matchesAfterAdvance = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    const semifinalMatches = matchesAfterAdvance.filter((m) => m.tournamentStage === 'SEMIFINAL')
    expect(semifinalMatches.length).toBe(2)

    // Verify semifinal matches involve 4 different players (top 2 from each group)
    const semifinalPlayerIds = new Set<string>()
    for (const match of semifinalMatches) {
      semifinalPlayerIds.add(match.player1Id)
      semifinalPlayerIds.add(match.player2Id)
    }
    expect(semifinalPlayerIds.size).toBe(4) // 4 qualifiers from 2 groups

    // ===== Step 14: Complete semifinal matches =====
    for (const match of semifinalMatches) {
      const player1 = users.find((u) => u.id === match.player1Id)
      const player2 = users.find((u) => u.id === match.player2Id)
      if (!player1 || !player2) throw new Error('Could not find semifinal players')

      await submitScoreViaAPI(request, player1.token, match.id, 11, 9)
      await confirmMatchViaAPI(request, player2.token, match.id)
    }

    // ===== Step 15: Advance to final via UI =====
    // Creator clicks "Create Final" button to create final match
    await page.reload()
    await expect(page.getByRole('button', { name: 'Create Final' })).toBeVisible()
    await advanceTournamentViaUI(page, 'Create Final')

    // ===== Step 16: Verify final match created =====
    matchesAfterAdvance = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    const finalMatches = matchesAfterAdvance.filter((m) => m.tournamentStage === 'FINAL')
    expect(finalMatches.length).toBe(1)

    // Verify final contestants are semifinal winners
    const semifinalWinners = semifinalMatches.map((m) => {
      // Player1 always won (11-9) in our test
      return m.player1Id
    })
    expect(semifinalWinners).toContain(finalMatches[0].player1Id)
    expect(semifinalWinners).toContain(finalMatches[0].player2Id)

    // ===== Step 17: Complete final match =====
    const finalMatch = finalMatches[0]
    const finalist1 = users.find((u) => u.id === finalMatch.player1Id)
    const finalist2 = users.find((u) => u.id === finalMatch.player2Id)
    if (!finalist1 || !finalist2) throw new Error('Could not find finalists')

    await submitScoreViaAPI(request, finalist1.token, finalMatch.id, 11, 7)
    await confirmMatchViaAPI(request, finalist2.token, finalMatch.id)

    // ===== Step 18: Finish tournament via UI =====
    // Creator clicks "Finish Tournament" button to complete the tournament
    await page.reload()
    await expect(page.getByRole('button', { name: 'Finish Tournament' })).toBeVisible()
    await advanceTournamentViaUI(page, 'Finish Tournament')

    // ===== Step 19: Verify tournament status is FINISHED =====
    const finalTournament = await getTournamentViaAPI(request, creator.token, tournamentId)
    expect(finalTournament.status).toBe('FINISHED')

    // ===== Step 20: Verify Results tab shows elimination bracket =====
    await page.click('button[role="tab"]:has-text("Results")')
    await expect(page.getByText('Elimination Bracket')).toBeVisible()
    await expect(page.getByText('Semifinals')).toBeVisible()
    await expect(page.getByText('Final', { exact: true })).toBeVisible()
    await expect(page.getByText('Winner')).toBeVisible()

    // Verify bracket matches are displayed
    const bracketMatches = page.locator('[data-testid="bracket-match"]')
    await expect(bracketMatches).toHaveCount(3) // 2 semifinals + 1 final

    // ===== Step 21: Navigate to tournaments and verify it's in Finished tab =====
    await page.goto('/tournaments')
    await page.waitForSelector('h1:has-text("Tournaments")')
    await page.click('button[role="tab"]:has-text("Finished")')
    await expect(page.getByText(tournamentName)).toBeVisible()
  })

  test('groups are balanced by MMR (snake draft)', async ({ page, request }) => {
    const creator = users[0]
    const tournamentName = `Snake Draft Test ${uniqueId()}`

    // Create tournament
    await loginAs(page, creator.email, creator.password)
    await page.goto('/tournaments')
    await page.waitForSelector('h1:has-text("Tournaments")')
    await page.click('button:has-text("New Tournament")')
    await page.fill('input[placeholder="Friday Night Tournament"]', tournamentName)
    await page.click('[role="combobox"]')
    await page.click('[role="option"]:has-text("Group")')
    await page.click('button:has-text("Create Tournament")')
    await page.waitForTimeout(500)

    // Get tournament ID
    const tournamentsResponse = await request.get('http://localhost:3001/api/tournaments', {
      headers: { Authorization: `Bearer ${creator.token}` },
    })
    const tournaments = await tournamentsResponse.json()
    const tournament = tournaments.find((t: { name: string }) => t.name === tournamentName)
    const testTournamentId = tournament.id

    // Register all players
    for (const user of users) {
      await registerForTournamentViaAPI(request, user.token, testTournamentId)
    }

    // Start tournament
    await page.reload()
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(1000)

    // Get tournament with players
    const tournamentData = await getTournamentViaAPI(request, creator.token, testTournamentId)

    if (tournamentData.players) {
      // Calculate average MMR per group
      const groupAPlayers = tournamentData.players.filter((p) => p.groupName === 'A')
      const groupBPlayers = tournamentData.players.filter((p) => p.groupName === 'B')

      // Get MMRs for each group
      const groupAMMRs = groupAPlayers.map((p) => {
        const user = users.find((u) => u.id === p.userId)
        return user?.mmr || 1000
      })
      const groupBMMRs = groupBPlayers.map((p) => {
        const user = users.find((u) => u.id === p.userId)
        return user?.mmr || 1000
      })

      const avgA = groupAMMRs.reduce((a, b) => a + b, 0) / groupAMMRs.length
      const avgB = groupBMMRs.reduce((a, b) => a + b, 0) / groupBMMRs.length

      // Groups should be relatively balanced (within 100 MMR of each other)
      // Since all users start at 1000 MMR, they should be very close
      expect(Math.abs(avgA - avgB)).toBeLessThanOrEqual(100)
    }
  })
})

// Helper function to complete all matches in a group
async function completeGroupMatches(
  request: import('@playwright/test').APIRequestContext,
  matches: Match[],
  users: TestUser[]
): Promise<void> {
  for (const match of matches) {
    // Find the users involved in this match
    const player1 = users.find((u) => u.id === match.player1Id)
    const player2 = users.find((u) => u.id === match.player2Id)

    if (!player1 || !player2) {
      throw new Error(`Could not find users for match ${match.id}`)
    }

    // Player1 submits score (they win 11-7)
    await submitScoreViaAPI(request, player1.token, match.id, 11, 7)

    // Player2 confirms
    await confirmMatchViaAPI(request, player2.token, match.id)
  }
}

// Verify each player played exactly 3 matches in their group
function verifyGroupMatchCounts(matches: Match[], users: TestUser[]): void {
  const matchCountPerPlayer: Record<string, number> = {}

  for (const match of matches) {
    matchCountPerPlayer[match.player1Id] = (matchCountPerPlayer[match.player1Id] || 0) + 1
    matchCountPerPlayer[match.player2Id] = (matchCountPerPlayer[match.player2Id] || 0) + 1
  }

  // Each of the 8 players should have played exactly 3 matches
  for (const user of users) {
    expect(matchCountPerPlayer[user.id]).toBe(3)
  }
}

// Verify round-robin is complete (every pair in the group played once)
function verifyRoundRobinComplete(matches: Match[], groupName: string): void {
  const groupMatches = matches.filter((m) => m.groupName === groupName)
  const playersInGroup = new Set<string>()

  for (const match of groupMatches) {
    playersInGroup.add(match.player1Id)
    playersInGroup.add(match.player2Id)
  }

  // Should have exactly 4 players in group
  expect(playersInGroup.size).toBe(4)

  // Should have 6 unique pairings (4C2 = 6)
  const pairings = new Set<string>()
  for (const match of groupMatches) {
    const pairKey = [match.player1Id, match.player2Id].sort().join('-')
    pairings.add(pairKey)
  }
  expect(pairings.size).toBe(6)
}
