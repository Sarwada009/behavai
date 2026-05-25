import client from "./client";
export const analyticsApi = {
    overview: () => client.get("/analytics/overview").then((r) => r.data),
    trend: (patientId, hours = 24) => client.get(`/analytics/patient/${patientId}/trend`, { params: { hours } }).then((r) => r.data),
    breakdown: (patientId, days = 30) => client.get(`/analytics/patient/${patientId}/incidents`, { params: { days } }).then((r) => r.data),
    reportUrl: (patientId, days = 30) => `${client.defaults.baseURL}/reports/patient/${patientId}?days=${days}`,
};
