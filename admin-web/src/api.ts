import axios from "axios";
import { useAdminStore } from "./store/adminStore";

const viteEnv = import.meta.env as ImportMetaEnv & {
  VITE_BACKEND_URL?: string;
  VITE_BACKEND_PORT?: string;
};

const viteBackendUrl = viteEnv.VITE_BACKEND_URL;
const viteBackendPort = viteEnv.VITE_BACKEND_PORT;

const normalizeBackendUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

let baseURL = "/api"; // default for dev proxy
if (viteBackendUrl) {
  baseURL = `${normalizeBackendUrl(viteBackendUrl)}/api`;
} else if (viteBackendPort) {
  // running in browser without Vite proxy - point directly to backend
  baseURL = `http://localhost:${viteBackendPort}/api`;
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
  },
);

export default api;
