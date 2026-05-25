import { create } from "zustand";
let _seq = 0;
export const useAlertStore = create((set) => ({
    alerts: [],
    addAlert: (raw) => set((s) => ({
        alerts: [{ ...raw, id: String(++_seq), dismissed: false }, ...s.alerts.slice(0, 49)],
    })),
    dismiss: (id) => set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)) })),
}));
