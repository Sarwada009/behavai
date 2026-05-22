import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { HealthRecord } from "../api/patients";

const SEVERITY_COLOR: Record<number, string> = {
  1: "#4CAF50",
  2: "#8BC34A",
  3: "#FFC107",
  4: "#FF9800",
  5: "#F44336",
};

const TYPE_LABEL: Record<string, string> = {
  outburst: "Outburst",
  predicted_outburst: "Predicted",
  agitation: "Agitation",
  general: "General",
};

interface Props {
  record: HealthRecord;
  onAcknowledge?: () => void;
}

export function IncidentCard({ record, onAcknowledge }: Props) {
  const color = SEVERITY_COLOR[record.severity] ?? "#999";
  const date = new Date(record.occurred_at).toLocaleString();

  return (
    <View style={styles.card}>
      <View style={[styles.severityBar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.type}>{TYPE_LABEL[record.incident_type]}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Text style={styles.severityText}>Severity {record.severity}/5</Text>
        {record.agitation_score != null && (
          <Text style={styles.score}>AI Score: {record.agitation_score}</Text>
        )}
        {record.notes && <Text style={styles.notes}>{record.notes}</Text>}
        {record.outcome && <Text style={styles.outcome}>Outcome: {record.outcome}</Text>}
        {!record.acknowledged_at && onAcknowledge && (
          <TouchableOpacity style={styles.ackBtn} onPress={onAcknowledge}>
            <Text style={styles.ackText}>Acknowledge</Text>
          </TouchableOpacity>
        )}
        {record.acknowledged_at && (
          <Text style={styles.acked}>
            Acknowledged {new Date(record.acknowledged_at).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  severityBar: { width: 6 },
  content: { flex: 1, padding: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  type: { fontWeight: "700", fontSize: 14, color: "#1a1a1a" },
  date: { fontSize: 12, color: "#888" },
  severityText: { fontSize: 13, color: "#555", marginTop: 4 },
  score: { fontSize: 12, color: "#4A90D9", marginTop: 2 },
  notes: { fontSize: 13, color: "#444", marginTop: 6 },
  outcome: { fontSize: 13, color: "#666", fontStyle: "italic", marginTop: 4 },
  ackBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#4A90D9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ackText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  acked: { marginTop: 6, fontSize: 12, color: "#4CAF50" },
});
