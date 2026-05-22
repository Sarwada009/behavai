import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { patientsApi } from "../api/patients";
import { AlertBanner } from "../components/AlertBanner";
import { PatientCard } from "../components/PatientCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAlertStore } from "../store/alertStore";

type Props = NativeStackScreenProps<RootStackParamList, "PatientsList">;

export function PatientsListScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => patientsApi.list(search || undefined),
  });

  const activeAlerts = useAlertStore((s) =>
    s.alerts.filter((a) => !a.dismissed).slice(0, 3)
  );

  return (
    <View style={styles.container}>
      {/* Active alert banners */}
      {activeAlerts.map((alert) => (
        <AlertBanner key={alert.id} alert={alert} />
      ))}

      <TextInput
        style={styles.search}
        placeholder="Search patients..."
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4A90D9" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PatientCard
              patient={item}
              onPress={() => navigation.navigate("PatientProfile", { patientId: item.id })}
            />
          )}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={<Text style={styles.empty}>No patients found.</Text>}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  search: {
    margin: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 15,
  },
  empty: { textAlign: "center", marginTop: 60, color: "#aaa", fontSize: 15 },
});
