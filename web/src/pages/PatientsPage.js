import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api/client";
import { patientsApi } from "../api/patients";
import { AlertPanel } from "../components/AlertPanel";
import { usePresenceStore } from "../store/presenceStore";
function scoreColor(score) {
    if (score >= 80)
        return "#c62828";
    if (score >= 60)
        return "#e65100";
    if (score >= 40)
        return "#f9a825";
    return "#4CAF50";
}
function AddPatientModal({ onClose }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({ name: "", room_number: "", diagnosis: "", medications: "", triggers: "", care_notes: "" });
    const [photo, setPhoto] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef(null);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.room_number) {
            setError("Name and room number are required.");
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
            if (photo)
                fd.append("photo", photo);
            await patientsApi.create(fd);
            qc.invalidateQueries({ queryKey: ["patients"] });
            onClose();
        }
        catch {
            setError("Failed to save patient.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx("div", { style: modal.overlay, children: _jsxs("form", { onSubmit: handleSubmit, style: modal.card, children: [_jsx("h3", { style: { margin: "0 0 16px" }, children: "Add Patient" }), error && _jsx("p", { style: { color: "#e53935", marginBottom: 12 }, children: error }), ["name", "room_number", "diagnosis", "medications", "triggers"].map((k) => (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: modal.label, children: k.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) }), _jsx("input", { style: modal.input, value: form[k], onChange: set(k) })] }, k))), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: modal.label, children: "Care Notes" }), _jsx("textarea", { style: { ...modal.input, height: 64, resize: "none" }, value: form.care_notes, onChange: set("care_notes") })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: modal.label, children: "Photo" }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: (e) => setPhoto(e.target.files?.[0] ?? null) }), _jsx("button", { type: "button", style: modal.photoBtn, onClick: () => fileRef.current?.click(), children: photo ? photo.name : "Choose photo…" })] }), _jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [_jsx("button", { type: "button", onClick: onClose, style: modal.cancelBtn, children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, style: modal.saveBtn, children: saving ? "Saving…" : "Save" })] })] }) }));
}
export function PatientsPage() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const { data = [], isLoading } = useQuery({
        queryKey: ["patients", search],
        queryFn: () => patientsApi.list(search || undefined),
    });
    return (_jsxs("div", { style: styles.page, children: [_jsx(AlertPanel, {}), showAdd && _jsx(AddPatientModal, { onClose: () => setShowAdd(false) }), _jsxs("div", { style: styles.header, children: [_jsx("h2", { style: styles.title, children: "Patients" }), _jsx("input", { style: styles.search, placeholder: "Search by name\u2026", value: search, onChange: (e) => setSearch(e.target.value) }), _jsx("button", { style: styles.addBtn, onClick: () => setShowAdd(true), children: "+ Add Patient" })] }), isLoading ? (_jsx("p", { style: { color: "#888" }, children: "Loading\u2026" })) : (_jsxs("div", { style: styles.grid, children: [data.map((p) => (_jsx(PatientTile, { patient: p }, p.id))), data.length === 0 && _jsx("p", { style: { color: "#aaa" }, children: "No patients found." })] }))] }));
}
function PatientTile({ patient }) {
    const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
    const score = usePresenceStore((s) => s.scores[patient.id]);
    return (_jsxs(Link, { to: `/patients/${patient.id}`, style: styles.tile, children: [_jsx("div", { style: { position: "relative" }, children: photoUri ? (_jsx("img", { src: photoUri, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.avatarPlaceholder, children: _jsx("span", { style: styles.avatarInitial, children: patient.name[0] }) })) }), _jsxs("div", { style: styles.tileInfo, children: [_jsx("span", { style: styles.tileName, children: patient.name }), _jsxs("span", { style: styles.tileRoom, children: ["Room ", patient.room_number] }), patient.diagnosis && (_jsx("span", { style: styles.tileDiag, children: patient.diagnosis })), score != null && (_jsxs("span", { style: { fontSize: 12, fontWeight: 700, color: scoreColor(score), marginTop: 4 }, children: ["Score ", score, "/100"] }))] }), score != null && (_jsx("div", { style: {
                    width: 36, height: 36, borderRadius: 18,
                    border: `3px solid ${scoreColor(score)}`,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    marginLeft: 4, flexShrink: 0,
                }, children: _jsx("span", { style: { fontSize: 12, fontWeight: 800, color: scoreColor(score) }, children: score }) }))] }));
}
const styles = {
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
};
const modal = {
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
