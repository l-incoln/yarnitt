import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { setAuthToken, removeAuthToken } from '@/lib/utils';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        setAuthToken(token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        removeAuthToken();
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
