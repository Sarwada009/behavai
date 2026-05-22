import React from "react";
import { useAlertStore } from "../store/alertStore";

function scoreColor(score: number): string {
  if (score >= 80) return "#c62828";
  if (score >= 60) return "#e65100";
  return "#f9a825";
}

export function AlertPanel() {
  const { alerts, dismiss } = useAlertStore();
  const active = alerts.filter((a) => !a.dismissed);

  if (active.length === 0) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerText}>Active Alerts ({active.length})</span>
      </div>
      {active.map((a) => {
        const isOutburst = a.alert_type === "outburst";
        const color = isOutburst ? "#c62828" : "#e65100";
        const time  = new Date(a.timestamp).toLocaleTimeString();
        return (
          <div key={a.id} style={{ ...styles.alert, borderLeftColor: color }}>
            <div style={styles.alertBody}>
              <div style={styles.alertTitle}>
                <span style={styles.emoji}>{isOutburst ? "🚨" : "⚠️"}</span>
                <strong style={{ color }}>
                  {isOutburst ? "Outburst Alert" : "Behaviour Warning"}
                </strong>
                <span style={styles.time}>{time}</span>
              </div>
              <div style={styles.alertDetail}>
                {a.patient_name} &middot; Room {a.room_number} &middot;{" "}
                <span style={{ color: scoreColor(a.agitation_score), fontWeight: 700 }}>
                  Score {a.agitation_score}/100
                </span>
              </div>
            </div>
            <button style={styles.dismissBtn} onClick={() => dismiss(a.id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    margin: "0 32px 0",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#c62828",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alert: {
    background: "#fff",
    borderLeft: "5px solid #c62828",
    borderRadius: 8,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    animation: "fadeIn 0.2s ease",
  },
  alertBody: { flex: 1 },
  alertTitle: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  emoji: { fontSize: 18 },
  time: { fontSize: 12, color: "#888", marginLeft: "auto" },
  alertDetail: { fontSize: 14, color: "#444" },
  dismissBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#aaa",
    cursor: "pointer",
    padding: "0 4px",
  },
};
