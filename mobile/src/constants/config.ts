import { Platform } from "react-native";

const defaultHost =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

const normalizeUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  return withScheme;
};

const normalizeApiBaseUrl = (value: string) => {
  const normalized = normalizeUrl(value);
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultHost,
);

export const SOCKET_BASE_URL = normalizeUrl(
  process.env.EXPO_PUBLIC_SOCKET_URL || defaultHost,
);
