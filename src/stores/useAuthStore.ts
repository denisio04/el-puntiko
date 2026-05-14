"use client";

import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string; role: string } | null;
  login: (user: { id: string; email: string; name: string; role: string }) => void;
  logout: () => void;
  loggingOut: boolean;
  setLoggingOut: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
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
  })
);