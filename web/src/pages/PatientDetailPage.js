import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "../api/client";
import { historyApi, patientsApi } from "../api/patients";
const SEVERITY_COLOR = {
    1: "#4CAF50", 2: "#8BC34A", 3: "#FFC107", 4: "#FF9800", 5: "#F44336",
};
const TYPE_LABEL = {
    outburst: "Outburst", predicted_outburst: "Predicted", agitation: "Agitation", general: "General",
};
export function PatientDetailPage() {
    const { id } = useParams();
    const [filterType, setFilterType] = useState(undefined);
    const queryClient = useQueryClient();
    const { data: patient } = useQuery({
        queryKey: ["patient", id],
        queryFn: () => patientsApi.get(id),
        enabled: !!id,
    });
    const { data: history = [] } = useQuery({
        queryKey: ["history", id, filterType],
        queryFn: () => historyApi.list(id, { incident_type: filterType }),
        enabled: !!id,
    });
    const ackMutation = useMutation({
        mutationFn: (recordId) => historyApi.acknowledge(id, recordId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history", id] }),
    });
    if (!patient)
        return _jsx("p", { style: { padding: 32 }, children: "Loading\u2026" });
    const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
    const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
    return (_jsxs("div", { style: styles.page, children: [_jsxs("div", { style: styles.profileCard, children: [photoUri ? (_jsx("img", { src: photoUri, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.avatarPlaceholder, children: _jsx("span", { style: styles.avatarInitial, children: patient.name[0] }) })), _jsxs("div", { children: [_jsx("h2", { style: styles.name, children: patient.name }), _jsxs("p", { style: styles.sub, children: ["Room ", patient.room_number, " \u00B7 ", age, " years old"] }), patient.assigned_staff && (_jsxs("p", { style: styles.staff, children: ["Assigned: ", patient.assigned_staff.name] }))] })] }), _jsxs("div", { style: styles.cols, children: [_jsxs("div", { style: styles.detailCol, children: [_jsx(Section, { title: "Diagnosis", children: _jsx("p", { children: patient.diagnosis ?? "Not recorded" }) }), _jsx(Section, { title: "Known Triggers", children: patient.known_triggers.length > 0 ? (_jsx("div", { style: styles.tagRow, children: patient.known_triggers.map((t) => (_jsx("span", { style: styles.tag, children: t }, t))) })) : _jsx("p", { children: "None recorded" }) }), _jsx(Section, { title: "Medications", children: patient.medications.length > 0 ? (_jsxs("table", { style: styles.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: styles.th, children: "Name" }), _jsx("th", { style: styles.th, children: "Dose" }), _jsx("th", { style: styles.th, children: "Frequency" })] }) }), _jsx("tbody", { children: patient.medications.map((m, i) => (_jsxs("tr", { children: [_jsx("td", { style: styles.td, children: m.name }), _jsx("td", { style: styles.td, children: m.dose }), _jsx("td", { style: styles.td, children: m.frequency })] }, i))) })] })) : _jsx("p", { children: "None recorded" }) }), _jsx(Section, { title: "Care Notes", children: _jsx("p", { style: { whiteSpace: "pre-wrap" }, children: patient.care_notes ?? "None" }) })] }), _jsxs("div", { style: styles.historyCol, children: [_jsxs("div", { style: styles.historyHeader, children: [_jsx("h3", { style: { margin: 0, fontSize: 17 }, children: "Health History" }), _jsx("div", { style: styles.filterRow, children: [undefined, "outburst", "predicted_outburst", "agitation"].map((v) => (_jsx("button", { style: { ...styles.filterBtn, ...(filterType === v ? styles.filterBtnActive : {}) }, onClick: () => setFilterType(v), children: v ? TYPE_LABEL[v] : "All" }, String(v)))) })] }), history.length === 0 ? (_jsx("p", { style: { color: "#aaa", textAlign: "center", marginTop: 40 }, children: "No incidents recorded." })) : (_jsx("div", { style: styles.historyList, children: history.map((r) => (_jsxs("div", { style: styles.record, children: [_jsx("div", { style: { ...styles.severityBar, background: SEVERITY_COLOR[r.severity] ?? "#999" } }), _jsxs("div", { style: styles.recordBody, children: [_jsxs("div", { style: styles.recordRow, children: [_jsx("span", { style: styles.recordType, children: TYPE_LABEL[r.incident_type] }), _jsx("span", { style: styles.recordDate, children: format(new Date(r.occurred_at), "dd MMM yyyy, h:mm a") })] }), _jsxs("span", { style: styles.recordSev, children: ["Severity ", r.severity, "/5"] }), r.agitation_score != null && (_jsxs("span", { style: styles.recordScore, children: [" \u00B7 AI Score: ", r.agitation_score] })), r.notes && _jsx("p", { style: styles.recordNotes, children: r.notes }), r.outcome && _jsxs("p", { style: styles.recordOutcome, children: ["Outcome: ", r.outcome] }), !r.acknowledged_at ? (_jsx("button", { style: styles.ackBtn, onClick: () => ackMutation.mutate(r.id), disabled: ackMutation.isPending, children: "Acknowledge" })) : (_jsxs("span", { style: styles.acked, children: ["Acknowledged ", format(new Date(r.acknowledged_at), "h:mm a")] }))] })] }, r.id))) }))] })] })] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { style: styles.section, children: [_jsx("h4", { style: styles.sectionTitle, children: title }), children] }));
}
const styles = {
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
