import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { API_BASE } from "../api/client";
import { useAlertStore } from "./alertStore";

export interface PresenceRecord {
  patient_id: string;
  patient_name: string;
  camera_id: string;
  room_number: string;
  confidence: number;
  timestamp: string;
}

interface PresenceState {
  presence: Record<string, PresenceRecord>;
  scores: Record<string, number>;        // live agitation scores keyed by patient_id
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

let socket: WebSocket | null = null;

export const usePresenceStore = create<PresenceState>((set) => ({
  presence: {},
  scores: {},
  connected: false,

  connect: async () => {
    if (socket?.readyState === WebSocket.OPEN) return;
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) return;

    const wsBase = API_BASE.replace("http", "ws");
    socket = new WebSocket(`${wsBase}/ws?token=${token}`);

    socket.onopen  = () => set({ connected: true });
    socket.onclose = () => set({ connected: false });

    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === "presence") {
          set((s) => ({ presence: { ...s.presence, [event.patient_id]: event } }));

        } else if (event.type === "behavior") {
          set((s) => ({ scores: { ...s.scores, [event.patient_id]: event.agitation_score } }));

        } else if (event.type === "alert") {
          useAlertStore.getState().addAlert(event);
        }
      } catch {}
    };
  },

  disconnect: () => {
    socket?.close();
    socket = null;
    set({ connected: false, presence: {}, scores: {} });
  },
}));
