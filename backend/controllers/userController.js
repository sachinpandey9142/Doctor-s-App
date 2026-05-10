const User = require("../models/User");
const Post = require("../models/Post");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");

const RELATION_PROJECTION =
  "name email role specialization hospital experience isVerified reputationScore profileImage followers following createdAt";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRelationPage = (items, page, limit) => {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;

  return {
    items: items.slice(startIndex, startIndex + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasMore: totalPages > 0 && safePage < totalPages,
    },
  };
};

const sortRelationUsers = (items) =>
  [...items].sort((left, right) => {
    const verifiedDelta =
      Number(Boolean(right.isVerified)) - Number(Boolean(left.isVerified));
    if (verifiedDelta !== 0) {
      return verifiedDelta;
    }

    const reputationDelta =
      Number(right.reputationScore || 0) - Number(left.reputationScore || 0);
    if (reputationDelta !== 0) {
      return reputationDelta;
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });

const getRelationList = async (userId, field, req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const query = String(req.query.q || "").trim();

  const user = await User.findById(userId).populate(field, RELATION_PROJECTION);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const matcher = query ? new RegExp(escapeRegex(query), "i") : null;
  const relationUsers = sortRelationUsers(
    (user[field] || [])
      .filter((item) => {
        if (!matcher) {
          return true;
        }

        const role = String(item.role || "").replace(/-/g, " ");
        return [item.name, item.specialization, item.hospital, role].some(
          (value) => matcher.test(String(value || "")),
        );
      })
      .map((item) => (item.toJSON ? item.toJSON() : item)),
  );

  const paged = buildRelationPage(relationUsers, page, limit);

  res.status(200).json({
    success: true,
    data: paged.items,
    pagination: paged.pagination,
  });
};

const getUserById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password -__v");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

const updateUser = catchAsync(async (req, res) => {
  // NOTE: "role" is intentionally excluded — users cannot self-promote.
  // Role changes require admin privileges via a separate endpoint.
  const allowedFields = [
    "name",
    "specialization",
    "hospital",
    "experience",
    "profileImage",
    "coverImage",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select("-password -__v");

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

const getUserPosts = catchAsync(async (req, res) => {
  const posts = await Post.find({ userId: req.params.id })
    .sort({ createdAt: -1 })
    .populate(
      "userId",
      "name profileImage role isVerified specialization reputationScore",
    )
    .lean();

  res.status(200).json({
    success: true,
    data: posts,
  });
});

const searchUsers = catchAsync(async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 25);

  if (!query) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  const matcher = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { name: matcher },
      { specialization: matcher },
      { hospital: matcher },
      { role: matcher },
    ],
  })
    .sort({ isVerified: -1, reputationScore: -1, createdAt: -1 })
    .limit(limit)
    .select("-password -__v")
    .lean();

  res.status(200).json({
    success: true,
    data: users,
  });
});

const getSuggestedUsers = catchAsync(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 25);
  const excludedIds = [req.user._id, ...(req.user.following || [])];

  const users = await User.find({
    _id: { $nin: excludedIds },
  })
    .sort({ isVerified: -1, reputationScore: -1, createdAt: -1 })
    .limit(limit)
    .select("-password -__v")
    .lean();

  res.status(200).json({
    success: true,
    data: users,
  });
});

const followUser = catchAsync(async (req, res) => {
  const targetUserId = req.params.targetUserId;

  if (String(targetUserId) === String(req.user._id)) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  const targetUser = await User.findById(targetUserId).select("-password -__v");
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  const alreadyFollowing = (req.user.following || []).some(
    (id) => String(id) === String(targetUserId),
  );

  if (!alreadyFollowing) {
    await Promise.all([
      User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { following: targetUserId } },
        { new: true },
      ),
      User.findByIdAndUpdate(
        targetUserId,
        { $addToSet: { followers: req.user._id } },
        { new: true },
      ),
    ]);

    await createNotification({
      userId: targetUserId,
      type: "follow",
      title: "New follower",
      body: `${req.user.name} started following you`,
      referenceId: String(req.user._id),
      triggerUserId: req.user._id,
    });
  }

  const viewer = await User.findById(req.user._id).select("-password -__v");
  const target = await User.findById(targetUserId).select("-password -__v");

  res.status(200).json({
    success: true,
    data: {
      viewer,
      target,
      following: true,
    },
  });
});

const unfollowUser = catchAsync(async (req, res) => {
  const targetUserId = req.params.targetUserId;

  if (String(targetUserId) === String(req.user._id)) {
    throw new ApiError(400, "You cannot unfollow yourself");
  }

  const targetExists = await User.exists({ _id: targetUserId });
  if (!targetExists) {
    throw new ApiError(404, "User not found");
  }

  await Promise.all([
    User.findByIdAndUpdate(
      req.user._id,
      { $pull: { following: targetUserId } },
      { new: true },
    ),
    User.findByIdAndUpdate(
      targetUserId,
      { $pull: { followers: req.user._id } },
      { new: true },
    ),
  ]);

  const viewer = await User.findById(req.user._id).select("-password -__v");
  const target = await User.findById(targetUserId).select("-password -__v");

  res.status(200).json({
    success: true,
    data: {
      viewer,
      target,
      following: false,
    },
  });
});

const getFollowers = catchAsync(async (req, res) => {
  return getRelationList(req.params.id, "followers", req, res);
});

const getFollowing = catchAsync(async (req, res) => {
  return getRelationList(req.params.id, "following", req, res);
});

const removeFollower = catchAsync(async (req, res) => {
  const targetUserId = req.params.targetUserId;
  const followerId = req.params.followerId;

  if (
    String(req.user._id) !== String(targetUserId) &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(
      403,
      "You can only remove followers from your own profile",
    );
  }

  if (String(targetUserId) === String(followerId)) {
    throw new ApiError(400, "You cannot remove yourself");
  }

  const [targetExists, followerExists] = await Promise.all([
    User.exists({ _id: targetUserId }),
    User.exists({ _id: followerId }),
  ]);

  if (!targetExists || !followerExists) {
    throw new ApiError(404, "User not found");
  }

  await Promise.all([
    User.findByIdAndUpdate(
      targetUserId,
      { $pull: { followers: followerId } },
      { new: true },
    ),
    User.findByIdAndUpdate(
      followerId,
      { $pull: { following: targetUserId } },
      { new: true },
    ),
  ]);

  const viewer = await User.findById(req.user._id).select("-password -__v");
  const target = await User.findById(targetUserId).select("-password -__v");

  res.status(200).json({
    success: true,
    data: {
      viewer,
      target,
      removedFollowerId: followerId,
    },
  });
});

module.exports = {
  getUserById,
  updateUser,
  getUserPosts,
  searchUsers,
  getSuggestedUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  removeFollower,
};
