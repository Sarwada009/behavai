import client from "./client";

export interface PatientSummary {
  id: string;
  name: string;
  room_number: string;
  photo_url: string | null;
  diagnosis: string | null;
  assigned_staff: { id: string; name: string } | null;
}

export interface Patient extends PatientSummary {
  date_of_birth: string;
  known_triggers: string[];
  medications: { name: string; dose: string; frequency: string }[];
  care_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  incident_type: "outburst" | "predicted_outburst" | "agitation" | "general";
  severity: number;
  agitation_score: number | null;
  duration_seconds: number | null;
  notes: string | null;
  outcome: string | null;
  recorded_by: { id: string; name: string } | null;
  occurred_at: string;
  acknowledged_at: string | null;
}

export const patientsApi = {
  list: (search?: string) =>
    client.get<PatientSummary[]>("/patients/", { params: { search } }).then((r) => r.data),
  get: (id: string) => client.get<Patient>(`/patients/${id}`).then((r) => r.data),
  create: (data: FormData | Partial<Patient>) =>
    client.post<Patient>("/patients/", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    }).then((r) => r.data),
  update: (id: string, data: Partial<Patient>) =>
    client.patch<Patient>(`/patients/${id}`, data).then((r) => r.data),
};

export const historyApi = {
  list: (patientId: string, params?: { incident_type?: string; limit?: number }) =>
    client.get<HealthRecord[]>(`/patients/${patientId}/history/`, { params }).then((r) => r.data),
  create: (patientId: string, data: Partial<HealthRecord>) =>
    client.post<HealthRecord>(`/patients/${patientId}/history/`, data).then((r) => r.data),
  acknowledge: (patientId: string, recordId: string) =>
    client
      .post<HealthRecord>(`/patients/${patientId}/history/${recordId}/acknowledge`)
      .then((r) => r.data),
};
