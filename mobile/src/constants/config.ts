import Constants from "expo-constants";
import { Platform } from "react-native";

const defaultBackendPort = "8080";

const resolveDevHost = () => {
  // Extract dev server IP if running in Expo Go or Dev Client
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (localhost) {
    return localhost;
  }

  // Fallbacks: 10.0.2.2 for Android emulators, localhost for iOS simulator
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
};
const defaultHost = `http://${resolveDevHost()}:${defaultBackendPort}`;

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
