import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
        mutationFn: ({ id, is_active }) => camerasApi.update(id, { is_active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cameras"] }),
    });
    const deleteMutation = useMutation({
        mutationFn: camerasApi.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cameras"] }),
    });
    // Group presence by room
    const presenceByRoom = {};
    Object.values(presence).forEach((p) => {
        const isRecent = Date.now() - new Date(p.timestamp).getTime() < 60000;
        if (!isRecent)
            return;
        if (!presenceByRoom[p.room_number])
            presenceByRoom[p.room_number] = [];
        presenceByRoom[p.room_number].push(p);
    });
    return (_jsxs("div", { style: styles.page, children: [_jsxs("div", { style: styles.header, children: [_jsx("h2", { style: styles.title, children: "Camera Management" }), _jsx("button", { style: styles.addBtn, onClick: () => setShowForm((v) => !v), children: showForm ? "Cancel" : "+ Add Camera" })] }), showForm && (_jsxs("form", { style: styles.form, onSubmit: (e) => {
                    e.preventDefault();
                    createMutation.mutate(form);
                }, children: [_jsx("input", { style: styles.input, placeholder: "Camera name (e.g. Room 12 North)", value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), required: true }), _jsx("input", { style: styles.input, placeholder: "Room number", value: form.room_number, onChange: (e) => setForm((f) => ({ ...f, room_number: e.target.value })), required: true }), _jsx("input", { style: styles.input, placeholder: "RTSP URL (rtsp://...)", value: form.rtsp_url, onChange: (e) => setForm((f) => ({ ...f, rtsp_url: e.target.value })), required: true }), _jsx("button", { style: styles.saveBtn, type: "submit", disabled: createMutation.isPending, children: createMutation.isPending ? "Saving…" : "Save Camera" })] })), isLoading ? (_jsx("p", { style: { color: "#888" }, children: "Loading\u2026" })) : (_jsxs("table", { style: styles.table, children: [_jsx("thead", { children: _jsx("tr", { children: ["Name", "Room", "RTSP URL", "Status", "Now Visible", "Actions"].map((h) => (_jsx("th", { style: styles.th, children: h }, h))) }) }), _jsx("tbody", { children: cameras.map((cam) => {
                            const visible = presenceByRoom[cam.room_number] ?? [];
                            return (_jsxs("tr", { children: [_jsx("td", { style: styles.td, children: cam.name }), _jsx("td", { style: styles.td, children: cam.room_number }), _jsx("td", { style: { ...styles.td, fontFamily: "monospace", fontSize: 12, color: "#666" }, children: cam.rtsp_url }), _jsx("td", { style: styles.td, children: _jsx(StatusBadge, { active: cam.is_active }) }), _jsx("td", { style: styles.td, children: visible.length > 0 ? (_jsx("span", { style: styles.visibleNames, children: visible.map((v) => v.patient_name).join(", ") })) : (_jsx("span", { style: { color: "#bbb" }, children: "\u2014" })) }), _jsxs("td", { style: styles.td, children: [_jsx("button", { style: styles.toggleBtn, onClick: () => toggleMutation.mutate({ id: cam.id, is_active: !cam.is_active }), children: cam.is_active ? "Disable" : "Enable" }), _jsx("button", { style: styles.deleteBtn, onClick: () => {
                                                    if (confirm(`Delete camera "${cam.name}"?`))
                                                        deleteMutation.mutate(cam.id);
                                                }, children: "Delete" })] })] }, cam.id));
                        }) })] }))] }));
}
function StatusBadge({ active }) {
    return (_jsx("span", { style: {
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: active ? "#e8f5e9" : "#fbe9e7",
            color: active ? "#388e3c" : "#d84315",
        }, children: active ? "Active" : "Disabled" }));
}
const styles = {
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
