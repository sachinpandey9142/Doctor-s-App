// ── Trust Levels ──────────────────────────────────────────────────────────────
export type TrustLevel =
  | "new-member"
  | "contributor"
  | "trusted-contributor"
  | "senior-contributor"
  | "specialist"
  | "expert-voice"
  | "community-mentor"
  | "verified-authority";

export interface TrustLevelInfo {
  level: TrustLevel;
  minRep: number;
  weight: number;
}

// ── Badge System ──────────────────────────────────────────────────────────────
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type BadgeCategory =
  | "contribution"
  | "expertise"
  | "community"
  | "milestone"
  | "special"
  | "moderation";

export interface BadgeDefinition {
  _id: string;
  slug: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  icon: string;
  isAutomatic: boolean;
  sortOrder: number;
}

export interface EarnedBadge extends BadgeDefinition {
  earnedAt: string;
  awardedBy: "system" | "admin";
  message?: string;
}

// ── Reputation Events ─────────────────────────────────────────────────────────
export type ReputationEventType =
  | "post_created"
  | "post_upvoted"
  | "post_downvoted"
  | "comment_created"
  | "comment_upvoted"
  | "comment_downvoted"
  | "post_saved"
  | "accepted_solution"
  | "featured_post"
  | "daily_consistency"
  | "follow_gained"
  | "content_removed"
  | "spam_confirmed"
  | "admin_boost"
  | "admin_penalty"
  | "admin_badge_award"
  | "admin_reset"
  | "trust_level_promotion"
  | "achievement_unlocked"
  | "verification_bonus"
  | "mentorship_contribution";

export interface ReputationEvent {
  _id: string;
  targetUserId: string;
  sourceUserId?: {
    _id: string;
    name: string;
    profileImage: string;
    role: string;
  } | null;
  eventType: ReputationEventType;
  delta: number;
  balanceAfter: number;
  category: string;
  referenceModel?: string | null;
  referenceId?: string | null;
  weightMultiplier: number;
  reason: string;
  createdAt: string;
}

// ── Reputation Profile ────────────────────────────────────────────────────────
export interface ReputationProfile {
  user: {
    _id: string;
    name: string;
    reputationScore: number;
    trustLevel: TrustLevel;
    categoryReputation: Record<string, number>;
    currentStreak: number;
    longestStreak: number;
    badgeCount: number;
    isVerified: boolean;
    role: string;
  };
  badges: EarnedBadge[];
  recentEvents: ReputationEvent[];
  topCategories: Array<{ _id: string; total: number }>;
  trustLevelInfo: TrustLevelInfo;
  newBadges?: BadgeDefinition[];
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  _id: string;
  name: string;
  profileImage: string;
  role: string;
  specialization: string;
  isVerified: boolean;
  reputationScore: number;
  trustLevel: TrustLevel;
  periodGained?: number;
}
