import client from "./client";

export interface Overview {
  total_patients: number;
  incidents_today: number;
  incidents_this_week: number;
  unacknowledged_alerts: number;
  high_agitation_now: number;
  top_patients: { patient_id: string; name: string; incidents: number }[];
}

export interface TrendPoint {
  timestamp: string;
  score: number;
}

export interface IncidentBreakdown {
  type: string;
  count: number;
  avg_severity: number;
}

export const analyticsApi = {
  overview: () => client.get<Overview>("/analytics/overview").then((r) => r.data),
  trend: (patientId: string, hours = 24) =>
    client.get<TrendPoint[]>(`/analytics/patient/${patientId}/trend`, { params: { hours } }).then((r) => r.data),
  breakdown: (patientId: string, days = 30) =>
    client.get<IncidentBreakdown[]>(`/analytics/patient/${patientId}/incidents`, { params: { days } }).then((r) => r.data),
  reportUrl: (patientId: string, days = 30) =>
    `${client.defaults.baseURL}/reports/patient/${patientId}?days=${days}`,
};
