import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ---- State ----
      user: null,
      token: null,
      isAuthenticated: false,

      // ---- Actions ----

      /**
       * Set authentication data after login.
       * @param {object} user - The user object from the API
       * @param {string} token - JWT token
       */
      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        })
      },

      /**
       * Clear all auth state and remove persisted data.
       */
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        // Also clear any other auth-related items
        localStorage.removeItem('auth-storage')
      },

      /**
       * Load auth from persisted storage on app start.
       * Zustand persist middleware handles rehydration automatically,
       * but this method validates the state and marks isAuthenticated.
       */
      loadAuth: () => {
        const state = get()
        if (state.token && state.user) {
          set({ isAuthenticated: true })
        } else {
          set({ isAuthenticated: false, user: null, token: null })
        }
      },
    }),
    {
      name: 'auth-storage', // key in localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

export default useAuthStore
