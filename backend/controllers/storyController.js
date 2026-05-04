const Story = require("../models/Story");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const storyUserProjection = "name profileImage role isVerified specialization reputationScore followers following";

const canViewStory = (story, viewer) => {
  if (!viewer) {
    return false;
  }

  if (String(story.userId._id || story.userId) === String(viewer._id)) {
    return true;
  }

  if (story.visibility === "public") {
    return true;
  }

  return (viewer.following || []).some((id) => String(id) === String(story.userId._id || story.userId));
};

const normalizeStory = (story, viewerId) => ({
  ...story,
  isSeen: (story.viewers || []).some((id) => String(id) === String(viewerId)),
  viewerCount: story.viewers?.length || 0
});

const createStory = catchAsync(async (req, res) => {
  const mediaUrl = String(req.body.mediaUrl || "").trim();
  const type = String(req.body.type || "").trim();
  const caption = String(req.body.caption || "").trim();
  const visibility = String(req.body.visibility || "followers").trim();

  if (!mediaUrl) {
    throw new ApiError(400, "Story mediaUrl is required");
  }

  const story = await Story.create({
    userId: req.user._id,
    mediaUrl,
    type,
    caption,
    visibility,
    expiresAt: new Date(Date.now() + STORY_LIFETIME_MS)
  });

  const hydratedStory = await Story.findById(story._id).populate("userId", storyUserProjection).lean();

  res.status(201).json({
    success: true,
    data: normalizeStory(hydratedStory, req.user._id)
  });
});

const getStoryFeed = catchAsync(async (req, res) => {
  const now = new Date();
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 50);

  const visibleFilter = {
    expiresAt: { $gt: now },
    $or: [
      { visibility: "public" },
      { userId: req.user._id },
      { userId: { $in: req.user.following || [] }, visibility: "followers" }
    ]
  };

  const stories = await Story.find(visibleFilter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", storyUserProjection)
    .lean();

  const grouped = new Map();

  for (const story of stories) {
    if (!canViewStory(story, req.user)) {
      continue;
    }

    const userId = String(story.userId._id || story.userId);
    const existing = grouped.get(userId) || {
      user: story.userId,
      stories: [],
      latestStoryAt: story.createdAt,
      hasUnseen: false
    };

    existing.stories.push(normalizeStory(story, req.user._id));
    existing.latestStoryAt = story.createdAt;
    existing.hasUnseen = existing.hasUnseen || !story.viewers.some((id) => String(id) === String(req.user._id));
    grouped.set(userId, existing);
  }

  const groups = Array.from(grouped.values()).sort((a, b) => {
    if (a.hasUnseen !== b.hasUnseen) {
      return a.hasUnseen ? -1 : 1;
    }

    return new Date(b.latestStoryAt).getTime() - new Date(a.latestStoryAt).getTime();
  });

  res.status(200).json({
    success: true,
    data: groups
  });
});

const viewStory = catchAsync(async (req, res) => {
  const story = await Story.findById(req.params.id)
    .populate("userId", storyUserProjection)
    .lean();

  if (!story) {
    throw new ApiError(404, "Story not found");
  }

  if (story.expiresAt && new Date(story.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(410, "Story has expired");
  }

  const hydratedStory = normalizeStory(story, req.user._id);
  if (!canViewStory(hydratedStory, req.user)) {
    throw new ApiError(403, "You do not have permission to view this story");
  }

  const updated = await Story.findByIdAndUpdate(
    story._id,
    { $addToSet: { viewers: req.user._id } },
    { new: true }
  )
    .populate("userId", storyUserProjection)
    .lean();

  res.status(200).json({
    success: true,
    data: normalizeStory(updated, req.user._id)
  });
});

module.exports = {
  createStory,
  getStoryFeed,
  viewStory
};