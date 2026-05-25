import client from "./client";
export const patientsApi = {
    list: (search) => client.get("/patients/", { params: { search } }).then((r) => r.data),
    get: (id) => client.get(`/patients/${id}`).then((r) => r.data),
    create: (data) => client.post("/patients/", data, {
        headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    }).then((r) => r.data),
    update: (id, data) => client.patch(`/patients/${id}`, data).then((r) => r.data),
};
export const historyApi = {
    list: (patientId, params) => client.get(`/patients/${patientId}/history/`, { params }).then((r) => r.data),
    create: (patientId, data) => client.post(`/patients/${patientId}/history/`, data).then((r) => r.data),
    acknowledge: (patientId, recordId) => client
        .post(`/patients/${patientId}/history/${recordId}/acknowledge`)
        .then((r) => r.data),
};
