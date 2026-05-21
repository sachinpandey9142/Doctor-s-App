import axios from "axios";
import { useAdminStore } from "./store/adminStore";

const viteEnv = import.meta.env as ImportMetaEnv & {
  VITE_API_URL?: string;
};

const viteApiUrl = viteEnv.VITE_API_URL;

const normalizeBackendUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

let baseURL = "/api"; // default for dev proxy
if (viteApiUrl) {
  baseURL = `${normalizeBackendUrl(viteApiUrl)}/api`;
}

const api = axios.create({
  baseURL,
});

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
