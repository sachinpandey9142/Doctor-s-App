const User = require("../models/User");
const ReputationEvent = require("../models/ReputationEvent");
const Vote = require("../models/Vote");
const Badge = require("../models/Badge");
const UserBadge = require("../models/UserBadge");

// ── Scoring Table ─────────────────────────────────────────────────────────────
const ReputationEvents = {
  POST_CREATED: "post_created",
  POST_UPVOTED: "post_upvoted",
  POST_DOWNVOTED: "post_downvoted",
  COMMENT_CREATED: "comment_created",
  COMMENT_UPVOTED: "comment_upvoted",
  COMMENT_DOWNVOTED: "comment_downvoted",
  COMMENT_LIKED: "comment_upvoted",
  POST_LIKED: "post_upvoted",
  POST_SAVED: "post_saved",
  ACCEPTED_SOLUTION: "accepted_solution",
  FEATURED_POST: "featured_post",
  DAILY_CONSISTENCY: "daily_consistency",
  FOLLOW_GAINED: "follow_gained",
  CONTENT_REMOVED: "content_removed",
  SPAM_CONFIRMED: "spam_confirmed",
  ADMIN_BOOST: "admin_boost",
  ADMIN_PENALTY: "admin_penalty",
  VERIFICATION_BONUS: "verification_bonus",
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
  TRUST_LEVEL_PROMOTION: "trust_level_promotion",
};

// ─────────────────────────────────────────────────────────────────────────────
// BASE_DELTAS: raw flat values BEFORE any role/trust multiplier is applied.
// These numbers are intentionally small — the weighted vote system amplifies
// them only for high-credibility voters. For upvotes/downvotes the baseDelta
// acts as the "regular user" (weight ≈ 1) value.
// ─────────────────────────────────────────────────────────────────────────────
const BASE_DELTAS = {
  // ── Organic positive ──
  post_created:        2,   // Creating content = modest reward
  post_upvoted:        1,   // Regular user upvote baseline
  comment_created:     1,   // Small reward for participation
  comment_upvoted:     1,   // Regular user comment upvote baseline
  post_saved:          1,   // Someone bookmarked your post
  accepted_solution:   5,   // Post marked as accepted answer
  featured_post:      10,   // Admin-featured post
  daily_consistency:   1,   // Daily engagement streak reward
  follow_gained:       0,   // Follows do NOT grant reputation
  mentorship_contribution: 5, // Verified mentorship contribution

  // ── Organic negative ──
  post_downvoted:     -1,   // Regular user downvote baseline
  comment_downvoted:  -1,   // Regular user comment downvote baseline
  content_removed:   -10,   // Admin removed content
  spam_confirmed:    -25,   // Confirmed spam/abuse

  // ── System events ──
  verification_bonus:    20,  // One-time verified account bonus
  trust_level_promotion:  0,  // No auto-bonus for level up (milestone only)
  achievement_unlocked:   2,  // Automatic badge/achievement
};

// ── Trust Level Thresholds ────────────────────────────────────────────────────
// Thresholds raised significantly to reflect slower, prestigious progression.
// Weight multipliers are intentionally small to avoid compounding inflation.
const TRUST_LEVELS = [
  { level: "verified-authority", minRep: 15000, weight: 1.5 },
  { level: "community-mentor",   minRep:  7000, weight: 1.4 },
  { level: "expert-voice",       minRep:  3000, weight: 1.3 },
  { level: "specialist",         minRep:  1500, weight: 1.2 },
  { level: "senior-contributor", minRep:   700, weight: 1.1 },
  { level: "trusted-contributor",minRep:   300, weight: 1.05 },
  { level: "contributor",        minRep:   100, weight: 1.0 },
  { level: "new-member",         minRep:     0, weight: 1.0 },
];

// ── Role Weights ──────────────────────────────────────────────────────────────
// Each weight represents the MULTIPLIER on top of the base delta.
// Example: a doctor upvoting a post → baseDelta(1) × roleWeight(5) = +5
// These map to the desired per-role reputation values specified in the design:
//   regular user  → ×1  → +1 per upvote
//   medical-student → ×2 → +2
//   nurse          → ×3  → +3
//   doctor         → ×5  → +5
//   senior-contributor (trust) — handled via TRUST_LEVELS weight
//   moderator      → ×10 → +10  (use admin role for moderation actions)
//   admin          → ×15 → +15  (normal admin upvote)
const ROLE_WEIGHTS = {
  admin:              15.0,
  doctor:              5.0,
  nurse:               3.0,
  "lab-technician":    2.0,
  "medical-student":   2.0,
  "hospital-staff":    1.5,
  other:               1.0,
};

