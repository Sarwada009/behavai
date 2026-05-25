import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useAlertStore } from "../store/alertStore";
function scoreColor(score) {
    if (score >= 80)
        return "#c62828";
    if (score >= 60)
        return "#e65100";
    return "#f9a825";
}
export function AlertPanel() {
    const { alerts, dismiss } = useAlertStore();
    const active = alerts.filter((a) => !a.dismissed);
    if (active.length === 0)
        return null;
    return (_jsxs("div", { style: styles.panel, children: [_jsx("div", { style: styles.header, children: _jsxs("span", { style: styles.headerText, children: ["Active Alerts (", active.length, ")"] }) }), active.map((a) => {
                const isOutburst = a.alert_type === "outburst";
                const color = isOutburst ? "#c62828" : "#e65100";
                const time = new Date(a.timestamp).toLocaleTimeString();
                return (_jsxs("div", { style: { ...styles.alert, borderLeftColor: color }, children: [_jsxs("div", { style: styles.alertBody, children: [_jsxs("div", { style: styles.alertTitle, children: [_jsx("span", { style: styles.emoji, children: isOutburst ? "🚨" : "⚠️" }), _jsx("strong", { style: { color }, children: isOutburst ? "Outburst Alert" : "Behaviour Warning" }), _jsx("span", { style: styles.time, children: time })] }), _jsxs("div", { style: styles.alertDetail, children: [a.patient_name, " \u00B7 Room ", a.room_number, " \u00B7", " ", _jsxs("span", { style: { color: scoreColor(a.agitation_score), fontWeight: 700 }, children: ["Score ", a.agitation_score, "/100"] })] })] }), _jsx("button", { style: styles.dismissBtn, onClick: () => dismiss(a.id), children: "\u2715" })] }, a.id));
            })] }));
}
const styles = {
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
