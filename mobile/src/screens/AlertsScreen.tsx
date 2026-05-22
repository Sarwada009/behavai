import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlertStore } from "../store/alertStore";

const TYPE_LABEL: Record<string, string> = {
  outburst:           "Outburst",
  predicted_outburst: "Predicted Outburst",
};

function scoreColor(score: number): string {
  if (score >= 80) return "#c62828";
  if (score >= 60) return "#e65100";
  return "#f9a825";
}

export function AlertsScreen() {
  const { alerts, dismiss, clearAll } = useAlertStore();

  return (
    <View style={styles.container}>
      {alerts.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No alerts — all clear.</Text>
          </View>
        }
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const color = item.alert_type === "outburst" ? "#c62828" : "#e65100";
          const time  = new Date(item.timestamp).toLocaleString();
          return (
            <View style={[styles.card, item.dismissed && styles.cardDimmed]}>
              <View style={[styles.colorBar, { backgroundColor: color }]} />
              <View style={styles.content}>
                <View style={styles.row}>
                  <Text style={[styles.type, { color }]}>
                    {item.alert_type === "outburst" ? "🚨 " : "⚠️ "}
                    {TYPE_LABEL[item.alert_type]}
                  </Text>
                  <Text style={styles.time}>{time}</Text>
                </View>
                <Text style={styles.patient}>{item.patient_name}</Text>
                <Text style={styles.room}>Room {item.room_number}</Text>
                <View style={[styles.scoreBadge, { borderColor: scoreColor(item.agitation_score) }]}>
                  <Text style={[styles.scoreText, { color: scoreColor(item.agitation_score) }]}>
                    Score {item.agitation_score}/100
                  </Text>
                </View>
              </View>
              {!item.dismissed && (
                <TouchableOpacity style={styles.dismissBtn} onPress={() => dismiss(item.id)}>
                  <Text style={styles.dismissText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F4F7FB" },
  clearBtn: {
    alignSelf: "flex-end",
    margin: 12,
    padding: 8,
  },
  clearText:   { color: "#4A90D9", fontWeight: "700", fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 16, color: "#aaa" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDimmed:  { opacity: 0.45 },
  colorBar:    { width: 6 },
  content:     { flex: 1, padding: 12 },
  row:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  type:        { fontWeight: "800", fontSize: 14 },
  time:        { fontSize: 11, color: "#aaa" },
  patient:     { fontSize: 16, fontWeight: "700", marginTop: 4, color: "#1a1a1a" },
  room:        { fontSize: 13, color: "#666", marginTop: 2 },
  scoreBadge: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  scoreText:   { fontSize: 12, fontWeight: "700" },
  dismissBtn:  { padding: 12, justifyContent: "center" },
  dismissText: { fontSize: 18, color: "#ccc" },
});
