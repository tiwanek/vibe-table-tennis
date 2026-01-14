import { Page, APIRequestContext } from '@playwright/test'
import { faker } from '@faker-js/faker'

const API_URL = 'http://localhost:3001/api'

// Generate unique identifiers for test isolation
export function uniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

function generateFakeName(): string {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const fullName = `${firstName} ${lastName} (e2e)`
  // Username must be at most 30 characters
  if (fullName.length > 30) {
    // Truncate to fit within limit
    return `${firstName.slice(0, 10)} ${lastName.slice(0, 10)} (e2e)`
  }
  return fullName
}

// User types
export interface TestUser {
  id: string
  username: string
  email: string
  password: string
  mmr: number
  token: string
}

export interface Match {
  id: string
  player1Id: string
  player2Id: string
  player1Score: number | null
  player2Score: number | null
  status: string
  tournamentId: string | null
  tournamentStage: string | null
  groupName: string | null
}

export interface Tournament {
  id: string
  name: string
  type: string
  status: string
  currentRound: number | null
  matches?: Match[]
  players?: Array<{ userId: string; groupName: string | null }>
}

// ============ Authentication Helpers ============

export async function createUser(
  request: APIRequestContext,
  overrides: Partial<{ username: string; email: string; password: string }> = {}
): Promise<TestUser> {
  const id = uniqueId()
  const userData = {
    username: overrides.username || generateFakeName(),
    email: overrides.email || `e2e_${id}@test.com`,
    password: overrides.password || 'password123',
  }

  const response = await request.post(`${API_URL}/auth/signup`, {
    data: userData,
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create user: ${error}`)
  }

  const result = await response.json()
  return {
    id: result.user.id,
    username: result.user.username,
    email: result.user.email,
    password: userData.password,
    mmr: result.user.mmr,
    token: result.token,
  }
}

export async function createTestUsers(
  request: APIRequestContext,
  count: number
): Promise<TestUser[]> {
  const users: TestUser[] = []
  for (let i = 0; i < count; i++) {
    const user = await createUser(request)
    users.push(user)
  }
  return users
}

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
  // Wait for the page to fully load
  await page.waitForSelector('text=Welcome')
}

export async function logout(page: Page): Promise<void> {
  // Click the logout button in the header
  await page.click('button:has-text("Logout")')
  await page.waitForURL('/login')
}

// ============ Match Helpers ============

export async function createMatchViaAPI(
  request: APIRequestContext,
  token: string,
  player2Id: string,
  scores?: { player1Score: number; player2Score: number }
): Promise<Match> {
  const data: Record<string, unknown> = { player2Id }
  if (scores) {
    data.player1Score = scores.player1Score
    data.player2Score = scores.player2Score
  }

  const response = await request.post(`${API_URL}/matches`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create match: ${error}`)
  }

  return response.json()
}

export async function submitScoreViaAPI(
  request: APIRequestContext,
  token: string,
  matchId: string,
  player1Score: number,
  player2Score: number
): Promise<Match> {
  const response = await request.patch(`${API_URL}/matches/${matchId}/score`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { player1Score, player2Score },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to submit score: ${error}`)
  }

  return response.json()
}

export async function confirmMatchViaAPI(
  request: APIRequestContext,
  token: string,
  matchId: string
): Promise<Match> {
  const response = await request.post(`${API_URL}/matches/${matchId}/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to confirm match: ${error}`)
  }

  return response.json()
}

export async function getMatchesViaAPI(
  request: APIRequestContext,
  token: string
): Promise<Match[]> {
  const response = await request.get(`${API_URL}/matches`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    throw new Error('Failed to get matches')
  }

  return response.json()
}

export async function getUserViaAPI(
  request: APIRequestContext,
  token: string
): Promise<{ id: string; username: string; mmr: number }> {
  const response = await request.get(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    throw new Error('Failed to get user')
  }

  return response.json()
}

// ============ Tournament Helpers ============

export async function createTournamentViaAPI(
  request: APIRequestContext,
  token: string,
  name: string,
  type: 'SWISS' | 'GROUP_ELIMINATION'
): Promise<Tournament> {
  const response = await request.post(`${API_URL}/tournaments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, type },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create tournament: ${error}`)
  }

  return response.json()
}

export async function registerForTournamentViaAPI(
  request: APIRequestContext,
  token: string,
  tournamentId: string
): Promise<void> {
  const response = await request.post(`${API_URL}/tournaments/${tournamentId}/register`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to register for tournament: ${error}`)
  }
}

