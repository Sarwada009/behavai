import client from "./client";

export interface Camera {
  id: string;
  name: string;
  room_number: string;
  rtsp_url: string;
  is_active: boolean;
  created_at: string;
}

export const camerasApi = {
  list: () => client.get<Camera[]>("/cameras/").then((r) => r.data),
  create: (data: Omit<Camera, "id" | "created_at">) =>
    client.post<Camera>("/cameras/", data).then((r) => r.data),
  update: (id: string, data: Partial<Camera>) =>
    client.patch<Camera>(`/cameras/${id}`, data).then((r) => r.data),
  delete: (id: string) => client.delete(`/cameras/${id}`),
};
