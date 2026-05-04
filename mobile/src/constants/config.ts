import { Platform } from "react-native";

const defaultHost = "http://localhost:8080";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || `${defaultHost}/api`;

export const SOCKET_BASE_URL = process.env.EXPO_PUBLIC_SOCKET_URL || defaultHost;
