import client from "./client";
export const camerasApi = {
    list: () => client.get("/cameras/").then((r) => r.data),
    create: (data) => client.post("/cameras/", data).then((r) => r.data),
    update: (id, data) => client.patch(`/cameras/${id}`, data).then((r) => r.data),
    delete: (id) => client.delete(`/cameras/${id}`),
};
