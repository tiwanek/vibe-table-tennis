import { test, expect } from '@playwright/test'
import {
  createUser,
  loginAs,
  logout,
  createMatchViaUI,
  confirmMatchViaUI,
  getUserViaAPI,
  createMatchViaAPI,
  submitScoreViaAPI,
  TestUser,
} from './fixtures/test-utils'

test.describe('Standalone Match', () => {
  let userA: TestUser
  let userB: TestUser

  test.beforeAll(async ({ request }) => {
    // Create two test users
    userA = await createUser(request)
    userB = await createUser(request)
  })

  test('complete match flow: create, confirm, verify MMR changes', async ({ page, request }) => {
    // Store initial MMRs
    const initialMmrA = userA.mmr
    const initialMmrB = userB.mmr

    // ===== Step 1: UserA creates a match against UserB with scores =====
    await loginAs(page, userA.email, userA.password)
    await page.goto('/matches')

    // Create match with scores
    await createMatchViaUI(page, userB.username, 11, 5)

    // Verify match appears in Pending tab
    await expect(page.getByRole('tab', { name: /Pending/ })).toBeVisible()
    await expect(page.getByText(`${userA.username} vs ${userB.username}`)).toBeVisible()
    await expect(page.getByText('Score: 11 - 5')).toBeVisible()
    await expect(page.getByText('AWAITING CONFIRM')).toBeVisible()

    // UserA should NOT see Confirm button (they submitted the score)
    const pendingTab = page.locator('[role="tabpanel"]').first()
    await expect(pendingTab.getByRole('button', { name: 'Confirm' })).not.toBeVisible()

    // Logout UserA
    await logout(page)

    // ===== Step 2: UserB logs in and confirms the match =====
    await loginAs(page, userB.email, userB.password)
    await page.goto('/matches')

    // Verify match is visible in Pending tab
    await expect(page.getByText(`${userA.username} vs ${userB.username}`)).toBeVisible()
    await expect(page.getByText('Score: 11 - 5')).toBeVisible()

    // UserB should see Confirm button
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible()

    // Click confirm
    await confirmMatchViaUI(page)

    // ===== Step 3: Verify match moved to Confirmed tab =====
    await page.click('button[role="tab"]:has-text("Confirmed")')

    // Verify match is in confirmed tab with result
    await expect(page.getByText(`${userA.username} vs ${userB.username}`)).toBeVisible()
    await expect(page.getByText('Score: 11 - 5')).toBeVisible()

    // UserB should see LOST (they lost 5-11)
    await expect(page.getByText('LOST')).toBeVisible()

    // Logout UserB
    await logout(page)

    // ===== Step 4: UserA logs in and verifies they see WIN =====
    await loginAs(page, userA.email, userA.password)
    await page.goto('/matches')

    await page.click('button[role="tab"]:has-text("Confirmed")')
    await expect(page.getByText('WON')).toBeVisible()

    // ===== Step 5: Verify MMR changes via API =====
    const updatedUserA = await getUserViaAPI(request, userA.token)
    const updatedUserB = await getUserViaAPI(request, userB.token)

    // Winner's MMR should increase
    expect(updatedUserA.mmr).toBeGreaterThan(initialMmrA)

    // Loser's MMR should decrease
    expect(updatedUserB.mmr).toBeLessThan(initialMmrB)

    // MMR changes should be symmetric (approximately)
    const mmrGain = updatedUserA.mmr - initialMmrA
    const mmrLoss = initialMmrB - updatedUserB.mmr
    expect(mmrGain).toBe(mmrLoss)

    // For equal starting MMR (1000 vs 1000), winner gains ~16 points
    expect(mmrGain).toBeGreaterThanOrEqual(15)
    expect(mmrGain).toBeLessThanOrEqual(17)
  })

  test('user cannot confirm their own score submission', async ({ page }) => {
    // Login as UserA
    await loginAs(page, userA.email, userA.password)
    await page.goto('/matches')

    await createMatchViaUI(page, userB.username, 11, 8)

    // UserA should NOT see Confirm button on the match they just created
    // The match should be in pending tab with AWAITING_CONFIRM status
    await expect(page.getByText('AWAITING CONFIRM')).toBeVisible()

    // UserA should NOT see a Confirm button for their own submission
    const pendingTab = page.locator('[role="tabpanel"]').first()
    await expect(pendingTab.getByRole('button', { name: 'Confirm' })).not.toBeVisible()
  })

  test('match without score can have score entered later', async ({ page }) => {
    // Create fresh users for this test
    const userC = await createUser(page.request)
    const userD = await createUser(page.request)

    // ===== Step 1: UserC creates a match WITHOUT scores =====
    await loginAs(page, userC.email, userC.password)
    await page.goto('/matches')

    // Create match without scores
    await page.click('button:has-text("New Match")')
    await page.waitForSelector('text=Record New Match')
    await page.click('[role="combobox"]')
    await page.click(`[role="option"]:has-text("${userD.username}")`)
    // Do NOT enter scores
    await page.click('button:has-text("Create Match")')
    await page.waitForTimeout(1000)

    // Verify match appears with PENDING status and no score
    await expect(page.getByText(`${userC.username} vs ${userD.username}`)).toBeVisible()
    await expect(page.getByText('Score not entered yet')).toBeVisible()
    await expect(page.getByText('Status: PENDING')).toBeVisible()

    // UserC should see "Enter Score" button
    await expect(page.getByRole('button', { name: 'Enter Score' })).toBeVisible()

    // ===== Step 2: UserC enters the score =====
    await page.click('button:has-text("Enter Score")')

    // Fill in the scores
    await page.waitForSelector('button:has-text("Submit Score")')
    await page.locator('input[placeholder="0"]').first().fill('11')
    await page.locator('input[placeholder="0"]').last().fill('7')
    await page.click('button:has-text("Submit Score")')
    await page.waitForTimeout(1000)

    // Verify match now shows score and AWAITING_CONFIRM status
    await expect(page.getByText('Score: 11 - 7')).toBeVisible()
    await expect(page.getByText('AWAITING CONFIRM')).toBeVisible()

    // UserC should NOT see Confirm button (they submitted the score)
    const pendingTab = page.locator('[role="tabpanel"]').first()
    await expect(pendingTab.getByRole('button', { name: 'Confirm' })).not.toBeVisible()

    // Logout UserC
    await logout(page)

    // ===== Step 3: UserD logs in and confirms the match =====
    await loginAs(page, userD.email, userD.password)
    await page.goto('/matches')

    // UserD should see the match and Confirm button
    await expect(page.getByText(`${userC.username} vs ${userD.username}`)).toBeVisible()
    await expect(page.getByText('Score: 11 - 7')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible()

    // Confirm the match
    await confirmMatchViaUI(page)

    // Verify match moved to Confirmed tab
    await page.click('button[role="tab"]:has-text("Confirmed")')
    await expect(page.getByText(`${userC.username} vs ${userD.username}`)).toBeVisible()
    await expect(page.getByText('Score: 11 - 7')).toBeVisible()
  })

  test('second score submission is rejected after first submission', async ({ request }) => {
    // Create fresh users for this test
    const userE = await createUser(request)
    const userF = await createUser(request)

    // Create a match without scores (PENDING status)
    const match = await createMatchViaAPI(request, userE.token, userF.id)
    expect(match.status).toBe('PENDING')

    // First player submits a score - should succeed
    const updatedMatch = await submitScoreViaAPI(request, userE.token, match.id, 11, 5)
    expect(updatedMatch.status).toBe('AWAITING_CONFIRM')
    expect(updatedMatch.player1Score).toBe(11)
    expect(updatedMatch.player2Score).toBe(5)

    // Second player tries to submit a different score - should be rejected
    const response = await request.patch(`http://localhost:3001/api/matches/${match.id}/score`, {
      headers: { Authorization: `Bearer ${userF.token}` },
      data: { player1Score: 5, player2Score: 11 },
    })

    expect(response.status()).toBe(400)
    const error = await response.json()
    expect(error.error).toContain('already been submitted')
  })
})
