import { create } from "zustand";
import { API_BASE } from "../api/client";
import { useAlertStore } from "./alertStore";
let socket = null;
export const usePresenceStore = create((set) => ({
    presence: {},
    scores: {},
    connected: false,
    connect: (token) => {
        if (socket?.readyState === WebSocket.OPEN)
            return;
        const wsBase = API_BASE.replace("http", "ws");
        socket = new WebSocket(`${wsBase}/ws?token=${token}`);
        socket.onopen = () => set({ connected: true });
        socket.onclose = () => set({ connected: false });
        socket.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                if (event.type === "presence") {
                    set((s) => ({ presence: { ...s.presence, [event.patient_id]: event } }));
                }
                else if (event.type === "behavior") {
                    set((s) => ({ scores: { ...s.scores, [event.patient_id]: event.agitation_score } }));
                }
                else if (event.type === "alert") {
                    useAlertStore.getState().addAlert(event);
                }
            }
            catch { }
        };
    },
    disconnect: () => {
        socket?.close();
        socket = null;
        set({ connected: false, presence: {}, scores: {} });
    },
}));
