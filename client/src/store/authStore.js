import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth store — holds the logged-in user + their JWT.
 * Persists to localStorage so the user stays logged in across refreshes.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      // ── state ──
      token: null,    // JWT string
      user: null,     // { id, name, email, role, ... }

      // ── actions ──

      // Save user + token after a successful login
      login: (token, user) => set({ token, user }),

      // Clear everything on logout
      logout: () => set({ token: null, user: null }),

      // Convenience getter (we'll use this for protected routes)
      isAuthenticated: () => {
        const state = useAuthStore.getState();
        return !!state.token && !!state.user;
      },
    }),
    {
      name: 'internhub-auth', // localStorage key
    }
  )
);

export default useAuthStore;