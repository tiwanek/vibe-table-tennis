import { test, expect } from '@playwright/test'
import {
  createTestUsers,
  loginAs,
  registerForTournamentViaAPI,
  createTournamentViaAPI,
  startTournamentViaAPI,
  getTournamentViaAPI,
  getTournamentMatchesViaAPI,
  submitScoreViaAPI,
  confirmMatchViaAPI,
  advanceRoundViaAPI,
  TestUser,
  Match,
  uniqueId,
} from './fixtures/test-utils'

test.describe('Swiss Tournament', () => {
  let users: TestUser[]
  let tournamentId: string
  const PLAYER_COUNT = 8

  test.beforeAll(async ({ request }) => {
    // Create 8 test users
    users = await createTestUsers(request, PLAYER_COUNT)
  })

  test('complete Swiss tournament with 8 players through all rounds', async ({ page, request }) => {
    const creator = users[0]
    const tournamentName = `Swiss Tournament ${uniqueId()}`

    // ===== Step 1: Create tournament via UI =====
    await loginAs(page, creator.email, creator.password)
    await page.goto('/tournaments')

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Tournaments")')

    // Click "New Tournament"
    await page.click('button:has-text("New Tournament")')

    // Fill tournament form
    await page.fill('input[placeholder="Friday Night Tournament"]', tournamentName)

    // Select Swiss type (should be default)
    await page.click('[role="combobox"]')
    await page.click('[role="option"]:has-text("Swiss")')

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

    // ===== Step 4: Get tournament matches and verify Round 1 =====
    let matches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)

    // Should have 4 matches (8 players / 2)
    expect(matches.length).toBe(4)

    // All matches should be SWISS_ROUND_1
    for (const match of matches) {
      expect(match.tournamentStage).toBe('SWISS_ROUND_1')
      expect(match.status).toBe('PENDING')
    }

    // ===== Step 5: Complete Round 1 matches =====
    await completeRoundMatches(request, matches, users)

    // ===== Step 6: Advance to Round 2 =====
    // Navigate to tournament detail
    await page.click(`a:has-text("View")`);
    await page.waitForURL(/\/tournaments\//);

    // Click Advance Round
    await page.click('button:has-text("Advance Round")')
    await page.waitForTimeout(1000)

    // Verify Round 2 matches created
    matches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    const round2Matches = matches.filter((m) => m.tournamentStage === 'SWISS_ROUND_2')
    expect(round2Matches.length).toBe(4)

    // Verify tournament shows Round 2
    const tournamentAfterR1 = await getTournamentViaAPI(request, creator.token, tournamentId)
    expect(tournamentAfterR1.currentRound).toBe(2)

    // ===== Step 7: Complete Round 2 matches =====
    await completeRoundMatches(request, round2Matches, users)

    // Refresh page and advance to Round 3
    await page.reload()
    await page.click('button:has-text("Advance Round")')
    await page.waitForTimeout(1000)

    // ===== Step 8: Complete Round 3 matches =====
    matches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    const round3Matches = matches.filter((m) => m.tournamentStage === 'SWISS_ROUND_3')
    expect(round3Matches.length).toBe(4)

    await completeRoundMatches(request, round3Matches, users)

    // ===== Step 9: Advance and verify tournament finishes =====
    await page.reload()
    await page.click('button:has-text("Advance Round")')
    await page.waitForTimeout(1000)

    // Verify tournament is finished
    const finalTournament = await getTournamentViaAPI(request, creator.token, tournamentId)
    expect(finalTournament.status).toBe('FINISHED')

    // Navigate back to tournaments list
    await page.goto('/tournaments')
    await page.click('button[role="tab"]:has-text("Finished")')
    await expect(page.getByText(tournamentName)).toBeVisible()

    // ===== Step 10: Verify no rematches occurred =====
    const allMatches = await getTournamentMatchesViaAPI(request, creator.token, tournamentId)
    verifyNoRematches(allMatches)
  })
})

// Helper function to complete all matches in a round
async function completeRoundMatches(
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

    // Player1 submits score (they win 11-5)
    await submitScoreViaAPI(request, player1.token, match.id, 11, 5)

    // Player2 confirms
    await confirmMatchViaAPI(request, player2.token, match.id)
  }
}

// Helper function to verify no rematches occurred
function verifyNoRematches(matches: Match[]): void {
  const pairings = new Set<string>()

  for (const match of matches) {
    const pairKey = [match.player1Id, match.player2Id].sort().join('-')

    if (pairings.has(pairKey)) {
      throw new Error(`Rematch detected: ${pairKey}`)
    }

    pairings.add(pairKey)
  }
}
