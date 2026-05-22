import { create } from "zustand";

export interface Alert {
  id: string;
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
}

let _seq = 0;

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  addAlert: (raw) =>
    set((s) => ({
      alerts: [{ ...raw, id: String(++_seq), dismissed: false }, ...s.alerts.slice(0, 49)],
    })),
  dismiss: (id) =>
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)) })),
}));
