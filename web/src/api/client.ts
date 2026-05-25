import axios from "axios";

// Use deployed backend in production, localhost in development
export const API_BASE = import.meta.env.PROD
  ? "https://carewatch.fly.dev"
  : "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
