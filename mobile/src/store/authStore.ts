import * as SecureStore from "expo-secure-store";
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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("access_token", data.access_token);
    set({ user: data.user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    set({ user: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        const { data } = await client.get("/auth/me");
        set({ user: data });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
