import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      // Update just the user object (keeps token unchanged)
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    { name: 'internhub-auth' }
  )
);

export default useAuthStore;