// ── Global limits ─────────────────────────────────────────────────────────────
// Daily cap is intentionally low to prevent rapid farming.
// Admin events bypass the daily cap by design.
const DAILY_REP_CAP = 50;         // Max organic rep per day
const MAX_VOTES_PER_HOUR = 30;    // Tighter rate limit (was 50)
const SAME_USER_DIMINISHING_THRESHOLD = 3; // Diminishing starts sooner (was 5)

// ── Helper: Calculate vote weight ─────────────────────────────────────────────
// Weight = roleWeight × trustWeight (no separate verified bonus to avoid stacking).
// The "isVerified" bonus is removed — it was causing hidden inflation. Instead,
// verification is a one-time bonus event (VERIFICATION_BONUS) only.
const calculateVoteWeight = (voter) => {
  const roleWeight = ROLE_WEIGHTS[voter.role] || 1.0;
  const trustEntry = TRUST_LEVELS.find(
    (t) => (voter.reputationScore || 0) >= t.minRep
  );
  const trustWeight = trustEntry ? trustEntry.weight : 1.0;
  // Cap combined weight so no single voter can exceed ×20
  const combined = roleWeight * trustWeight;
  return Math.round(Math.min(combined, 20.0) * 100) / 100;
};

// ── Helper: Resolve trust level from score ────────────────────────────────────
const resolveTrustLevel = (score) => {
  const entry = TRUST_LEVELS.find((t) => score >= t.minRep);
  return entry ? entry.level : "new-member";
};

// ── Helper: Get today's date string ───────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Anti-abuse: Check rate limits ─────────────────────────────────────────────
const checkRateLimits = async (voterId) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentVotes = await Vote.countDocuments({
    voterId,
    createdAt: { $gte: oneHourAgo },
  });
  if (recentVotes >= MAX_VOTES_PER_HOUR) {
    return { blocked: true, reason: "Rate limit: too many votes per hour" };
  }
  return { blocked: false };
};

// ── Anti-abuse: Diminishing returns for same-user interactions ─────────────────
// Stricter than before: threshold lowered from 5 → 3, and decay is sharper.
const getDiminishingMultiplier = async (voterId, targetOwnerId) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentInteractions = await Vote.countDocuments({
    voterId,
    targetOwnerId,
    createdAt: { $gte: oneDayAgo },
  });
  if (recentInteractions >= SAME_USER_DIMINISHING_THRESHOLD) return 0; // zero at threshold (now 3)
  if (recentInteractions >= 2) return 0.25; // third interaction = 25%
  if (recentInteractions >= 1) return 0.5;  // second interaction = 50%
  return 1.0;                               // first interaction = full
};

// ── Anti-abuse: Daily cap check ───────────────────────────────────────────────
const checkDailyCap = (user, delta) => {
  if (delta <= 0) return delta; // Negative rep is never capped
  const today = todayStr();
  const gained = user.dailyRepDate === today ? user.dailyRepGained || 0 : 0;
  const remaining = Math.max(0, DAILY_REP_CAP - gained);
  return Math.min(delta, remaining);
};

