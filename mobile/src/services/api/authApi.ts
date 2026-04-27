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

export const registerRequest = async (payload: RegisterPayload): Promise<AuthResult> => {
  const response = await apiClient.post<ApiResponse<AuthResult>>("/auth/register", payload);
  return response.data.data;
};

export const loginRequest = async (payload: AuthPayload): Promise<AuthResult> => {
  const response = await apiClient.post<ApiResponse<AuthResult>>("/auth/login", payload);
  return response.data.data;
};
