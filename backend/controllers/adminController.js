const User = require("../models/User");
const Post = require("../models/Post");
const ReputationEvent = require("../models/ReputationEvent");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const getUsers = catchAsync(async (req, res) => {
  const users = await User.find()
    .sort({ createdAt: -1 })
    .select("-password -__v -moderationNotes");
  res.status(200).json({ success: true, data: users });
});

const verifyUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  const wasVerified = user.isVerified;
  user.isVerified = true;
  await user.save();

  // Award verification reputation bonus if first time
  if (!wasVerified) {
    const {
      increaseReputation,
      ReputationEvents,
    } = require("../services/reputationService");
    await increaseReputation(user._id, ReputationEvents.VERIFICATION_BONUS, {
      sourceUserId: req.user._id,
      reason: "Account verified by admin",
    });
  }

  res.status(200).json({ success: true, data: user });
});

const blockUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  user.isBlocked = true;
  await user.save();
  res.status(200).json({ success: true, data: user });
});

const unblockUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  user.isBlocked = false;
  await user.save();
  res.status(200).json({ success: true, data: user });
});

const getOrganizations = catchAsync(async (req, res) => {
  const orgs = await User.aggregate([
    { $match: { hospital: { $ne: "" } } },
    { $group: { _id: "$hospital", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  res.status(200).json({ success: true, data: orgs });
});

const deletePost = catchAsync(async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) throw new ApiError(404, "Post not found");

  // Record reputation penalty for content removal
  const { recordReputationEvent } = require("../services/reputationService");
  await recordReputationEvent(post.userId, "content_removed", -10, {
    sourceUserId: req.user._id,
    referenceModel: "Post",
    referenceId: post._id,
    reason: "Post removed by admin",
  });

  res.status(200).json({ success: true, data: {} });
});

// ── Reputation analytics ──────────────────────────────────────────────────────
const getReputationAnalytics = catchAsync(async (req, res) => {
  const [
    totalEvents,
    recentPenalties,
    topGainers,
    eventBreakdown,
  ] = await Promise.all([
    ReputationEvent.countDocuments(),
    ReputationEvent.find({ eventType: { $in: ["admin_penalty", "spam_confirmed", "content_removed"] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("targetUserId", "name profileImage role")
      .populate("sourceUserId", "name role")
      .lean(),
    ReputationEvent.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) }, delta: { $gt: 0 } } },
      { $group: { _id: "$targetUserId", gained: { $sum: "$delta" } } },
      { $sort: { gained: -1 } },
      { $limit: 10 },
    ]),
    ReputationEvent.aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 }, totalDelta: { $sum: "$delta" } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  // Hydrate top gainers
  const gainerIds = topGainers.map((g) => g._id);
  const gainerUsers = await User.find({ _id: { $in: gainerIds } })
    .select("name profileImage role reputationScore trustLevel")
    .lean();
  const gainerMap = new Map(gainerUsers.map((u) => [String(u._id), u]));

  res.status(200).json({
    success: true,
    data: {
      totalEvents,
      recentPenalties,
      topGainers: topGainers.map((g) => ({
        user: gainerMap.get(String(g._id)),
        gained: g.gained,
      })).filter((g) => g.user),
      eventBreakdown,
    },
  });
});

module.exports = {
  getUsers,
  verifyUser,
  blockUser,
  unblockUser,
  getOrganizations,
  deletePost,
  getReputationAnalytics,
};
