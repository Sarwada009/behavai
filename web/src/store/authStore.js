import { create } from "zustand";
import client from "../api/client";
export const useAuthStore = create((set) => ({
    user: null,
    login: async (email, password) => {
        const { data } = await client.post("/auth/login", { email, password });
        localStorage.setItem("access_token", data.access_token);
        set({ user: data.user });
    },
    logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null });
    },
    hydrate: async () => {
        const token = localStorage.getItem("access_token");
        if (!token)
            return;
        try {
            const { data } = await client.get("/auth/me");
            set({ user: data });
        }
        catch {
            localStorage.removeItem("access_token");
        }
    },
}));
