import axios from "axios";

import { API_BASE_URL } from "@/constants/config";

let token: string | null = null;

export const setAuthToken = (value: string | null) => {
  token = value;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

// REQUEST INTERCEPTOR — Attach Bearer token to every outgoing request
apiClient.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// RESPONSE INTERCEPTOR — Auto-logout on 401 (expired or invalid JWT)
// We import the store lazily (not at module level) to avoid circular dependency
// between client.ts → authStore → client.ts
apiClient.interceptors.response.use(
  // Pass successful responses through unchanged
  (response) => response,

  async (error) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      // Dynamically import to break circular dep: authStore imports setAuthToken from here
      const { useAuthStore } = await import("@/store/authStore");
      const logout = useAuthStore.getState().logout;

      // Only logout if we currently have a session — prevents infinite loops
      // on the login/register endpoints which also return 401 for wrong credentials
      const hasSession = !!useAuthStore.getState().token;
      if (hasSession) {
        await logout();
      }
    }

    return Promise.reject(error);
  }
);
