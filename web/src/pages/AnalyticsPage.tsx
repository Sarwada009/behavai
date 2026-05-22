import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";
import { analyticsApi } from "../api/analytics";
import { patientsApi } from "../api/patients";

const TYPE_COLORS: Record<string, string> = {
  outburst:           "#c62828",
  predicted_outburst: "#e65100",
  agitation:          "#f9a825",
  general:            "#9e9e9e",
};

const TYPE_LABEL: Record<string, string> = {
  outburst:           "Outburst",
  predicted_outburst: "Predicted",
  agitation:          "Agitation",
  general:            "General",
};

function formatTs(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function AnalyticsPage() {
  const [selectedId, setSelectedId] = useState<string>("");
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

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Patient Analytics</h2>

      {/* Patient selector */}
      <div style={styles.controls}>
        <select
          style={styles.select}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — Room {p.room_number}
            </option>
          ))}
        </select>

        <select style={styles.select} value={trendHours} onChange={(e) => setTrendHours(+e.target.value)}>
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={72}>Last 3 days</option>
          <option value={168}>Last 7 days</option>
        </select>

        <select style={styles.select} value={reportDays} onChange={(e) => setReportDays(+e.target.value)}>
          <option value={7}>Report: 7 days</option>
          <option value={30}>Report: 30 days</option>
          <option value={90}>Report: 90 days</option>
        </select>

        {reportUrl && (
          <a href={reportUrl} target="_blank" rel="noreferrer" style={styles.pdfBtn}>
            ↓ Download PDF Report
          </a>
        )}
      </div>

      {!selectedId && (
        <p style={{ color: "#aaa", textAlign: "center", marginTop: 60, fontSize: 16 }}>
          Select a patient to view their analytics.
        </p>
      )}

      {selectedId && (
        <div style={styles.charts}>
          {/* Agitation trend line chart */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Agitation Score Trend</h3>
            {trendData.length === 0 ? (
              <p style={styles.noData}>No score data in this window. Scores are recorded every minute while a patient is tracked.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: number) => [`${val} / 100`, "Agitation"]}
                    labelFormatter={(l) => `Time: ${l}`}
                  />
                  <ReferenceLine y={80} stroke="#c62828" strokeDasharray="4 2" label={{ value: "Outburst", fill: "#c62828", fontSize: 11 }} />
                  <ReferenceLine y={60} stroke="#e65100" strokeDasharray="4 2" label={{ value: "Warning", fill: "#e65100", fontSize: 11 }} />
                  <Line
                    type="monotone" dataKey="score"
                    stroke="#4A90D9" strokeWidth={2}
                    dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Incident breakdown bar chart */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Incidents by Type (last {reportDays} days)</h3>
            {breakdown.length === 0 ? (
              <p style={styles.noData}>No incidents recorded in this period.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={breakdown} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="type" tickFormatter={(v) => TYPE_LABEL[v] ?? v} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val, name) => [val, name === "count" ? "Incidents" : "Avg Severity"]}
                      labelFormatter={(l) => TYPE_LABEL[l] ?? l}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {breakdown.map((b, i) => (
                        <rect key={i} fill={TYPE_COLORS[b.type] ?? "#9e9e9e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={styles.legendRow}>
                  {breakdown.map((b) => (
                    <div key={b.type} style={styles.legendItem}>
                      <div style={{ ...styles.legendDot, background: TYPE_COLORS[b.type] ?? "#9e9e9e" }} />
                      <span>{TYPE_LABEL[b.type] ?? b.type}: {b.count} ({b.avg_severity} avg sev)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:       { padding: "24px 32px 40px" },
  heading:    { margin: "0 0 20px", fontSize: 22, fontWeight: 800 },
  controls:   { display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" },
  select: {
    border: "1px solid #ddd", borderRadius: 8, padding: "9px 14px",
    fontSize: 14, outline: "none", background: "#fff", cursor: "pointer",
  },
  pdfBtn: {
    background: "#4A90D9", color: "#fff", borderRadius: 8,
    padding: "9px 18px", fontSize: 14, fontWeight: 700,
    textDecoration: "none",
  },
  charts:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  chartCard: {
    background: "#fff", borderRadius: 14, padding: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  chartTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 700 },
  noData:     { color: "#aaa", fontSize: 14, textAlign: "center", marginTop: 40 },
  legendRow:  { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
};
