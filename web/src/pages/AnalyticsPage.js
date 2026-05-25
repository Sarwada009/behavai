import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, } from "recharts";
import { analyticsApi } from "../api/analytics";
import { patientsApi } from "../api/patients";
const TYPE_COLORS = {
    outburst: "#c62828",
    predicted_outburst: "#e65100",
    agitation: "#f9a825",
    general: "#9e9e9e",
};
const TYPE_LABEL = {
    outburst: "Outburst",
    predicted_outburst: "Predicted",
    agitation: "Agitation",
    general: "General",
};
function formatTs(iso) {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
export function AnalyticsPage() {
    const [selectedId, setSelectedId] = useState("");
    const [trendHours, setTrendHours] = useState(24);
    const [reportDays, setReportDays] = useState(30);
    const { data: patients = [] } = useQuery({
        queryKey: ["patients"],
        queryFn: () => patientsApi.list(),
    });
    const { data: trend = [] } = useQuery({
        queryKey: ["trend", selectedId, trendHours],
        queryFn: () => analyticsApi.trend(selectedId, trendHours),
        enabled: !!selectedId,
    });
    const { data: breakdown = [] } = useQuery({
        queryKey: ["breakdown", selectedId, reportDays],
        queryFn: () => analyticsApi.breakdown(selectedId, reportDays),
        enabled: !!selectedId,
    });
    const reportUrl = selectedId
        ? `${analyticsApi.reportUrl(selectedId, reportDays)}&token=${localStorage.getItem("access_token") ?? ""}`
        : null;
    const trendData = trend.map((t) => ({ ...t, time: formatTs(t.timestamp) }));
    return (_jsxs("div", { style: styles.page, children: [_jsx("h2", { style: styles.heading, children: "Patient Analytics" }), _jsxs("div", { style: styles.controls, children: [_jsxs("select", { style: styles.select, value: selectedId, onChange: (e) => setSelectedId(e.target.value), children: [_jsx("option", { value: "", children: "Select a patient\u2026" }), patients.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " \u2014 Room ", p.room_number] }, p.id)))] }), _jsxs("select", { style: styles.select, value: trendHours, onChange: (e) => setTrendHours(+e.target.value), children: [_jsx("option", { value: 6, children: "Last 6 hours" }), _jsx("option", { value: 24, children: "Last 24 hours" }), _jsx("option", { value: 72, children: "Last 3 days" }), _jsx("option", { value: 168, children: "Last 7 days" })] }), _jsxs("select", { style: styles.select, value: reportDays, onChange: (e) => setReportDays(+e.target.value), children: [_jsx("option", { value: 7, children: "Report: 7 days" }), _jsx("option", { value: 30, children: "Report: 30 days" }), _jsx("option", { value: 90, children: "Report: 90 days" })] }), reportUrl && (_jsx("a", { href: reportUrl, target: "_blank", rel: "noreferrer", style: styles.pdfBtn, children: "\u2193 Download PDF Report" }))] }), !selectedId && (_jsx("p", { style: { color: "#aaa", textAlign: "center", marginTop: 60, fontSize: 16 }, children: "Select a patient to view their analytics." })), selectedId && (_jsxs("div", { style: styles.charts, children: [_jsxs("div", { style: styles.chartCard, children: [_jsx("h3", { style: styles.chartTitle, children: "Agitation Score Trend" }), trendData.length === 0 ? (_jsx("p", { style: styles.noData, children: "No score data in this window. Scores are recorded every minute while a patient is tracked." })) : (_jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(LineChart, { data: trendData, margin: { top: 8, right: 16, bottom: 8, left: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "time", tick: { fontSize: 11 }, interval: "preserveStartEnd" }), _jsx(YAxis, { domain: [0, 100], tick: { fontSize: 11 } }), _jsx(Tooltip, { formatter: (val) => [`${val} / 100`, "Agitation"], labelFormatter: (l) => `Time: ${l}` }), _jsx(ReferenceLine, { y: 80, stroke: "#c62828", strokeDasharray: "4 2", label: { value: "Outburst", fill: "#c62828", fontSize: 11 } }), _jsx(ReferenceLine, { y: 60, stroke: "#e65100", strokeDasharray: "4 2", label: { value: "Warning", fill: "#e65100", fontSize: 11 } }), _jsx(Line, { type: "monotone", dataKey: "score", stroke: "#4A90D9", strokeWidth: 2, dot: false, activeDot: { r: 4 } })] }) }))] }), _jsxs("div", { style: styles.chartCard, children: [_jsxs("h3", { style: styles.chartTitle, children: ["Incidents by Type (last ", reportDays, " days)"] }), breakdown.length === 0 ? (_jsx("p", { style: styles.noData, children: "No incidents recorded in this period." })) : (_jsxs(_Fragment, { children: [_jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(BarChart, { data: breakdown, margin: { top: 8, right: 16, bottom: 8, left: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "type", tickFormatter: (v) => TYPE_LABEL[v] ?? v, tick: { fontSize: 11 } }), _jsx(YAxis, { allowDecimals: false, tick: { fontSize: 11 } }), _jsx(Tooltip, { formatter: (val, name) => [val, name === "count" ? "Incidents" : "Avg Severity"], labelFormatter: (l) => TYPE_LABEL[l] ?? l }), _jsx(Bar, { dataKey: "count", radius: [4, 4, 0, 0], children: breakdown.map((b, i) => (_jsx("rect", { fill: TYPE_COLORS[b.type] ?? "#9e9e9e" }, i))) })] }) }), _jsx("div", { style: styles.legendRow, children: breakdown.map((b) => (_jsxs("div", { style: styles.legendItem, children: [_jsx("div", { style: { ...styles.legendDot, background: TYPE_COLORS[b.type] ?? "#9e9e9e" } }), _jsxs("span", { children: [TYPE_LABEL[b.type] ?? b.type, ": ", b.count, " (", b.avg_severity, " avg sev)"] })] }, b.type))) })] }))] })] }))] }));
}
const styles = {
    page: { padding: "24px 32px 40px" },
    heading: { margin: "0 0 20px", fontSize: 22, fontWeight: 800 },
    controls: { display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" },
    select: {
        border: "1px solid #ddd", borderRadius: 8, padding: "9px 14px",
        fontSize: 14, outline: "none", background: "#fff", cursor: "pointer",
    },
    pdfBtn: {
        background: "#4A90D9", color: "#fff", borderRadius: 8,
        padding: "9px 18px", fontSize: 14, fontWeight: 700,
        textDecoration: "none",
    },
    charts: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
    chartCard: {
        background: "#fff", borderRadius: 14, padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    },
    chartTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 700 },
    noData: { color: "#aaa", fontSize: 14, textAlign: "center", marginTop: 40 },
    legendRow: { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 },
    legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
};
