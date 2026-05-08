"use client";

import { create } from "zustand";

export type UserRole = "ADMIN" | "AFFILIATE" | "SUPPLIER" | "DELIVERY" | "STAFF";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  wallet: number;
  createdAt: string;
}

interface UserState {
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (user: { username: string; password: string; name?: string; role: UserRole; wallet: number }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updates: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
}

const getAdminId = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.user?.id ?? null;
    }
  } catch {}
  return null;
};

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,

  fetchUsers: async () => {
    set({ loading: true });
    const adminId = getAdminId();
    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        headers: adminId ? { "x-admin-id": adminId } : {},
      });
      if (res.ok) {
        const data = await res.json();
        set({ users: data });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      set({ loading: false });
    }
  },

  addUser: async (userData) => {
    const adminId = getAdminId();
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(adminId ? { "x-admin-id": adminId } : {}),
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchUsers();
        return { success: true };
      }
      return { success: false, error: data.error || "Error al crear usuario" };
    } catch {
      return { success: false, error: "Error de conexión" };
    }
  },

  updateUser: async (id, updates) => {
    const adminId = getAdminId();
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(adminId ? { "x-admin-id": adminId } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchUsers();
        return { success: true };
      }
      return { success: false, error: data.error || "Error al actualizar usuario" };
    } catch {
      return { success: false, error: "Error de conexión" };
    }
  },

  deleteUser: async (id) => {
    const adminId = getAdminId();
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: adminId ? { "x-admin-id": adminId } : {},
      });
      if (res.ok) {
        await get().fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  },
}));