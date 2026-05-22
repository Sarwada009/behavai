import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Alert, useAlertStore } from "../store/alertStore";

interface Props {
  alert: Alert;
}

export function AlertBanner({ alert }: Props) {
  const dismiss = useAlertStore((s) => s.dismiss);
  const isOutburst = alert.alert_type === "outburst";

  return (
    <View style={[styles.banner, isOutburst ? styles.outburst : styles.predicted]}>
      <View style={styles.body}>
        <Text style={styles.title}>
          {isOutburst ? "🚨 Outburst Alert" : "⚠️ Behaviour Warning"}
        </Text>
        <Text style={styles.detail}>
          {alert.patient_name} · Room {alert.room_number} · Score {alert.agitation_score}/100
        </Text>
      </View>
      <TouchableOpacity onPress={() => dismiss(alert.id)} style={styles.close}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  outburst:  { backgroundColor: "#c62828" },
  predicted: { backgroundColor: "#e65100" },
  body: { flex: 1 },
  title:  { color: "#fff", fontWeight: "800", fontSize: 15 },
  detail: { color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 3 },
  close: { padding: 4 },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
