const productionBackendUrl = "https://curo-backend-fwaq.onrender.com";

const uniq = (values: string[]) => Array.from(new Set(values));
const defaultHost = productionBackendUrl;

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

const buildApiBaseCandidates = () => {
  const envValue = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (envValue) {
    return [normalizeApiBaseUrl(envValue)];
  }

  const candidates = [normalizeApiBaseUrl(defaultHost)];

  return uniq(candidates);
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultHost,
);

export const API_BASE_URL_CANDIDATES = buildApiBaseCandidates();

export const SOCKET_BASE_URL = normalizeUrl(
  process.env.EXPO_PUBLIC_SOCKET_URL || defaultHost,
);
