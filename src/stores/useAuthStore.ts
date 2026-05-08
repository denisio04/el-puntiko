"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string; role: string } | null;
  login: (user: { id: string; email: string; name: string; role: string }) => void;
  logout: () => void;
  loggingOut: boolean;
  setLoggingOut: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      loggingOut: false,
      login: (user) => {
        set({ isAuthenticated: true, user });
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
      setLoggingOut: (value) => {
        set({ loggingOut: value });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);