// ── Core: Record reputation event ─────────────────────────────────────────────
const recordReputationEvent = async (
  targetUserId,
  eventType,
  delta,
  options = {}
) => {
  if (!targetUserId || !eventType) return null;

  const user = await User.findById(targetUserId);
  if (!user) return null;

  // Apply daily cap for positive organic events (not admin actions)
  let finalDelta = delta;
  if (!eventType.startsWith("admin_")) {
    finalDelta = checkDailyCap(user, delta);
  }
  if (finalDelta === 0) return null;

  // Update user score atomically
  const today = todayStr();
  const newScore = Math.max(0, (user.reputationScore || 0) + finalDelta);

  const updateFields = {
    reputationScore: newScore,
  };

  // Update daily tracking
  if (finalDelta > 0) {
    if (user.dailyRepDate === today) {
      updateFields.dailyRepGained = (user.dailyRepGained || 0) + finalDelta;
    } else {
      updateFields.dailyRepGained = finalDelta;
      updateFields.dailyRepDate = today;
    }
  }

  // Update trust level
  const newTrustLevel = resolveTrustLevel(newScore);
  if (newTrustLevel !== user.trustLevel) {
    updateFields.trustLevel = newTrustLevel;
  }

  // Update category reputation
  const category = options.category || "general";
  if (category !== "general") {
    const catKey = `categoryReputation.${category}`;
    const currentCatRep =
      (user.categoryReputation && user.categoryReputation.get
        ? user.categoryReputation.get(category)
        : 0) || 0;
    updateFields[catKey] = Math.max(0, currentCatRep + finalDelta);
  }

  // Update streak
  if (finalDelta > 0) {
    const lastActive = user.lastActiveDate || "";
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    if (lastActive === yesterday) {
      updateFields.currentStreak = (user.currentStreak || 0) + 1;
      updateFields.longestStreak = Math.max(
        user.longestStreak || 0,
        updateFields.currentStreak
      );
    } else if (lastActive !== today) {
      updateFields.currentStreak = 1;
    }
    updateFields.lastActiveDate = today;
  }

  await User.findByIdAndUpdate(targetUserId, { $set: updateFields });

  // Create event log
  const event = await ReputationEvent.create({
    targetUserId,
    sourceUserId: options.sourceUserId || null,
    eventType,
    delta: finalDelta,
    balanceAfter: newScore,
    category,
    referenceModel: options.referenceModel || null,
    referenceId: options.referenceId || null,
    weightMultiplier: options.weightMultiplier || 1.0,
    reason: options.reason || "",
    moderatorNote: options.moderatorNote || "",
  });

  // Check trust level promotion
  if (updateFields.trustLevel && updateFields.trustLevel !== user.trustLevel) {
    await ReputationEvent.create({
      targetUserId,
      eventType: "trust_level_promotion",
      delta: BASE_DELTAS.trust_level_promotion,
      balanceAfter: newScore + BASE_DELTAS.trust_level_promotion,
      category: "general",
      reason: `Promoted to ${updateFields.trustLevel}`,
    });
  }

  return { event, newScore, trustLevel: updateFields.trustLevel || user.trustLevel };
};

// ── Public API: Simple reputation increase (backward compatible) ──────────────
const increaseReputation = async (userId, eventTypeOrDelta, options = {}) => {
  // Backward compatibility: if eventTypeOrDelta is a number, use old behavior
  if (typeof eventTypeOrDelta === "number") {
    return recordReputationEvent(userId, "post_created", eventTypeOrDelta, options);
  }

  const baseDelta = BASE_DELTAS[eventTypeOrDelta] || 0;
  if (baseDelta === 0) return null;

  return recordReputationEvent(userId, eventTypeOrDelta, baseDelta, options);
};

