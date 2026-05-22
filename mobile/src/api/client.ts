import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const API_BASE = "http://10.30.16.114:8000"; // e.g. http://192.168.1.5:8000

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
