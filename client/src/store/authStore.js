import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { connectSocket, disconnectSocket } from '../lib/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: (token, user) => {
        set({ token, user });
        // Connect socket immediately on login
        connectSocket({
          userId: user.id,
          cohortId: user.cohortId || null,
        });
      },

      logout: () => {
        disconnectSocket();
        set({ token: null, user: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      // Reconnect socket on page refresh (token already in storage)
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) {
          connectSocket({
            userId: state.user.id,
            cohortId: state.user.cohortId || null,
          });
        }
      },
    }
  )
);

export default useAuthStore;