/**
 * Stores real-time alerts received via WebSocket.
 * Alert events have type === "alert" and include alert_type, patient info, and score.
 */

import { create } from "zustand";

export interface Alert {
  id: string;              // client-side UUID for list keys
  alert_type: "outburst" | "predicted_outburst";
  patient_id: string;
  patient_name: string;
  room_number: string;
  agitation_score: number;
  timestamp: string;
  dismissed: boolean;
}

interface AlertState {
  alerts: Alert[];
  addAlert: (raw: Omit<Alert, "id" | "dismissed">) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

let _seq = 0;

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],

  addAlert: (raw) =>
    set((state) => ({
      alerts: [
        { ...raw, id: String(++_seq), dismissed: false },
        ...state.alerts.slice(0, 49), // keep last 50
      ],
    })),

  dismiss: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),

  clearAll: () => set({ alerts: [] }),
}));
