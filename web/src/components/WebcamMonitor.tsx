import React, { useCallback, useEffect, useRef, useState } from "react";
import client from "../api/client";

interface FrameResult {
  patient_id: string | null;
  patient_name: string | null;
  room_number: string | null;
  confidence: number;
  agitation_score: number | null;
  alert_type: string | null;
  face_detected: boolean;
  emotion: string | null;
  emotion_multiplier: number;
}

const CAPTURE_INTERVAL_MS = 3000;

function scoreColor(score: number): string {
  if (score >= 80) return "#c62828";
  if (score >= 60) return "#e65100";
  if (score >= 40) return "#f9a825";
  return "#4CAF50";
}

export function WebcamMonitor() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [active,  setActive]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<FrameResult | null>(null);
  const sendingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (timerRef.current)  clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    timerRef.current  = null;
    setActive(false);
    setResult(null);
  }, []);

  const captureAndSend = useCallback(async () => {
    if (!videoRef.current || sendingRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.7)
    );
    if (!blob) return;

    const form = new FormData();
    form.append("file", blob, "frame.jpg");

    sendingRef.current = true;
    try {
      const { data } = await client.post<FrameResult>("/stream/frame", form);
      setResult(data);
    } catch {
      // silently skip on network error — next frame will retry
    } finally {
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
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch (e: any) {
      setError(e?.message ?? "Camera access denied. Allow camera in your browser settings.");
    }
  }, []);

  // Start/stop interval when active changes
  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, captureAndSend]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const isAlert = result?.alert_type != null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>Built-in Camera Monitor</span>
        <button
          style={{ ...styles.toggleBtn, background: active ? "#e53935" : "#4A90D9" }}
          onClick={active ? stopCamera : startCamera}
        >
          {active ? "Stop Camera" : "Start Camera"}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.body}>
        {/* Video feed */}
        <div style={styles.videoWrap}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ ...styles.video, display: active ? "block" : "none" }}
          />
          {!active && (
            <div style={styles.placeholder}>
              <span style={{ fontSize: 40 }}>📷</span>
              <span style={{ color: "#aaa", marginTop: 8 }}>Camera off</span>
            </div>
          )}

          {/* Scan indicator */}
          {active && (
            <div style={styles.scanBadge}>Analysing…</div>
          )}
        </div>

        {/* Result overlay */}
        <div style={styles.results}>
          {!active && !result && (
            <p style={styles.hint}>
              Start the camera to identify patients and monitor agitation in real time.
              Point the camera at the patient — analysis runs every 3 seconds.
            </p>
          )}

          {active && !result && (
            <p style={styles.hint}>Waiting for first frame…</p>
          )}

          {result && (
            <>
              {/* Alert banner */}
              {isAlert && (
                <div style={{
                  ...styles.alertBanner,
                  background: result.alert_type === "outburst" ? "#c62828" : "#e65100",
                }}>
                  <span style={styles.alertIcon}>
                    {result.alert_type === "outburst" ? "🚨" : "⚠️"}
                  </span>
                  <div>
                    <div style={styles.alertTitle}>
                      {result.alert_type === "outburst" ? "Outburst Alert" : "Behaviour Warning"}
                    </div>
                    <div style={styles.alertSub}>Alert recorded and staff notified</div>
                  </div>
                </div>
              )}

              {/* Patient info */}
              <div style={styles.infoBlock}>
                <Label>Patient</Label>
                <Value>{result.patient_name ?? (result.face_detected ? "Unrecognised" : "No face detected")}</Value>
              </div>

              {result.room_number && (
                <div style={styles.infoBlock}>
                  <Label>Room</Label>
                  <Value>{result.room_number}</Value>
                </div>
              )}

              {result.confidence > 0 && (
                <div style={styles.infoBlock}>
                  <Label>Match confidence</Label>
                  <Value>{Math.round(result.confidence * 100)}%</Value>
                </div>
              )}

              {result.emotion && (
                <div style={styles.infoBlock}>
                  <Label>Emotion</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Value>{result.emotion}</Value>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: result.emotion_multiplier >= 1.3 ? "#fde8e8" :
                                  result.emotion_multiplier <= 0.4 ? "#e8f5e9" : "#f5f5f5",
                      color:      result.emotion_multiplier >= 1.3 ? "#c62828" :
                                  result.emotion_multiplier <= 0.4 ? "#2e7d32" : "#666",
                    }}>
                      {result.emotion_multiplier >= 1.3 ? `+${Math.round((result.emotion_multiplier - 1) * 100)}% score` :
                       result.emotion_multiplier <= 0.4 ? `−${Math.round((1 - result.emotion_multiplier) * 100)}% score` :
                       "no adjustment"}
                    </span>
                  </div>
                </div>
              )}

              {result.agitation_score != null && (
                <div style={styles.infoBlock}>
                  <Label>Agitation score</Label>
                  <div style={styles.scoreRow}>
                    <div style={styles.scoreBar}>
                      <div style={{
                        height: "100%",
                        width: `${result.agitation_score}%`,
                        background: scoreColor(result.agitation_score),
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <span style={{ ...styles.scoreNum, color: scoreColor(result.agitation_score) }}>
                      {result.agitation_score}/100
                    </span>
                  </div>
                  <div style={styles.thresholdLabels}>
                    <span>Safe</span>
                    <span style={{ color: "#f9a825" }}>Agitated (40)</span>
                    <span style={{ color: "#e65100" }}>Warning (60)</span>
                    <span style={{ color: "#c62828" }}>Outburst (80)</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 3 }}>{children}</div>;
}
function Value({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{children}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff", borderRadius: 14, overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.09)", marginBottom: 20,
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px", borderBottom: "1px solid #f0f0f0",
  },
  title:     { fontSize: 16, fontWeight: 700 },
  toggleBtn: {
    color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  error: { color: "#c62828", padding: "8px 20px", fontSize: 14 },
  body:  { display: "flex", flexDirection: "column", gap: 0 },
  videoWrap: {
    width: "100%", maxWidth: 400, height: 300, background: "#111", flexShrink: 0,
    position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
  },
  video:       { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center" },
  scanBadge: {
    position: "absolute", bottom: 8, left: 8,
    background: "rgba(74,144,217,0.85)", color: "#fff",
    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10,
  },
  results:  { flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 },
  hint:     { color: "#aaa", fontSize: 14, lineHeight: 1.6, margin: 0 },
  alertBanner: {
    display: "flex", alignItems: "center", gap: 12,
    borderRadius: 10, padding: "12px 16px", color: "#fff",
  },
  alertIcon:  { fontSize: 28 },
  alertTitle: { fontWeight: 800, fontSize: 15 },
  alertSub:   { fontSize: 12, opacity: 0.85, marginTop: 2 },
  infoBlock:  {},
  scoreRow:   { display: "flex", alignItems: "center", gap: 12, marginTop: 4 },
  scoreBar:   { flex: 1, height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" },
  scoreNum:   { fontSize: 15, fontWeight: 800, minWidth: 50 },
  thresholdLabels: {
    display: "flex", justifyContent: "space-between",
    fontSize: 10, color: "#bbb", marginTop: 4,
  },
};