// ── Public API: Weighted vote ─────────────────────────────────────────────────
const processWeightedVote = async (
  voterId,
  targetModel,
  targetId,
  targetOwnerId,
  direction,
  category = "general"
) => {
  // Self-vote prevention
  if (String(voterId) === String(targetOwnerId)) return null;

  // Rate limit check
  const rateCheck = await checkRateLimits(voterId);
  if (rateCheck.blocked) return { error: rateCheck.reason };

  // Check for existing vote
  const existingVote = await Vote.findOne({
    voterId,
    targetModel,
    targetId,
  });

  const voter = await User.findById(voterId);
  if (!voter) return null;

  const weight = calculateVoteWeight(voter);
  const diminishing = await getDiminishingMultiplier(voterId, targetOwnerId);

  if (existingVote) {
    if (existingVote.direction === direction) {
      // Remove vote (toggle off)
      const reverseDelta = -existingVote.reputationDelta;
      await existingVote.deleteOne();
      if (reverseDelta !== 0) {
        await recordReputationEvent(
          targetOwnerId,
          direction === "up" ? "post_downvoted" : "post_upvoted",
          reverseDelta,
          { sourceUserId: voterId, referenceModel: targetModel, referenceId: targetId, category }
        );
      }
      return { action: "removed", delta: reverseDelta };
    }
    // Change direction
    const oldDelta = existingVote.reputationDelta;
    const baseEventType = direction === "up" ? "post_upvoted" : "post_downvoted";
    const baseDelta = BASE_DELTAS[baseEventType] || 0;
    const newDelta = Math.round(baseDelta * weight * diminishing);
    const totalDelta = newDelta - oldDelta;

    existingVote.direction = direction;
    existingVote.weight = weight;
    existingVote.reputationDelta = newDelta;
    await existingVote.save();

    if (totalDelta !== 0) {
      await recordReputationEvent(targetOwnerId, baseEventType, totalDelta, {
        sourceUserId: voterId,
        referenceModel: targetModel,
        referenceId: targetId,
        weightMultiplier: weight,
        category,
      });
    }
    return { action: "changed", delta: totalDelta };
  }

  // New vote
  const baseEventType = direction === "up"
    ? (targetModel === "Comment" ? "comment_upvoted" : "post_upvoted")
    : (targetModel === "Comment" ? "comment_downvoted" : "post_downvoted");
  const baseDelta = BASE_DELTAS[baseEventType] || 0;
  const finalDelta = Math.round(baseDelta * weight * diminishing);

  await Vote.create({
    voterId,
    targetModel,
    targetId,
    targetOwnerId,
    direction,
    weight,
    voterTrustLevel: voter.trustLevel || "new-member",
    voterRole: voter.role,
    category,
    reputationDelta: finalDelta,
  });

  if (finalDelta !== 0) {
    await recordReputationEvent(targetOwnerId, baseEventType, finalDelta, {
      sourceUserId: voterId,
      referenceModel: targetModel,
      referenceId: targetId,
      weightMultiplier: weight,
      category,
    });
  }

  return { action: "created", delta: finalDelta, weight };
};

// ── Admin: Manual adjustment ──────────────────────────────────────────────────
const adminAdjustReputation = async (
  adminUserId,
  targetUserId,
  delta,
  reason,
  moderatorNote = ""
) => {
  const eventType = delta >= 0 ? "admin_boost" : "admin_penalty";
  return recordReputationEvent(targetUserId, eventType, delta, {
    sourceUserId: adminUserId,
    reason,
    moderatorNote,
  });
};

// ── Admin: Suppress trust ─────────────────────────────────────────────────────
const adminSuppressTrust = async (adminUserId, targetUserId, durationHours, reason) => {
  const until = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  await User.findByIdAndUpdate(targetUserId, {
    trustSuppressed: true,
    trustSuppressedUntil: until,
  });
  await recordReputationEvent(targetUserId, "admin_penalty", 0, {
    sourceUserId: adminUserId,
    reason: `Trust suppressed for ${durationHours}h: ${reason}`,
  });
  return { suppressed: true, until };
};

