import { Page, APIRequestContext } from '@playwright/test'

const API_URL = 'http://localhost:3001/api'

// Generate unique identifiers for test isolation
export function uniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
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
    username: overrides.username || `user_${id}`,
    email: overrides.email || `user_${id}@test.com`,
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

  // Select opponent
  await page.click('[role="combobox"]')
  await page.click(`[role="option"]:has-text("${opponentUsername}")`)

  // Enter scores if provided
  if (player1Score !== undefined && player2Score !== undefined) {
    // Find score inputs by their labels
    const scoreInputs = page.locator('input[type="number"][placeholder="0"]')
    await scoreInputs.nth(0).fill(player1Score.toString())
    await scoreInputs.nth(1).fill(player2Score.toString())
  }

  // Submit
  await page.click('button:has-text("Create Match")')
  await page.waitForTimeout(500) // Wait for mutation to complete
}

export async function confirmMatchViaUI(page: Page): Promise<void> {
  await page.click('button:has-text("Confirm")')
  // Wait for the mutation to complete and UI to refresh
  // The Confirm button should disappear after successful confirmation
  await page.waitForTimeout(1000)
}
