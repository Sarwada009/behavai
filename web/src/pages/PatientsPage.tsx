import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { API_BASE } from "../api/client";
import { patientsApi, PatientSummary } from "../api/patients";
import { AlertPanel } from "../components/AlertPanel";
import { usePresenceStore } from "../store/presenceStore";

function scoreColor(score: number): string {
  if (score >= 80) return "#c62828";
  if (score >= 60) return "#e65100";
  if (score >= 40) return "#f9a825";
  return "#4CAF50";
}

function AddPatientModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", room_number: "", diagnosis: "", medications: "", triggers: "", care_notes: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.room_number) { setError("Name and room number are required."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (photo) fd.append("photo", photo);
      await patientsApi.create(fd);
      qc.invalidateQueries({ queryKey: ["patients"] });
      onClose();
    } catch {
      setError("Failed to save patient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modal.overlay}>
      <form onSubmit={handleSubmit} style={modal.card}>
        <h3 style={{ margin: "0 0 16px" }}>Add Patient</h3>
        {error && <p style={{ color: "#e53935", marginBottom: 12 }}>{error}</p>}
        {(["name", "room_number", "diagnosis", "medications", "triggers"] as const).map((k) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={modal.label}>{k.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</label>
            <input style={modal.input} value={(form as any)[k]} onChange={set(k)} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={modal.label}>Care Notes</label>
          <textarea style={{ ...modal.input, height: 64, resize: "none" }} value={form.care_notes} onChange={set("care_notes")} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={modal.label}>Photo</label>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          <button type="button" style={modal.photoBtn} onClick={() => fileRef.current?.click()}>
            {photo ? photo.name : "Choose photo…"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={modal.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={modal.saveBtn}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

function EditPatientModal({ patient, onClose }: { patient: PatientSummary; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: patient.name,
    room_number: patient.room_number,
    diagnosis: patient.diagnosis || "",
    medications: "",
    triggers: "",
    care_notes: patient.care_notes || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.room_number) { setError("Name and room number are required."); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (form.name !== patient.name) payload.name = form.name;
      if (form.room_number !== patient.room_number) payload.room_number = form.room_number;
      if (form.diagnosis !== (patient.diagnosis || "")) payload.diagnosis = form.diagnosis || null;
      if (form.care_notes !== (patient.care_notes || "")) payload.care_notes = form.care_notes || null;
      if (form.medications) payload.medications = form.medications;
      if (form.triggers) payload.triggers = form.triggers;

      await client.patch(`/patients/${patient.id}`, payload);
      qc.invalidateQueries({ queryKey: ["patients"] });
      onClose();
    } catch {
      setError("Failed to update patient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modal.overlay}>
      <form onSubmit={handleSubmit} style={modal.card}>
        <h3 style={{ margin: "0 0 16px" }}>Edit Patient</h3>
        {error && <p style={{ color: "#e53935", marginBottom: 12 }}>{error}</p>}
        {(["name", "room_number", "diagnosis", "medications", "triggers"] as const).map((k) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={modal.label}>{k.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</label>
            <input style={modal.input} value={(form as any)[k]} onChange={set(k)} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={modal.label}>Care Notes</label>
          <textarea style={{ ...modal.input, height: 64, resize: "none" }} value={form.care_notes} onChange={set("care_notes")} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={modal.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={modal.saveBtn}>{saving ? "Saving…" : "Update"}</button>
        </div>
      </form>
    </div>
  );
}

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => patientsApi.list(search || undefined),
  });

  const [editingPatient, setEditingPatient] = useState<PatientSummary | null>(null);

  return (
    <div style={styles.page}>
      <AlertPanel />
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} />}
      {editingPatient && <EditPatientModal patient={editingPatient} onClose={() => setEditingPatient(null)} />}
      <div style={styles.header}>
        <h2 style={styles.title}>Patients</h2>
        <input
          style={styles.search}
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={styles.addBtn} onClick={() => setShowAdd(true)}>+ Add Patient</button>
      </div>

      {isLoading ? (
        <p style={{ color: "#888" }}>Loading…</p>
      ) : (
        <div style={styles.grid}>
          {data.map((p) => (
            <PatientTile key={p.id} patient={p} onEdit={() => setEditingPatient(p)} />
          ))}
          {data.length === 0 && <p style={{ color: "#aaa" }}>No patients found.</p>}
        </div>
      )}
    </div>
  );
}

function PatientTile({ patient, onEdit }: { patient: PatientSummary; onEdit: () => void }) {
  const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
  const score    = usePresenceStore((s) => s.scores[patient.id]);
  const qc = useQueryClient();
  const [deleteError, setDeleteError] = useState("");
  const deleteMutation = useMutation({
    mutationFn: () => client.delete(`/patients/${patient.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || error.message || "Failed to delete patient";
      setDeleteError(msg);
      console.error("Delete failed:", error);
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteError("");
    if (confirm(`Delete patient "${patient.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <Link to={`/patients/${patient.id}`} style={styles.tile}>
        <div style={{ position: "relative" }}>
          {photoUri ? (
            <img src={photoUri} alt="" style={styles.avatar} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              <span style={styles.avatarInitial}>{patient.name[0]}</span>
            </div>
          )}
        </div>
        <div style={styles.tileInfo}>
          <span style={styles.tileName}>{patient.name}</span>
          <span style={styles.tileRoom}>Room {patient.room_number}</span>
          {patient.diagnosis && (
            <span style={styles.tileDiag}>{patient.diagnosis}</span>
          )}
          {score != null && (
            <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(score), marginTop: 4 }}>
              Score {score}/100
            </span>
          )}
          {deleteError && (
            <span style={{ fontSize: 11, color: "#e53935", marginTop: 4 }}>{deleteError}</span>
          )}
        </div>
        {score != null && (
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            border: `3px solid ${scoreColor(score)}`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            marginLeft: 4, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(score) }}>{score}</span>
          </div>
        )}
      </Link>
      <button
        onClick={onEdit}
        style={styles.editBtn}
        title="Edit patient"
      >
        ✎
      </button>
      <button
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        style={{...styles.deleteBtn, opacity: deleteMutation.isPending ? 0.6 : 1}}
        title="Delete patient"
      >
        {deleteMutation.isPending ? "…" : "✕"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  title: { margin: 0, fontSize: 22, color: "#1a1a1a" },
  search: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    width: 240,
    outline: "none",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  tile: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.2s",
  },
  avatar: { width: 52, height: 52, borderRadius: 26, objectFit: "cover" },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    background: "#4A90D9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitial: { color: "#fff", fontSize: 20, fontWeight: 700 },
  tileInfo: { display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" },
  tileName: { fontWeight: 700, fontSize: 15, color: "#1a1a1a" },
  tileRoom: { fontSize: 13, color: "#666" },
  tileDiag: { fontSize: 12, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  addBtn: {
    marginLeft: "auto", background: "#4A90D9", color: "#fff", border: "none",
    borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  editBtn: {
    position: "absolute", top: 8, right: 40,
    width: 28, height: 28, borderRadius: 14,
    background: "#4A90D9", color: "#fff", border: "none",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10,
  } as React.CSSProperties,
  deleteBtn: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    background: "#e53935", color: "#fff", border: "none",
    fontSize: 16, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10,
  } as React.CSSProperties,
};

const modal: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  card: {
    background: "#fff", borderRadius: 14, padding: 28, width: 440,
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4, textTransform: "uppercase" },
  input: { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 14, boxSizing: "border-box" },
  photoBtn: { background: "#f4f7fb", border: "1px solid #ddd", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 },
  cancelBtn: { background: "#eee", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 14 },
  saveBtn: { background: "#4A90D9", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 14, fontWeight: 700 },
};
