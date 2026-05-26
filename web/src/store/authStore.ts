import { create } from "zustand";
import client from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  login: async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    set({ user: data.user });
  },

  register: async (name, email, password, role) => {
    const { data } = await client.post("/auth/register", { name, email, password, role });
    localStorage.setItem("access_token", data.access_token);
    set({ user: data.user });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ user: null });
  },

  hydrate: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const { data } = await client.get("/auth/me");
      set({ user: data });
    } catch {
      localStorage.removeItem("access_token");
    }
  },
}));
