import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "../api/client";
import { historyApi, patientsApi } from "../api/patients";

const SEVERITY_COLOR: Record<number, string> = {
  1: "#4CAF50", 2: "#8BC34A", 3: "#FFC107", 4: "#FF9800", 5: "#F44336",
};
const TYPE_LABEL: Record<string, string> = {
  outburst: "Outburst", predicted_outburst: "Predicted", agitation: "Agitation", general: "General",
};

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.get(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", id, filterType],
    queryFn: () => historyApi.list(id!, { incident_type: filterType }),
    enabled: !!id,
  });

  const ackMutation = useMutation({
    mutationFn: (recordId: string) => historyApi.acknowledge(id!, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history", id] }),
  });

  if (!patient) return <p style={{ padding: 32 }}>Loading…</p>;

  const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  return (
    <div style={styles.page}>
      {/* Profile header */}
      <div style={styles.profileCard}>
        {photoUri ? (
          <img src={photoUri} alt="" style={styles.avatar} />
        ) : (
          <div style={styles.avatarPlaceholder}>
            <span style={styles.avatarInitial}>{patient.name[0]}</span>
          </div>
        )}
        <div>
          <h2 style={styles.name}>{patient.name}</h2>
          <p style={styles.sub}>Room {patient.room_number} · {age} years old</p>
          {patient.assigned_staff && (
            <p style={styles.staff}>Assigned: {patient.assigned_staff.name}</p>
          )}
        </div>
      </div>

      <div style={styles.cols}>
        {/* Left: Patient details */}
        <div style={styles.detailCol}>
          <Section title="Diagnosis">
            <p>{patient.diagnosis ?? "Not recorded"}</p>
          </Section>

          <Section title="Known Triggers">
            {patient.known_triggers.length > 0 ? (
              <div style={styles.tagRow}>
                {patient.known_triggers.map((t) => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
            ) : <p>None recorded</p>}
          </Section>

          <Section title="Medications">
            {patient.medications.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Dose</th>
                    <th style={styles.th}>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.medications.map((m, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{m.name}</td>
                      <td style={styles.td}>{m.dose}</td>
                      <td style={styles.td}>{m.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p>None recorded</p>}
          </Section>

          <Section title="Care Notes">
            <p style={{ whiteSpace: "pre-wrap" }}>{patient.care_notes ?? "None"}</p>
          </Section>
        </div>

        {/* Right: Health history */}
        <div style={styles.historyCol}>
          <div style={styles.historyHeader}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Health History</h3>
            <div style={styles.filterRow}>
              {[undefined, "outburst", "predicted_outburst", "agitation"].map((v) => (
                <button
                  key={String(v)}
                  style={{ ...styles.filterBtn, ...(filterType === v ? styles.filterBtnActive : {}) }}
                  onClick={() => setFilterType(v)}
                >
                  {v ? TYPE_LABEL[v] : "All"}
                </button>
              ))}
            </div>
          </div>

          {history.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center", marginTop: 40 }}>No incidents recorded.</p>
          ) : (
            <div style={styles.historyList}>
              {history.map((r) => (
                <div key={r.id} style={styles.record}>
                  <div style={{ ...styles.severityBar, background: SEVERITY_COLOR[r.severity] ?? "#999" }} />
                  <div style={styles.recordBody}>
                    <div style={styles.recordRow}>
                      <span style={styles.recordType}>{TYPE_LABEL[r.incident_type]}</span>
                      <span style={styles.recordDate}>
                        {format(new Date(r.occurred_at), "dd MMM yyyy, h:mm a")}
                      </span>
                    </div>
                    <span style={styles.recordSev}>Severity {r.severity}/5</span>
                    {r.agitation_score != null && (
                      <span style={styles.recordScore}> · AI Score: {r.agitation_score}</span>
                    )}
                    {r.notes && <p style={styles.recordNotes}>{r.notes}</p>}
                    {r.outcome && <p style={styles.recordOutcome}>Outcome: {r.outcome}</p>}
                    {!r.acknowledged_at ? (
                      <button
                        style={styles.ackBtn}
                        onClick={() => ackMutation.mutate(r.id)}
                        disabled={ackMutation.isPending}
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span style={styles.acked}>
                        Acknowledged {format(new Date(r.acknowledged_at), "h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>{title}</h4>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px 32px" },
  profileCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  avatar: { width: 80, height: 80, borderRadius: 40, objectFit: "cover" },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, background: "#4A90D9",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarInitial: { color: "#fff", fontSize: 30, fontWeight: 700 },
  name: { margin: 0, fontSize: 22, fontWeight: 800 },
  sub: { margin: "4px 0 0", color: "#666" },
  staff: { margin: "4px 0 0", color: "#4A90D9", fontSize: 14 },
  cols: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, alignItems: "start" },
  detailCol: { display: "flex", flexDirection: "column", gap: 14 },
  section: { background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 5px rgba(0,0,0,0.06)" },
  sectionTitle: { margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#4A90D9", textTransform: "uppercase" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  tag: { background: "#EBF3FC", color: "#4A90D9", borderRadius: 20, padding: "4px 12px", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "6px 8px", color: "#888", borderBottom: "1px solid #eee", fontWeight: 600 },
  td: { padding: "8px 8px", borderBottom: "1px solid #f4f4f4" },
  historyCol: { background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 5px rgba(0,0,0,0.06)" },
  historyHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  filterRow: { display: "flex", gap: 6 },
  filterBtn: {
    background: "#EBF3FC", color: "#4A90D9", border: "none", borderRadius: 20,
    padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  filterBtnActive: { background: "#4A90D9", color: "#fff" },
  historyList: { display: "flex", flexDirection: "column", gap: 10 },
  record: { display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0" },
  severityBar: { width: 6, flexShrink: 0 },
  recordBody: { flex: 1, padding: "10px 14px" },
  recordRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  recordType: { fontWeight: 700, fontSize: 14 },
  recordDate: { fontSize: 12, color: "#888" },
  recordSev: { fontSize: 13, color: "#555", marginTop: 2 },
  recordScore: { fontSize: 13, color: "#4A90D9" },
  recordNotes: { margin: "6px 0 0", fontSize: 13, color: "#444" },
  recordOutcome: { margin: "4px 0 0", fontSize: 13, color: "#666", fontStyle: "italic" },
  ackBtn: {
    marginTop: 8, background: "#4A90D9", color: "#fff", border: "none",
    borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  acked: { display: "inline-block", marginTop: 6, fontSize: 12, color: "#4CAF50" },
};
