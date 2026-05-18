const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const {
  getReputationProfile,
  getReputationHistory,
  getLeaderboard,
  adminAdjustReputation,
  adminSuppressTrust,
  adminAwardBadge,
  checkAndAwardBadges,
  TRUST_LEVELS,
} = require("../services/reputationService");
const Badge = require("../models/Badge");
const UserBadge = require("../models/UserBadge");
const User = require("../models/User");

// ── Public: Get reputation profile ────────────────────────────────────────────
const getProfile = catchAsync(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const profile = await getReputationProfile(userId);
  if (!profile) throw new ApiError(404, "User not found");

  // Check for new badge awards
  const newBadges = await checkAndAwardBadges(userId);

  res.status(200).json({
    success: true,
    data: { ...profile, newBadges },
  });
});

// ── Public: Get reputation history ────────────────────────────────────────────
const getHistory = catchAsync(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const result = await getReputationHistory(userId, page, limit);

  res.status(200).json({
    success: true,
    data: result.events,
    pagination: result.pagination,
  });
});

// ── Public: Get leaderboard ───────────────────────────────────────────────────
const leaderboard = catchAsync(async (req, res) => {
  const period = req.query.period || "all";
  const category = req.query.category || null;
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

  const leaders = await getLeaderboard({ period, category, limit });

  res.status(200).json({
    success: true,
    data: leaders,
  });
});

// ── Public: Get trust levels info ─────────────────────────────────────────────
const getTrustLevels = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: TRUST_LEVELS,
  });
});

// ── Public: Get all badge definitions ─────────────────────────────────────────
const getBadges = catchAsync(async (req, res) => {
  const badges = await Badge.find({ isActive: true })
    .sort({ category: 1, sortOrder: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: badges,
  });
});

// ── Public: Get user's badges ─────────────────────────────────────────────────
const getUserBadges = catchAsync(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const badges = await UserBadge.find({ userId })
    .populate("badgeId")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: badges.filter((b) => b.badgeId).map((b) => ({
      ...b.badgeId,
      earnedAt: b.createdAt,
      awardedBy: b.awardedBy,
      message: b.message,
    })),
  });
});

// ── Admin: Adjust reputation ──────────────────────────────────────────────────
const adjustReputation = catchAsync(async (req, res) => {
  const { targetUserId, delta, reason, moderatorNote } = req.body;

  if (!targetUserId) throw new ApiError(400, "targetUserId is required");
  if (typeof delta !== "number" || delta === 0)
    throw new ApiError(400, "delta must be a non-zero number");
  if (Math.abs(delta) > 500)
    throw new ApiError(400, "delta must be between -500 and +500");
  if (!reason || !reason.trim())
    throw new ApiError(400, "Reason is mandatory for admin reputation changes");

  const result = await adminAdjustReputation(
    req.user._id,
    targetUserId,
    delta,
    reason.trim(),
    (moderatorNote || "").trim()
  );

  if (!result) throw new ApiError(404, "Target user not found");

  // Emit realtime update
  const io = req.app.get("io");
  if (io) {
    io.to(`user:${targetUserId}`).emit("reputationUpdate", {
      newScore: result.newScore,
      trustLevel: result.trustLevel,
      delta,
      eventType: delta >= 0 ? "admin_boost" : "admin_penalty",
    });
  }

  res.status(200).json({
    success: true,
    data: result,
    message: `Reputation ${delta >= 0 ? "boosted" : "reduced"} by ${Math.abs(delta)}`,
  });
});

// ── Admin: Suppress trust ─────────────────────────────────────────────────────
const suppressTrust = catchAsync(async (req, res) => {
  const { targetUserId, durationHours, reason } = req.body;

  if (!targetUserId) throw new ApiError(400, "targetUserId is required");
  if (!durationHours || durationHours < 1 || durationHours > 8760)
    throw new ApiError(400, "durationHours must be 1-8760");
  if (!reason || !reason.trim())
    throw new ApiError(400, "Reason is mandatory");

  const result = await adminSuppressTrust(
    req.user._id,
    targetUserId,
    durationHours,
    reason.trim()
  );

  res.status(200).json({ success: true, data: result });
});

// ── Admin: Award badge ────────────────────────────────────────────────────────
const awardBadge = catchAsync(async (req, res) => {
  const { targetUserId, badgeId, message } = req.body;

  if (!targetUserId) throw new ApiError(400, "targetUserId is required");
  if (!badgeId) throw new ApiError(400, "badgeId is required");

  const result = await adminAwardBadge(
    req.user._id,
    targetUserId,
    badgeId,
    (message || "").trim()
  );

  if (!result) throw new ApiError(404, "Badge not found");
  if (result.alreadyAwarded)
    throw new ApiError(409, "User already has this badge");

  // Emit realtime update
  const io = req.app.get("io");
  if (io) {
    io.to(`user:${targetUserId}`).emit("badgeAwarded", {
      badge: result,
    });
  }

  res.status(200).json({
    success: true,
    data: result,
    message: `Badge "${result.name}" awarded successfully`,
  });
});

// ── Admin: Get reputation audit for a user ────────────────────────────────────
const getAudit = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  if (!userId) throw new ApiError(400, "userId is required");

  const user = await User.findById(userId)
    .select("name reputationScore trustLevel role isVerified isBlocked trustSuppressed trustSuppressedUntil")
    .lean();

  if (!user) throw new ApiError(404, "User not found");

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

  const history = await getReputationHistory(userId, page, limit);

  res.status(200).json({
    success: true,
    data: { user, ...history },
  });
});

module.exports = {
  getProfile,
  getHistory,
  leaderboard,
  getTrustLevels,
  getBadges,
  getUserBadges,
  adjustReputation,
  suppressTrust,
  awardBadge,
  getAudit,
};
