import { apiClient } from "./client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type {
  ReputationProfile,
  ReputationEvent,
  TrustLevelInfo,
  BadgeDefinition,
  EarnedBadge,
  LeaderboardEntry,
} from "@/types/reputation";

// ── Public endpoints ──────────────────────────────────────────────────────────

export const getMyReputationProfile = async (): Promise<ReputationProfile> => {
  const res = await apiClient.get<ApiResponse<ReputationProfile>>("/reputation/me");
  return res.data.data;
};

export const getUserReputationProfile = async (
  userId: string
): Promise<ReputationProfile> => {
  const res = await apiClient.get<ApiResponse<ReputationProfile>>(
    `/reputation/${userId}`
  );
  return res.data.data;
};

export const getReputationHistory = async (
  userId: string,
  page = 1,
  limit = 20
): Promise<{ events: ReputationEvent[]; pagination: PaginationMeta }> => {
  const res = await apiClient.get<
    ApiResponse<ReputationEvent[]> & { pagination: PaginationMeta }
  >(`/reputation/${userId}/history`, { params: { page, limit } });
  return { events: res.data.data, pagination: res.data.pagination! };
};

export const getLeaderboard = async (
  options: { period?: string; category?: string; limit?: number } = {}
): Promise<LeaderboardEntry[]> => {
  const res = await apiClient.get<ApiResponse<LeaderboardEntry[]>>(
    "/reputation/leaderboard",
    { params: options }
  );
  return res.data.data;
};

export const getTrustLevels = async (): Promise<TrustLevelInfo[]> => {
  const res = await apiClient.get<ApiResponse<TrustLevelInfo[]>>(
    "/reputation/trust-levels"
  );
  return res.data.data;
};

export const getBadgeDefinitions = async (): Promise<BadgeDefinition[]> => {
  const res = await apiClient.get<ApiResponse<BadgeDefinition[]>>(
    "/reputation/badges"
  );
  return res.data.data;
};

export const getUserBadges = async (userId: string): Promise<EarnedBadge[]> => {
  const res = await apiClient.get<ApiResponse<EarnedBadge[]>>(
    `/reputation/${userId}/badges`
  );
  return res.data.data;
};

// ── Admin endpoints ───────────────────────────────────────────────────────────

export const adminAdjustReputation = async (
  targetUserId: string,
  delta: number,
  reason: string,
  moderatorNote?: string
): Promise<{ newScore: number; trustLevel: string }> => {
  const res = await apiClient.post<
    ApiResponse<{ newScore: number; trustLevel: string }>
  >("/reputation/admin/adjust", { targetUserId, delta, reason, moderatorNote });
  return res.data.data;
};

export const adminAwardBadge = async (
  targetUserId: string,
  badgeId: string,
  message?: string
): Promise<BadgeDefinition> => {
  const res = await apiClient.post<ApiResponse<BadgeDefinition>>(
    "/reputation/admin/award-badge",
    { targetUserId, badgeId, message }
  );
  return res.data.data;
};

export const adminSuppressTrust = async (
  targetUserId: string,
  durationHours: number,
  reason: string
): Promise<{ suppressed: boolean; until: string }> => {
  const res = await apiClient.post<
    ApiResponse<{ suppressed: boolean; until: string }>
  >("/reputation/admin/suppress", { targetUserId, durationHours, reason });
  return res.data.data;
};
