import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://textanalyzerproject.onrender.com/api').replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null
        })
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
        localStorage.removeItem('auth-storage')
      },

      setUser: (user) => {
        set({ user })
      },

      login: async (username, password) => {
        set({ loading: true, error: null })
        try {
          const loginResponse = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          })

          if (!loginResponse.ok) {
            const errorData = await loginResponse.json().catch(() => ({}))
            throw new Error(errorData?.detail || 'Login failed')
          }

          const data = await loginResponse.json()

          let profile = { username }
          try {
            const meResponse = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.access_token}`
              }
            })
            if (meResponse.ok) {
              profile = await meResponse.json()
            }
          } catch {
            // keep fallback profile
          }

          set({
            token: data.access_token,
            isAuthenticated: true,
            user: {
              username: profile?.username || username,
              email: profile?.email || null,
              created_at: profile?.created_at || null,
              settings: profile?.settings || null
            },
            loading: false,
            error: null
          })

          return data
        } catch (error) {
          const errorMessage = error?.name === 'AbortError'
            ? 'Server timeout. Backend may be cold-starting or database is unreachable.'
            : error.message

          set({
            error: errorMessage,
            loading: false
          })
          throw new Error(errorMessage)
        }
      },

      register: async (username, password, email) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData?.detail || 'Registration failed')
          }

          const data = await response.json()
          set({
            user: data,
            loading: false,
            error: null
          })

          return data
        } catch (error) {
          set({
            error: error.message,
            loading: false
          })
          throw error
        }
      },

      getAuthToken: () => get().token,

      getUser: () => get().user,

      isLoggedIn: () => get().isAuthenticated
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore
