import axios from "axios";
import { useAdminStore } from "./store/adminStore";

const api = axios.create({
  baseURL: "/api",
});

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
