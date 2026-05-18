import { create } from "zustand";

import {
  getMyReputationProfile,
  getUserReputationProfile,
  getReputationHistory,
  getLeaderboard,
  getTrustLevels,
} from "@/services/api/reputationApi";
import type {
  ReputationProfile,
  ReputationEvent,
  TrustLevelInfo,
  LeaderboardEntry,
} from "@/types/reputation";
import type { PaginationMeta } from "@/types/api";

interface ReputationState {
  // Current user's profile
  myProfile: ReputationProfile | null;
  myProfileLoading: boolean;

  // Viewed user's profile (other user)
  viewedProfile: ReputationProfile | null;
  viewedProfileLoading: boolean;

  // History
  history: ReputationEvent[];
  historyPagination: PaginationMeta | null;
  historyLoading: boolean;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;

  // Trust level definitions
  trustLevels: TrustLevelInfo[];

  // Actions
  fetchMyProfile: () => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<void>;
  fetchHistory: (userId: string, page?: number) => Promise<void>;
  fetchLeaderboard: (options?: {
    period?: string;
    category?: string;
    limit?: number;
  }) => Promise<void>;
  fetchTrustLevels: () => Promise<void>;

  // Realtime update handler
  handleReputationUpdate: (data: {
    newScore: number;
    trustLevel: string;
    delta: number;
    eventType: string;
  }) => void;
}

export const useReputationStore = create<ReputationState>((set, get) => ({
  myProfile: null,
  myProfileLoading: false,
  viewedProfile: null,
  viewedProfileLoading: false,
  history: [],
  historyPagination: null,
  historyLoading: false,
  leaderboard: [],
  leaderboardLoading: false,
  trustLevels: [],

  fetchMyProfile: async () => {
    set({ myProfileLoading: true });
    try {
      const profile = await getMyReputationProfile();
      set({ myProfile: profile });
    } catch {
      // Fail silently — profile card shows cached or 0
    } finally {
      set({ myProfileLoading: false });
    }
  },

  fetchUserProfile: async (userId) => {
    set({ viewedProfileLoading: true });
    try {
      const profile = await getUserReputationProfile(userId);
      set({ viewedProfile: profile });
    } catch {
      set({ viewedProfile: null });
    } finally {
      set({ viewedProfileLoading: false });
    }
  },

  fetchHistory: async (userId, page = 1) => {
    set({ historyLoading: true });
    try {
      const result = await getReputationHistory(userId, page);
      if (page === 1) {
        set({ history: result.events, historyPagination: result.pagination });
      } else {
        set((state) => ({
          history: [...state.history, ...result.events],
          historyPagination: result.pagination,
        }));
      }
    } catch {
      // Fail silently
    } finally {
      set({ historyLoading: false });
    }
  },

  fetchLeaderboard: async (options = {}) => {
    set({ leaderboardLoading: true });
    try {
      const leaders = await getLeaderboard(options);
      set({ leaderboard: leaders });
    } catch {
      // Fail silently
    } finally {
      set({ leaderboardLoading: false });
    }
  },

  fetchTrustLevels: async () => {
    try {
      const levels = await getTrustLevels();
      set({ trustLevels: levels });
    } catch {
      // Use defaults
    }
  },

  handleReputationUpdate: (data) => {
    const current = get().myProfile;
    if (current) {
      set({
        myProfile: {
          ...current,
          user: {
            ...current.user,
            reputationScore: data.newScore,
            trustLevel: data.trustLevel as any,
          },
        },
      });
    }
  },
}));
