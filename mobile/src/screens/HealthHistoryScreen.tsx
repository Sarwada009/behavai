import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { historyApi } from "../api/patients";
import { IncidentCard } from "../components/IncidentCard";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "HealthHistory">;

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Outburst", value: "outburst" },
  { label: "Predicted", value: "predicted_outburst" },
  { label: "Agitation", value: "agitation" },
];

export function HealthHistoryScreen({ route }: Props) {
  const { patientId } = route.params;
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["history", patientId, filter],
    queryFn: () => historyApi.list(patientId, { incident_type: filter }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (recordId: string) => historyApi.acknowledge(patientId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history", patientId] }),
    onError: () => Alert.alert("Error", "Could not acknowledge incident."),
  });

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#4A90D9" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IncidentCard
              record={item}
              onAcknowledge={
                !item.acknowledged_at
                  ? () => acknowledgeMutation.mutate(item.id)
                  : undefined
              }
            />
          )}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <Text style={styles.empty}>No incidents recorded.</Text>
          }
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#EBF3FC",
  },
  filterBtnActive: { backgroundColor: "#4A90D9" },
  filterText: { fontSize: 13, color: "#4A90D9", fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  empty: { textAlign: "center", marginTop: 60, color: "#aaa", fontSize: 15 },
});
