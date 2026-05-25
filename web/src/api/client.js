import axios from "axios";
// Use deployed backend in production, localhost in development
const API_BASE_PROD = "https://carewatch.fly.dev";
const API_BASE_DEV = "http://localhost:8000";
export const API_BASE = (import.meta.env.PROD ?? false) ? API_BASE_PROD : API_BASE_DEV;
const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
export default client;
