import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE } from "../api/client";
import { patientsApi } from "../api/patients";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "PatientProfile">;

export function PatientProfileScreen({ route, navigation }: Props) {
  const { patientId } = route.params;

  const { data: patient, isLoading, refetch } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientsApi.get(patientId),
  });

  const handleChangePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await patientsApi.uploadPhoto(patientId, result.assets[0].uri);
        refetch();
      } catch {
        Alert.alert("Error", "Failed to upload photo.");
      }
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4A90D9" />;
  }

  if (!patient) return null;

  const photoUri = patient.photo_url ? `${API_BASE}${patient.photo_url}` : null;
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleChangePhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{patient.name[0]}</Text>
            </View>
          )}
          <Text style={styles.changePhoto}>Change Photo</Text>
        </TouchableOpacity>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.sub}>Room {patient.room_number} • {age} years old</Text>
      </View>

      {/* Diagnosis */}
      <Section title="Diagnosis">
        <Text style={styles.bodyText}>{patient.diagnosis ?? "Not recorded"}</Text>
      </Section>

      {/* Triggers */}
      <Section title="Known Triggers">
        {patient.known_triggers.length > 0 ? (
          <View style={styles.tagRow}>
            {patient.known_triggers.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>None recorded</Text>
        )}
      </Section>

      {/* Medications */}
      <Section title="Medications">
        {patient.medications.length > 0 ? (
          patient.medications.map((med, i) => (
            <View key={i} style={styles.medRow}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medDetail}>{med.dose} — {med.frequency}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.bodyText}>None recorded</Text>
        )}
      </Section>

      {/* Care Notes */}
      <Section title="Care Notes">
        <Text style={styles.bodyText}>{patient.care_notes ?? "None"}</Text>
      </Section>

      {/* Assigned Staff */}
      <Section title="Assigned Staff">
        <Text style={styles.bodyText}>
          {patient.assigned_staff?.name ?? "Unassigned"}
        </Text>
      </Section>

      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate("HealthHistory", { patientId })}
      >
        <Text style={styles.historyBtnText}>View Health History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  header: { alignItems: "center", backgroundColor: "#fff", paddingVertical: 24, marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { backgroundColor: "#4A90D9", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "700" },
  changePhoto: { color: "#4A90D9", fontSize: 13, textAlign: "center", marginTop: 6 },
  name: { fontSize: 22, fontWeight: "800", color: "#1a1a1a", marginTop: 10 },
  sub: { fontSize: 14, color: "#888", marginTop: 4 },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#4A90D9", marginBottom: 8, textTransform: "uppercase" },
  bodyText: { fontSize: 15, color: "#333", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#EBF3FC", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 13, color: "#4A90D9" },
  medRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  medName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  medDetail: { fontSize: 13, color: "#666", marginTop: 2 },
  historyBtn: {
    margin: 16,
    backgroundColor: "#4A90D9",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  historyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
