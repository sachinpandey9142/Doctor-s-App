import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { MedicalRole, User } from "@/types/models";

interface AuthPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends AuthPayload {
  name: string;
  role: MedicalRole;
  specialization?: string;
  hospital?: string;
  experience?: number;
  idDocument?: string;
}

interface AuthResult {
  token: string;
  user: User;
}

export const registerRequest = async (
  payload: RegisterPayload,
): Promise<AuthResult> => {
  if (__DEV__) {
    console.log("[authApi] register request", {
      baseURL: apiClient.defaults.baseURL,
      email: payload.email,
      role: payload.role,
    });
  }

  const response = await apiClient.post<ApiResponse<AuthResult>>(
    "/auth/register",
    payload,
  );

  if (__DEV__) {
    console.log("[authApi] register response", {
      status: response.status,
      userRole: response.data?.data?.user?.role,
    });
  }

  return response.data.data;
};

export const loginRequest = async (
  payload: AuthPayload,
): Promise<AuthResult> => {
  if (__DEV__) {
    console.log("[authApi] login request", {
      baseURL: apiClient.defaults.baseURL,
      email: payload.email,
    });
  }

  const response = await apiClient.post<ApiResponse<AuthResult>>(
    "/auth/login",
    payload,
  );

  if (__DEV__) {
    console.log("[authApi] login response", {
      status: response.status,
      userRole: response.data?.data?.user?.role,
    });
  }

  return response.data.data;
};
