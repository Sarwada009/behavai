import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api/client";
import { analyticsApi } from "../api/analytics";
import { patientsApi, PatientSummary } from "../api/patients";
import { AlertPanel } from "../components/AlertPanel";
import { WebcamMonitor } from "../components/WebcamMonitor";
import { usePresenceStore } from "../store/presenceStore";

function scoreColor(s: number) {
  if (s >= 80) return "#c62828";
  if (s >= 60) return "#e65100";
  if (s >= 40) return "#f9a825";
  return "#4CAF50";
}

function ScoreArc({ score }: { score: number }) {
  const color = scoreColor(score);
  const r = 26, cx = 30, cy = 30;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <svg width={60} height={60}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eee" strokeWidth={5} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>
        {score}
      </text>
    </svg>
  );
}

function StatCard({ label, value, color = "#1a1a1a" }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function PatientMonitorTile({ patient }: { patient: PatientSummary }) {
  const score    = usePresenceStore((s) => s.scores[patient.id]);
  const presence = usePresenceStore((s) => s.presence[patient.id]);
  const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
  const isRecent = presence
    ? Date.now() - new Date(presence.timestamp).getTime() < 60_000
    : false;

  const currentScore = score ?? 0;

  return (
    <Link to={`/patients/${patient.id}`} style={{
      ...styles.monitorTile,
      borderTop: `4px solid ${scoreColor(currentScore)}`,
    }}>
      <div style={styles.tileHeader}>
        {photoUri ? (
          <img src={photoUri} alt="" style={styles.tileAvatar} />
        ) : (
          <div style={styles.tileAvatarPlaceholder}>
            <span style={styles.tileInitial}>{patient.name[0]}</span>
          </div>
        )}
        <div style={styles.tileMeta}>
          <span style={styles.tileName}>{patient.name}</span>
          <span style={styles.tileRoom}>Room {patient.room_number}</span>
          {isRecent && (
            <span style={styles.tileLocation}>
              📷 Seen in Room {presence!.room_number}
            </span>
          )}
        </div>
      </div>

      <div style={styles.tileScore}>
        <ScoreArc score={currentScore} />
        <span style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          {currentScore === 0 ? "No data" : "Agitation"}
        </span>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: analyticsApi.overview,
    refetchInterval: 30_000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsApi.list(),
  });

  return (
    <div style={styles.page}>
      <AlertPanel />

      <h2 style={styles.heading}>Live Ward Monitor</h2>

      <WebcamMonitor />

      {/* Summary stat strip */}
      {overview && (
        <div style={styles.statRow}>
          <StatCard label="Total Patients"         value={overview.total_patients} />
          <StatCard label="Incidents Today"        value={overview.incidents_today}       color="#e65100" />
          <StatCard label="This Week"              value={overview.incidents_this_week}   color="#e65100" />
          <StatCard label="Unacknowledged Alerts"  value={overview.unacknowledged_alerts} color="#c62828" />
          <StatCard label="High Agitation Now"     value={overview.high_agitation_now}   color="#c62828" />
        </div>
      )}

      {/* Live patient grid */}
      <div style={styles.grid}>
        {patients.map((p) => (
          <PatientMonitorTile key={p.id} patient={p} />
        ))}
      </div>

      {/* Top patients this week */}
      {overview?.top_patients.length ? (
        <div style={styles.topSection}>
          <h3 style={styles.sectionTitle}>Most Incidents This Week</h3>
          <div style={styles.topList}>
            {overview.top_patients.map((p, i) => (
              <Link key={p.patient_id} to={`/patients/${p.patient_id}`} style={styles.topItem}>
                <span style={styles.topRank}>#{i + 1}</span>
                <span style={styles.topName}>{p.name}</span>
                <span style={styles.topCount}>{p.incidents} incidents</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:    { padding: "0 32px 40px" },
  heading: { margin: "20px 0 12px", fontSize: 22, fontWeight: 800 },
  statRow: { display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    background: "#fff", borderRadius: 12, padding: "16px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)", minWidth: 130, flex: 1,
  },
  statValue: { fontSize: 32, fontWeight: 800 },
  statLabel: { fontSize: 12, color: "#888", marginTop: 4, fontWeight: 600 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 14,
    marginBottom: 28,
  },
  monitorTile: {
    background: "#fff", borderRadius: 12, padding: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    textDecoration: "none", color: "inherit",
    display: "flex", flexDirection: "column", gap: 12,
    transition: "box-shadow 0.2s",
  },
  tileHeader:          { display: "flex", alignItems: "center", gap: 10 },
  tileAvatar:          { width: 44, height: 44, borderRadius: 22, objectFit: "cover", flexShrink: 0 },
  tileAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22, background: "#4A90D9",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  tileInitial:   { color: "#fff", fontSize: 18, fontWeight: 700 },
  tileMeta:      { display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" },
  tileName:      { fontSize: 14, fontWeight: 700, color: "#1a1a1a" },
  tileRoom:      { fontSize: 12, color: "#666" },
  tileLocation:  { fontSize: 11, color: "#4CAF50", fontWeight: 600 },
  tileScore:     { display: "flex", flexDirection: "column", alignItems: "center" },
  topSection:    { marginTop: 8 },
  sectionTitle:  { fontSize: 16, fontWeight: 700, marginBottom: 10 },
  topList:       { display: "flex", flexDirection: "column", gap: 8 },
  topItem: {
    background: "#fff", borderRadius: 10, padding: "10px 16px",
    display: "flex", alignItems: "center", gap: 14,
    textDecoration: "none", color: "inherit",
    boxShadow: "0 1px 5px rgba(0,0,0,0.06)",
  },
  topRank:  { fontSize: 18, fontWeight: 800, color: "#4A90D9", width: 28 },
  topName:  { flex: 1, fontSize: 15, fontWeight: 600 },
  topCount: { fontSize: 13, color: "#e65100", fontWeight: 700 },
};