export async function startTournamentViaAPI(
  request: APIRequestContext,
  token: string,
  tournamentId: string
): Promise<Tournament> {
  const response = await request.post(`${API_URL}/tournaments/${tournamentId}/start`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to start tournament: ${error}`)
  }

  return response.json()
}

export async function getTournamentViaAPI(
  request: APIRequestContext,
  token: string,
  tournamentId: string
): Promise<Tournament> {
  const response = await request.get(`${API_URL}/tournaments/${tournamentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    throw new Error('Failed to get tournament')
  }

  return response.json()
}

export async function getTournamentMatchesViaAPI(
  request: APIRequestContext,
  token: string,
  tournamentId: string
): Promise<Match[]> {
  const response = await request.get(`${API_URL}/tournaments/${tournamentId}/matches`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    throw new Error('Failed to get tournament matches')
  }

  return response.json()
}

export async function advanceRoundViaAPI(
  request: APIRequestContext,
  token: string,
  tournamentId: string
): Promise<Tournament> {
  const response = await request.post(`${API_URL}/tournaments/${tournamentId}/advance`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to advance round: ${error}`)
  }

  return response.json()
}

// ============ UI Helpers ============

export async function createMatchViaUI(
  page: Page,
  opponentUsername: string,
  player1Score?: number,
  player2Score?: number
): Promise<void> {
  // Wait for page to load (not showing loading state)
  await page.waitForSelector('h1:has-text("Matches")')
  // Click "New Match" button
  await page.click('button:has-text("New Match")')

  // Wait for the dialog form to appear
  await page.waitForSelector('text=Record New Match')

  // Select opponent
  await page.click('[role="combobox"]')
  await page.click(`[role="option"]:has-text("${opponentUsername}")`)

  // Enter scores if provided
  if (player1Score !== undefined && player2Score !== undefined) {
    // Wait for score inputs to be visible, then fill them
    await page.waitForSelector('input[placeholder="0"]')
    // Use label-based selection for more reliability
    await page.locator('input[placeholder="0"]').first().fill(player1Score.toString())
    await page.locator('input[placeholder="0"]').last().fill(player2Score.toString())
  }

  // Submit
  await page.click('button:has-text("Create Match")')
  await page.waitForTimeout(1000) // Wait for mutation to complete
}

export async function confirmMatchViaUI(page: Page): Promise<void> {
  // Click the Confirm button in the pending matches panel
  const confirmButton = page
    .locator('[role="tabpanel"]')
    .first()
    .getByRole('button', { name: 'Confirm' })
  await confirmButton.click()
  // Wait for the mutation to complete and UI to refresh
  await page.waitForTimeout(1500)
  // Refetch the page to ensure data is fresh
  await page.reload()
  await page.waitForSelector('h1:has-text("Matches")')
}

// ============ Tournament Detail UI Helpers ============

/**
 * Navigate to tournament detail page and click advance button
 */
export async function advanceTournamentViaUI(page: Page, buttonText: string): Promise<void> {
  // Click the advance button
  await page.click(`button:has-text("${buttonText}")`)
  // Wait for the mutation to complete
  await page.waitForTimeout(1000)
}

/**
 * Enter score for a match on the Matches page via UI
 * Player must be logged in and the match must be in PENDING status
 */
export async function enterScoreViaUI(
  page: Page,
  player1Username: string,
  player2Username: string,
  player1Score: number,
  player2Score: number
): Promise<void> {
  // Find the match card containing both player names
  const matchCard = page.locator('.py-4').filter({
    hasText: `${player1Username} vs ${player2Username}`,
  })

  // Click "Enter Score" button
  await matchCard.getByRole('button', { name: 'Enter Score' }).click()

  // Fill in scores
  const scoreInputs = matchCard.locator('input[type="number"]')
  await scoreInputs.first().fill(player1Score.toString())
  await scoreInputs.last().fill(player2Score.toString())

  // Submit score
  await matchCard.getByRole('button', { name: 'Submit Score' }).click()
  await page.waitForTimeout(500)
}

/**
 * Confirm a match on the Matches page via UI
 * Player must be logged in and the match must be in AWAITING_CONFIRM status
 */
export async function confirmMatchOnMatchesPageViaUI(
  page: Page,
  player1Username: string,
  player2Username: string
): Promise<void> {
  // Find the match card containing both player names
  const matchCard = page.locator('.py-4').filter({
    hasText: `${player1Username} vs ${player2Username}`,
  })

  // Click "Confirm" button
  await matchCard.getByRole('button', { name: 'Confirm' }).click()
  await page.waitForTimeout(500)
}
