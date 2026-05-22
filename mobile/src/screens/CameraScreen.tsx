import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import client from "../api/client";

interface FrameResult {
  patient_id: string | null;
  patient_name: string | null;
  room_number: string | null;
  confidence: number;
  agitation_score: number | null;
  alert_type: string | null;
  face_detected: boolean;
}

const CAPTURE_INTERVAL_MS = 3000;

function scoreColor(score: number): string {
  if (score >= 80) return "#c62828";
  if (score >= 60) return "#e65100";
  if (score >= 40) return "#f9a825";
  return "#4CAF50";
}

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing]   = useState<CameraType>("back");
  const [active, setActive]   = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<FrameResult | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const captureAndSend = useCallback(async () => {
    if (!cameraRef.current || sending) return;
    setSending(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: false,
        skipProcessing: true,
      });
      if (!photo) return;

      const form = new FormData();
      form.append("file", {
        uri:  photo.uri,
        name: "frame.jpg",
        type: "image/jpeg",
      } as any);

      const { data } = await client.post<FrameResult>("/stream/frame", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch {
      // silently skip — next frame will retry
    } finally {
      setSending(false);
    }
  }, [sending]);

  const startMonitoring = () => {
    setActive(true);
    setResult(null);
    timerRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
  };

  const stopMonitoring = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setActive(false);
    setResult(null);
  };

  useEffect(() => {
    if (!active) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [captureAndSend, active]);

  useEffect(() => () => stopMonitoring(), []);

  // --- Permission gate ---
  if (!permission) return <View style={styles.center}><ActivityIndicator color="#4A90D9" /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to monitor patients.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAlert = result?.alert_type != null;

  return (
    <View style={styles.container}>
      {/* Camera viewfinder */}
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Scan pulse ring */}
        {active && (
          <View style={styles.scanRing} />
        )}

        {/* Flip button */}
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        >
          <Text style={styles.flipText}>⇄ Flip</Text>
        </TouchableOpacity>

        {/* Sending indicator */}
        {sending && (
          <View style={styles.analysing}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.analysingText}>Analysing…</Text>
          </View>
        )}
      </CameraView>

      {/* Result panel */}
      <View style={styles.panel}>
        {/* Alert banner */}
        {isAlert && (
          <View style={[styles.alertBanner,
            { backgroundColor: result!.alert_type === "outburst" ? "#c62828" : "#e65100" }
          ]}>
            <Text style={styles.alertEmoji}>
              {result!.alert_type === "outburst" ? "🚨" : "⚠️"}
            </Text>
            <View>
              <Text style={styles.alertTitle}>
                {result!.alert_type === "outburst" ? "Outburst Alert" : "Behaviour Warning"}
              </Text>
              <Text style={styles.alertSub}>Alert recorded • Staff notified</Text>
            </View>
          </View>
        )}

        {/* Patient row */}
        <View style={styles.row}>
          <InfoBox
            label="Patient"
            value={
              result
                ? result.patient_name
                  ?? (result.face_detected ? "Unrecognised" : "No face detected")
                : "—"
            }
          />
          <InfoBox
            label="Room"
            value={result?.room_number ?? "—"}
          />
          {result && result.confidence > 0 && (
            <InfoBox
              label="Match"
              value={`${Math.round(result.confidence * 100)}%`}
            />
          )}
        </View>

        {/* Agitation score bar */}
        {result?.agitation_score != null && (
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>
              Agitation Score:{" "}
              <Text style={{ color: scoreColor(result.agitation_score), fontWeight: "800" }}>
                {result.agitation_score}/100
              </Text>
            </Text>
            <View style={styles.barBg}>
              <View style={[
                styles.barFill,
                {
                  width: `${result.agitation_score}%` as any,
                  backgroundColor: scoreColor(result.agitation_score),
                }
              ]} />
            </View>
            <View style={styles.thresholds}>
              <Text style={styles.tLabel}>Safe</Text>
              <Text style={[styles.tLabel, { color: "#f9a825" }]}>40 Agitated</Text>
              <Text style={[styles.tLabel, { color: "#e65100" }]}>60 Warning</Text>
              <Text style={[styles.tLabel, { color: "#c62828" }]}>80 Outburst</Text>
            </View>
          </View>
        )}

        {/* Start / Stop button */}
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: active ? "#e53935" : "#4A90D9" }]}
          onPress={active ? stopMonitoring : startMonitoring}
        >
          <Text style={styles.mainBtnText}>
            {active ? "Stop Monitoring" : "Start Monitoring"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#000" },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  permText:      { fontSize: 16, color: "#555", textAlign: "center", marginBottom: 20 },
  permBtn:       { backgroundColor: "#4A90D9", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText:   { color: "#fff", fontWeight: "700", fontSize: 16 },
  camera:        { flex: 1 },
  scanRing: {
    position: "absolute",
    alignSelf: "center",
    top: "25%",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "rgba(74,144,217,0.6)",
  },
  flipBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flipText:      { color: "#fff", fontWeight: "700", fontSize: 14 },
  analysing: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  analysingText: { color: "#fff", fontSize: 13 },
  panel:         { backgroundColor: "#fff", padding: 16, gap: 12 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 10,
    padding: 12,
  },
  alertEmoji:    { fontSize: 28 },
  alertTitle:    { color: "#fff", fontWeight: "800", fontSize: 15 },
  alertSub:      { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  row:           { flexDirection: "row", gap: 10 },
  infoBox:       { flex: 1, backgroundColor: "#F4F7FB", borderRadius: 10, padding: 10 },
  infoLabel:     { fontSize: 10, fontWeight: "700", color: "#888", textTransform: "uppercase" },
  infoValue:     { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginTop: 2 },
  scoreSection:  { gap: 6 },
  scoreLabel:    { fontSize: 14, color: "#444" },
  barBg:         { height: 10, backgroundColor: "#eee", borderRadius: 5, overflow: "hidden" },
  barFill:       { height: "100%", borderRadius: 5 },
  thresholds:    { flexDirection: "row", justifyContent: "space-between" },
  tLabel:        { fontSize: 9, color: "#bbb" },
  mainBtn:       { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  mainBtnText:   { color: "#fff", fontWeight: "800", fontSize: 16 },
});
