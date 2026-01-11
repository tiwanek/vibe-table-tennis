export interface User {
  id: string
  username: string
  email: string
  mmr: number
  createdAt: string
}

export interface Match {
  id: string
  player1Id: string
  player2Id: string
  player1Score: number | null
  player2Score: number | null
  status: 'PENDING' | 'AWAITING_CONFIRM' | 'CONFIRMED'
  createdById: string
  confirmedById: string | null
  tournamentId: string | null
  tournamentStage: string | null
  groupName: string | null
  createdAt: string
  player1: Pick<User, 'id' | 'username' | 'mmr'>
  player2: Pick<User, 'id' | 'username' | 'mmr'>
  tournament?: Pick<Tournament, 'id' | 'name'> | null
}

export interface Tournament {
  id: string
  name: string
  type: 'SWISS' | 'GROUP_ELIMINATION'
  status: 'OPEN' | 'LIVE' | 'FINISHED'
  creatorId: string
  currentRound: number | null
  createdAt: string
  creator: Pick<User, 'id' | 'username'>
  players: TournamentPlayer[]
  matches?: Match[]
  _count?: {
    matches: number
    players: number
  }
}

export interface TournamentPlayer {
  id: string
  tournamentId: string
  userId: string
  groupName: string | null
  eliminated: boolean
  seed: number | null
  user: Pick<User, 'id' | 'username' | 'mmr'>
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ApiError {
  error: string
}
