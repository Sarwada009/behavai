import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { API_BASE } from "../api/client";
import { PatientSummary } from "../api/patients";
import { usePresenceStore } from "../store/presenceStore";

function scoreColor(score: number): string {
  if (score >= 80) return "#c62828";
  if (score >= 60) return "#e65100";
  if (score >= 40) return "#f9a825";
  return "#4CAF50";
}

interface Props {
  patient: PatientSummary;
  onPress: () => void;
}

export function PatientCard({ patient, onPress }: Props) {
  const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
  const presence = usePresenceStore((s) => s.presence[patient.id]);
  const score    = usePresenceStore((s) => s.scores[patient.id]);

  const isRecent = presence
    ? Date.now() - new Date(presence.timestamp).getTime() < 60_000
    : false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{patient.name[0]}</Text>
          </View>
        )}
        {isRecent && <View style={styles.liveDot} />}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.sub}>Room {patient.room_number}</Text>
        {isRecent && (
          <Text style={styles.seen}>
            Seen in Room {presence.room_number} — {Math.round(presence.confidence * 100)}% confidence
          </Text>
        )}
        {patient.diagnosis && !isRecent && (
          <Text style={styles.diagnosis} numberOfLines={1}>{patient.diagnosis}</Text>
        )}
        {patient.assigned_staff && (
          <Text style={styles.staff}>Assigned: {patient.assigned_staff.name}</Text>
        )}
      </View>

      {score != null && (
        <View style={[styles.scoreBadge, { borderColor: scoreColor(score) }]}>
          <Text style={[styles.scoreNum, { color: scoreColor(score) }]}>{score}</Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 14 },
  avatarPlaceholder: { backgroundColor: "#4A90D9", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 22, fontWeight: "700" },
  liveDot: {
    position: "absolute",
    bottom: 2,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  sub: { fontSize: 13, color: "#666", marginTop: 2 },
  seen: { fontSize: 12, color: "#4CAF50", marginTop: 2, fontWeight: "600" },
  diagnosis: { fontSize: 12, color: "#888", marginTop: 2 },
  staff: { fontSize: 12, color: "#4A90D9", marginTop: 2 },
  scoreBadge: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 3,
    alignItems: "center", justifyContent: "center", marginLeft: 8,
  },
  scoreNum:   { fontSize: 15, fontWeight: "800" },
  scoreLabel: { fontSize: 9,  color: "#999" },
});
