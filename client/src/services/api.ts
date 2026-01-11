import axios from 'axios'
import type { User, Match, Tournament, AuthResponse } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  signup: async (data: { username: string; email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/signup', data)
    return res.data
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/login', data)
    return res.data
  },
  resetPasswordRequest: async (email: string) => {
    const res = await api.post('/auth/reset-password', { email })
    return res.data
  },
  resetPassword: async (token: string, password: string) => {
    const res = await api.post(`/auth/reset-password/${token}`, { password })
    return res.data
  },
}

// Users
export const usersApi = {
  getMe: async () => {
    const res = await api.get<User>('/users/me')
    return res.data
  },
  getAll: async () => {
    const res = await api.get<Pick<User, 'id' | 'username' | 'mmr'>[]>('/users')
    return res.data
  },
  getById: async (id: string) => {
    const res = await api.get<User>(`/users/${id}`)
    return res.data
  },
  getMatches: async (id: string) => {
    const res = await api.get<Match[]>(`/users/${id}/matches`)
    return res.data
  },
}

// Matches
export const matchesApi = {
  getAll: async () => {
    const res = await api.get<Match[]>('/matches')
    return res.data
  },
  getById: async (id: string) => {
    const res = await api.get<Match>(`/matches/${id}`)
    return res.data
  },
  create: async (data: { player2Id: string; player1Score?: number; player2Score?: number }) => {
    const res = await api.post<Match>('/matches', data)
    return res.data
  },
  updateScore: async (id: string, data: { player1Score: number; player2Score: number }) => {
    const res = await api.patch<Match>(`/matches/${id}/score`, data)
    return res.data
  },
  confirm: async (id: string) => {
    const res = await api.post<Match>(`/matches/${id}/confirm`)
    return res.data
  },
}

// Tournaments
export const tournamentsApi = {
  getAll: async () => {
    const res = await api.get<Tournament[]>('/tournaments')
    return res.data
  },
  getById: async (id: string) => {
    const res = await api.get<Tournament>(`/tournaments/${id}`)
    return res.data
  },
  create: async (data: { name: string; type: 'SWISS' | 'GROUP_ELIMINATION' }) => {
    const res = await api.post<Tournament>('/tournaments', data)
    return res.data
  },
  register: async (id: string) => {
    const res = await api.post(`/tournaments/${id}/register`)
    return res.data
  },
  unregister: async (id: string) => {
    const res = await api.delete(`/tournaments/${id}/register`)
    return res.data
  },
  start: async (id: string) => {
    const res = await api.post<Tournament>(`/tournaments/${id}/start`)
    return res.data
  },
  getMatches: async (id: string) => {
    const res = await api.get<Match[]>(`/tournaments/${id}/matches`)
    return res.data
  },
  advance: async (id: string) => {
    const res = await api.post<Tournament>(`/tournaments/${id}/advance`)
    return res.data
  },
}

export default api
