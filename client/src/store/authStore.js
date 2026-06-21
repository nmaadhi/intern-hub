import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { connectSocket, disconnectSocket } from '../lib/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: (token, user) => {
        set({ token, user });
        connectSocket({
          userId: user.id,
          cohortId: user.cohortId || null,
        });
      },

      logout: () => {
        disconnectSocket();
        set({ token: null, user: null });
        sessionStorage.removeItem('auth-storage');
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      // sessionStorage instead of localStorage
      // → new tab = login page
      // → close tab = logged out
      // → refresh same tab = stays logged in
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAuthStore;