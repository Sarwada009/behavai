import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import client from "../api/client";
const CAPTURE_INTERVAL_MS = 3000;
function scoreColor(score) {
    if (score >= 80)
        return "#c62828";
    if (score >= 60)
        return "#e65100";
    if (score >= 40)
        return "#f9a825";
    return "#4CAF50";
}
export function WebcamMonitor() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const [active, setActive] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const sendingRef = useRef(false);
    const stopCamera = useCallback(() => {
        if (timerRef.current)
            clearInterval(timerRef.current);
        if (streamRef.current)
            streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        timerRef.current = null;
        setActive(false);
        setResult(null);
    }, []);
    const captureAndSend = useCallback(async () => {
        if (!videoRef.current || sendingRef.current)
            return;
        const video = videoRef.current;
        if (video.readyState < 2)
            return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.7));
        if (!blob)
            return;
        const form = new FormData();
        form.append("file", blob, "frame.jpg");
        sendingRef.current = true;
        try {
            const { data } = await client.post("/stream/frame", form);
            setResult(data);
        }
        catch {
            // silently skip on network error — next frame will retry
        }
        finally {
            sendingRef.current = false;
        }
    }, []);
    const startCamera = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
            });
            streamRef.current = stream;
            if (videoRef.current)
                videoRef.current.srcObject = stream;
            setActive(true);
        }
        catch (e) {
            setError(e?.message ?? "Camera access denied. Allow camera in your browser settings.");
        }
    }, []);
    // Start/stop interval when active changes
    useEffect(() => {
        if (!active)
            return;
        timerRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
        return () => { if (timerRef.current)
            clearInterval(timerRef.current); };
    }, [active, captureAndSend]);
    useEffect(() => () => stopCamera(), [stopCamera]);
    const isAlert = result?.alert_type != null;
    return (_jsxs("div", { style: styles.card, children: [_jsxs("div", { style: styles.header, children: [_jsx("span", { style: styles.title, children: "Built-in Camera Monitor" }), _jsx("button", { style: { ...styles.toggleBtn, background: active ? "#e53935" : "#4A90D9" }, onClick: active ? stopCamera : startCamera, children: active ? "Stop Camera" : "Start Camera" })] }), error && _jsx("p", { style: styles.error, children: error }), _jsxs("div", { style: styles.body, children: [_jsxs("div", { style: styles.videoWrap, children: [_jsx("video", { ref: videoRef, autoPlay: true, muted: true, playsInline: true, style: { ...styles.video, display: active ? "block" : "none" } }), !active && (_jsxs("div", { style: styles.placeholder, children: [_jsx("span", { style: { fontSize: 40 }, children: "\uD83D\uDCF7" }), _jsx("span", { style: { color: "#aaa", marginTop: 8 }, children: "Camera off" })] })), active && (_jsx("div", { style: styles.scanBadge, children: "Analysing\u2026" }))] }), _jsxs("div", { style: styles.results, children: [!active && !result && (_jsx("p", { style: styles.hint, children: "Start the camera to identify patients and monitor agitation in real time. Point the camera at the patient \u2014 analysis runs every 3 seconds." })), active && !result && (_jsx("p", { style: styles.hint, children: "Waiting for first frame\u2026" })), result && (_jsxs(_Fragment, { children: [isAlert && (_jsxs("div", { style: {
                                            ...styles.alertBanner,
                                            background: result.alert_type === "outburst" ? "#c62828" : "#e65100",
                                        }, children: [_jsx("span", { style: styles.alertIcon, children: result.alert_type === "outburst" ? "🚨" : "⚠️" }), _jsxs("div", { children: [_jsx("div", { style: styles.alertTitle, children: result.alert_type === "outburst" ? "Outburst Alert" : "Behaviour Warning" }), _jsx("div", { style: styles.alertSub, children: "Alert recorded and staff notified" })] })] })), _jsxs("div", { style: styles.infoBlock, children: [_jsx(Label, { children: "Patient" }), _jsx(Value, { children: result.patient_name ?? (result.face_detected ? "Unrecognised" : "No face detected") })] }), result.room_number && (_jsxs("div", { style: styles.infoBlock, children: [_jsx(Label, { children: "Room" }), _jsx(Value, { children: result.room_number })] })), result.confidence > 0 && (_jsxs("div", { style: styles.infoBlock, children: [_jsx(Label, { children: "Match confidence" }), _jsxs(Value, { children: [Math.round(result.confidence * 100), "%"] })] })), result.emotion && (_jsxs("div", { style: styles.infoBlock, children: [_jsx(Label, { children: "Emotion" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs(Value, { children: [result.emotion === "Anger" ? "😠" :
                                                                result.emotion === "Fear" ? "😨" :
                                                                    result.emotion === "Happiness" ? "😊" :
                                                                        result.emotion === "Surprise" ? "😲" :
                                                                            result.emotion === "Sadness" ? "😢" :
                                                                                result.emotion === "Disgust" ? "🤢" :
                                                                                    result.emotion === "Contempt" ? "😤" : "😐", " ", result.emotion] }), _jsx("span", { style: {
                                                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                                                            background: result.emotion_multiplier >= 1.3 ? "#fde8e8" :
                                                                result.emotion_multiplier <= 0.4 ? "#e8f5e9" : "#f5f5f5",
                                                            color: result.emotion_multiplier >= 1.3 ? "#c62828" :
                                                                result.emotion_multiplier <= 0.4 ? "#2e7d32" : "#666",
                                                        }, children: result.emotion_multiplier >= 1.3 ? `+${Math.round((result.emotion_multiplier - 1) * 100)}% score` :
                                                            result.emotion_multiplier <= 0.4 ? `−${Math.round((1 - result.emotion_multiplier) * 100)}% score` :
                                                                "no adjustment" })] })] })), result.agitation_score != null && (_jsxs("div", { style: styles.infoBlock, children: [_jsx(Label, { children: "Agitation score" }), _jsxs("div", { style: styles.scoreRow, children: [_jsx("div", { style: styles.scoreBar, children: _jsx("div", { style: {
                                                                height: "100%",
                                                                width: `${result.agitation_score}%`,
                                                                background: scoreColor(result.agitation_score),
                                                                borderRadius: 4,
                                                                transition: "width 0.4s ease",
                                                            } }) }), _jsxs("span", { style: { ...styles.scoreNum, color: scoreColor(result.agitation_score) }, children: [result.agitation_score, "/100"] })] }), _jsxs("div", { style: styles.thresholdLabels, children: [_jsx("span", { children: "Safe" }), _jsx("span", { style: { color: "#f9a825" }, children: "Agitated (40)" }), _jsx("span", { style: { color: "#e65100" }, children: "Warning (60)" }), _jsx("span", { style: { color: "#c62828" }, children: "Outburst (80)" })] })] }))] }))] })] })] }));
}
function Label({ children }) {
    return _jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 3 }, children: children });
}
function Value({ children }) {
    return _jsx("div", { style: { fontSize: 16, fontWeight: 700, color: "#1a1a1a" }, children: children });
}
const styles = {
    card: {
        background: "#fff", borderRadius: 14, overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.09)", marginBottom: 20,
    },
    header: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid #f0f0f0",
    },
    title: { fontSize: 16, fontWeight: 700 },
    toggleBtn: {
        color: "#fff", border: "none", borderRadius: 8,
        padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    error: { color: "#c62828", padding: "8px 20px", fontSize: 14 },
    body: { display: "flex", gap: 0 },
    videoWrap: {
        width: 320, height: 240, background: "#111", flexShrink: 0,
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
    },
    video: { width: "100%", height: "100%", objectFit: "cover" },
    placeholder: { display: "flex", flexDirection: "column", alignItems: "center" },
    scanBadge: {
        position: "absolute", bottom: 8, left: 8,
        background: "rgba(74,144,217,0.85)", color: "#fff",
        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10,
    },
    results: { flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 },
    hint: { color: "#aaa", fontSize: 14, lineHeight: 1.6, margin: 0 },
    alertBanner: {
        display: "flex", alignItems: "center", gap: 12,
        borderRadius: 10, padding: "12px 16px", color: "#fff",
    },
    alertIcon: { fontSize: 28 },
    alertTitle: { fontWeight: 800, fontSize: 15 },
    alertSub: { fontSize: 12, opacity: 0.85, marginTop: 2 },
    infoBlock: {},
    scoreRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 4 },
    scoreBar: { flex: 1, height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" },
    scoreNum: { fontSize: 15, fontWeight: 800, minWidth: 50 },
    thresholdLabels: {
        display: "flex", justifyContent: "space-between",
        fontSize: 10, color: "#bbb", marginTop: 4,
    },
};
