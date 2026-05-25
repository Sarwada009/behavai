import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { camerasApi } from "../api/cameras";
import { usePresenceStore } from "../store/presenceStore";

export function CamerasPage() {
  const queryClient = useQueryClient();
  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ["cameras"],
    queryFn: camerasApi.list,
  });

  const presence = usePresenceStore((s) => s.presence);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", room_number: "", rtsp_url: "", is_active: true });

  const createMutation = useMutation({
    mutationFn: camerasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      setShowForm(false);
      setForm({ name: "", room_number: "", rtsp_url: "", is_active: true });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      camerasApi.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cameras"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: camerasApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cameras"] }),
  });

  // Group presence by room
  const presenceByRoom: Record<string, typeof presence[string][]> = {};
  Object.values(presence).forEach((p) => {
    const isRecent = Date.now() - new Date(p.timestamp).getTime() < 60_000;
    if (!isRecent) return;
    if (!presenceByRoom[p.room_number]) presenceByRoom[p.room_number] = [];
    presenceByRoom[p.room_number].push(p);
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Camera Management</h2>
        <button style={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Camera"}
        </button>
      </div>

      {showForm && (
        <form
          style={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
        >
          <input
            style={styles.input}
            placeholder="Camera name (e.g. Room 12 North)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            style={styles.input}
            placeholder="Room number"
            value={form.room_number}
            onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
            required
          />
          <input
            style={styles.input}
            placeholder="RTSP URL (rtsp://...)"
            value={form.rtsp_url}
            onChange={(e) => setForm((f) => ({ ...f, rtsp_url: e.target.value }))}
            required
          />
          <button style={styles.saveBtn} type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving…" : "Save Camera"}
          </button>
        </form>
      )}

      {isLoading ? (
        <p style={{ color: "#888" }}>Loading…</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {["Name", "Room", "RTSP URL", "Status", "Now Visible", "Actions"].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cameras.map((cam) => {
              const visible = presenceByRoom[cam.room_number] ?? [];
              return (
                <tr key={cam.id}>
                  <td style={styles.td}>{cam.name}</td>
                  <td style={styles.td}>{cam.room_number}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12, color: "#666" }}>
                    {cam.rtsp_url}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge active={cam.is_active} />
                  </td>
                  <td style={styles.td}>
                    {visible.length > 0 ? (
                      <span style={styles.visibleNames}>
                        {visible.map((v) => v.patient_name).join(", ")}
                      </span>
                    ) : (
                      <span style={{ color: "#bbb" }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.toggleBtn}
                      onClick={() => toggleMutation.mutate({ id: cam.id, is_active: !cam.is_active })}
                    >
                      {cam.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => {
                        if (confirm(`Delete camera "${cam.name}"?`)) deleteMutation.mutate(cam.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        background: active ? "#e8f5e9" : "#fbe9e7",
        color: active ? "#388e3c" : "#d84315",
      }}
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { margin: 0, fontSize: 22 },
  addBtn: {
    background: "#4A90D9", color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  form: {
    background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20,
    display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  input: {
    border: "1px solid #ddd", borderRadius: 8, padding: "9px 14px",
    fontSize: 14, outline: "none", minWidth: 180,
  },
  saveBtn: {
    background: "#4CAF50", color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "2px solid #f0f0f0" },
  td: { padding: "12px 16px", fontSize: 14, borderBottom: "1px solid #f8f8f8" },
  visibleNames: { color: "#4CAF50", fontWeight: 600, fontSize: 13 },
  toggleBtn: {
    background: "#EBF3FC", color: "#4A90D9", border: "none", borderRadius: 6,
    padding: "5px 12px", fontSize: 13, cursor: "pointer", marginRight: 8,
  },
  deleteBtn: {
    background: "#fbe9e7", color: "#d84315", border: "none", borderRadius: 6,
    padding: "5px 12px", fontSize: 13, cursor: "pointer",
  },
};