// ── Query: Get reputation profile ─────────────────────────────────────────────
const getReputationProfile = async (userId) => {
  const user = await User.findById(userId).select(
    "name reputationScore trustLevel categoryReputation currentStreak longestStreak badgeCount isVerified role"
  );
  if (!user) return null;

  const [badges, recentEvents, topCategory] = await Promise.all([
    UserBadge.find({ userId }).populate("badgeId").sort({ createdAt: -1 }).limit(10).lean(),
    ReputationEvent.find({ targetUserId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    ReputationEvent.aggregate([
      { $match: { targetUserId: user._id, delta: { $gt: 0 }, category: { $ne: "general" } } },
      { $group: { _id: "$category", total: { $sum: "$delta" } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    user: user.toJSON(),
    badges: badges.map((ub) => ({
      ...ub.badgeId,
      earnedAt: ub.createdAt,
      awardedBy: ub.awardedBy,
    })),
    recentEvents,
    topCategories: topCategory,
    trustLevelInfo: TRUST_LEVELS.find(
      (t) => t.level === (user.trustLevel || "new-member")
    ),
  };
};

// ── Query: Get reputation history (paginated) ─────────────────────────────────
const getReputationHistory = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [events, total] = await Promise.all([
    ReputationEvent.find({ targetUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sourceUserId", "name profileImage role")
      .lean(),
    ReputationEvent.countDocuments({ targetUserId: userId }),
  ]);

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

// ── Query: Leaderboard ────────────────────────────────────────────────────────
const getLeaderboard = async (options = {}) => {
  const { period = "all", category = null, limit = 25 } = options;

  if (category) {
    const catKey = `categoryReputation.${category}`;
    return User.find({ [catKey]: { $gt: 0 } })
      .sort({ [catKey]: -1 })
      .limit(limit)
      .select("name profileImage role specialization isVerified reputationScore trustLevel categoryReputation")
      .lean();
  }

  if (period === "weekly" || period === "monthly") {
    const since = new Date();
    if (period === "weekly") since.setDate(since.getDate() - 7);
    else since.setMonth(since.getMonth() - 1);

    const results = await ReputationEvent.aggregate([
      { $match: { createdAt: { $gte: since }, delta: { $gt: 0 } } },
      { $group: { _id: "$targetUserId", gained: { $sum: "$delta" } } },
      { $sort: { gained: -1 } },
      { $limit: limit },
    ]);

    const userIds = results.map((r) => r._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name profileImage role specialization isVerified reputationScore trustLevel")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    return results
      .map((r) => ({ ...userMap.get(String(r._id)), periodGained: r.gained }))
      .filter(Boolean);
  }

  return User.find({ reputationScore: { $gt: 0 } })
    .sort({ reputationScore: -1 })
    .limit(limit)
    .select("name profileImage role specialization isVerified reputationScore trustLevel")
    .lean();
};

// ── Badge: Check and award automatic badges ───────────────────────────────────
const checkAndAwardBadges = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];

  const autoBadges = await Badge.find({ isAutomatic: true, isActive: true }).lean();
  const existingBadgeIds = new Set(
    (await UserBadge.find({ userId }).select("badgeId").lean()).map((ub) =>
      String(ub.badgeId)
    )
  );

  const awarded = [];
  for (const badge of autoBadges) {
    if (existingBadgeIds.has(String(badge._id))) continue;

    let earned = false;
    const criteriaType = badge.criteria?.type;
    const criteriaValue = badge.criteria?.value || 0;

    if (criteriaType === "reputation_threshold") {
      earned = (user.reputationScore || 0) >= criteriaValue;
    } else if (criteriaType === "follower_count") {
      earned = (user.followers?.length || 0) >= criteriaValue;
    } else if (criteriaType === "streak_days") {
      earned = (user.longestStreak || 0) >= criteriaValue;
    }

    if (earned) {
      await UserBadge.create({ userId, badgeId: badge._id, awardedBy: "system" });
      await User.findByIdAndUpdate(userId, { $inc: { badgeCount: 1 } });
      awarded.push(badge);
    }
  }

  return awarded;
};

// ── Badge: Admin award ────────────────────────────────────────────────────────
const adminAwardBadge = async (adminUserId, targetUserId, badgeId, message = "") => {
  const badge = await Badge.findById(badgeId);
  if (!badge) return null;

  const existing = await UserBadge.findOne({ userId: targetUserId, badgeId });
  if (existing) return { alreadyAwarded: true };

  await UserBadge.create({
    userId: targetUserId,
    badgeId,
    awardedBy: "admin",
    awardedByUserId: adminUserId,
    message,
  });
  await User.findByIdAndUpdate(targetUserId, { $inc: { badgeCount: 1 } });

  // Badge awards grant a small fixed bonus — not inflatable by role weight
  await recordReputationEvent(targetUserId, "admin_badge_award", 3, {
    sourceUserId: adminUserId,
    referenceModel: "Badge",
    referenceId: badgeId,
    reason: `Awarded badge: ${badge.name}`,
  });

  return badge;
};

module.exports = {
  ReputationEvents,
  BASE_DELTAS,
  TRUST_LEVELS,
  ROLE_WEIGHTS,
  calculateVoteWeight,
  resolveTrustLevel,
  increaseReputation,
  recordReputationEvent,
  processWeightedVote,
  adminAdjustReputation,
  adminSuppressTrust,
  getReputationProfile,
  getReputationHistory,
  getLeaderboard,
  checkAndAwardBadges,
  adminAwardBadge,
};
