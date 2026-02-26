import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://textanalyzerproject.onrender.com/api').replace(/\/$/, '')

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
          const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
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
            const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
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
          set({
            error: error.message,
            loading: false
          })
          throw error
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
