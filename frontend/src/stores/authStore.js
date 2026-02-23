import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

      login: async (username, password) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            }
          )

          if (!response.ok) {
            throw new Error('Login failed')
          }

          const data = await response.json()
          set({
            token: data.access_token,
            isAuthenticated: true,
            user: { username },
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
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password, email })
            }
          )

          if (!response.ok) {
            throw new Error('Registration failed')
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
