"use client";

import { create } from "zustand";

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

export const useAuth = create<AuthState>()(
  (set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    clearUser: () => set({ user: null, isAuthenticated: false }),
  })
);

export async function login(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  useAuth.getState().setUser(data.user);
  return data.user;
}

export function logout() {
  useAuth.getState().clearUser();
}