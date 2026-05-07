import axios from "axios";
import { useAdminStore } from "./store/adminStore";

// Resolve base URL robustly:
// - In Vite dev with proxy: use relative '/api' so Vite proxies requests.
// - When running admin-web directly (no proxy) allow VITE_BACKEND_URL or BACKEND_PORT to point to backend.
const viteBackendUrl = (import.meta as any).env?.VITE_BACKEND_URL;
const envBackendPort = process.env.BACKEND_PORT || (import.meta as any).env?.VITE_BACKEND_PORT;

let baseURL = "/api"; // default for dev proxy
if (viteBackendUrl) {
  baseURL = `${viteBackendUrl.replace(/\/$/, "")}/api`;
} else if (envBackendPort && typeof window !== "undefined") {
  // running in browser without Vite proxy - point directly to backend
  baseURL = `http://localhost:${envBackendPort}/api`;
}

const api = axios.create({
  baseURL,
});

// Helpful debug log so developers can see which backend URL the frontend is using.
// Leave this in during local development; remove or lower log level for production.
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.debug("admin-web: API baseURL =", baseURL);
}

api.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAdminStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
