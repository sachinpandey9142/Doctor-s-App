import axios from "axios";

import { API_BASE_URL, API_BASE_URL_CANDIDATES } from "@/constants/config";

let token: string | null = null;

type RetriableAxiosConfig = {
  _retryCount?: number;
  _baseUrlCandidates?: string[];
} & Record<string, any>;

export const setAuthToken = (value: string | null) => {
  token = value;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST INTERCEPTOR — Attach Bearer token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const requestConfig = config as RetriableAxiosConfig;

    requestConfig._baseUrlCandidates =
      requestConfig._baseUrlCandidates || API_BASE_URL_CANDIDATES;
    requestConfig._retryCount = requestConfig._retryCount || 0;

    requestConfig.baseURL =
      requestConfig._baseUrlCandidates[requestConfig._retryCount] ||
      API_BASE_URL;

    if (__DEV__) {
      console.log(
        `[API Request] ${requestConfig.method?.toUpperCase()} ${requestConfig.baseURL}${requestConfig.url}`,
      );
    }

    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    if (__DEV__) console.error(`[API Request Error]`, error);
    return Promise.reject(error);
  },
);

// RESPONSE INTERCEPTOR — Auto-logout on 401 (expired or invalid JWT)
// We import the store lazily (not at module level) to avoid circular dependency
// between client.ts → authStore → client.ts
apiClient.interceptors.response.use(
  // Pass successful responses through unchanged
  (response) => {
    if (__DEV__) {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`,
      );
    }
    return response;
  },

  async (error) => {
    if (__DEV__) {
      console.error(
        `[API Response Error] ${error.config?.url} -`,
        error.message,
      );
    }

    const requestConfig = error.config as RetriableAxiosConfig | undefined;
    const hasNetworkFailure = !error.response;
    const canRetry =
      hasNetworkFailure &&
      requestConfig &&
      requestConfig._baseUrlCandidates &&
      (requestConfig._retryCount ?? 0) <
        requestConfig._baseUrlCandidates.length - 1;

    if (canRetry) {
      const nextRetryCount = (requestConfig._retryCount ?? 0) + 1;
      const nextBaseUrl = requestConfig._baseUrlCandidates?.[nextRetryCount];

      if (__DEV__) {
        console.warn(`[API Retry] ${requestConfig.url} -> ${nextBaseUrl}`);
      }

      requestConfig._retryCount = nextRetryCount;
      requestConfig.baseURL = nextBaseUrl;
      return apiClient.request(requestConfig as any);
    }

    // Fallback Error Handling for Network Issues
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        error.message =
          "Request timeout. Please check your internet connection.";
      } else {
        error.message =
          "Unable to connect to the server. Please check your network or try again later.";
      }
    } else if (error.response.status >= 500) {
      error.message = "Server encountered an error. Please try again later.";
    }

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
  },
);
