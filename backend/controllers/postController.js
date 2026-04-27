const Post = require("../models/Post");
const Comment = require("../models/Comment");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");
const { ReputationEvents, increaseReputation } = require("../services/reputationService");

const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const createPost = catchAsync(async (req, res) => {
  const {
    content,
    mediaUrl = "",
    type = "text",
    symptoms = "",
    observations = "",
    reportImages = [],
    isAnonymous = false
  } = req.body;

  const sanitizedContent = String(content || "").trim();

  if (!sanitizedContent) {
    throw new ApiError(400, "Post content is required");
  }

  if (!req.user.isVerified) {
    throw new ApiError(403, "You must be verified to post.");
  }

  if (type === "case") {
    if (!String(symptoms || "").trim() || !String(observations || "").trim()) {
      throw new ApiError(400, "Case discussion posts require symptoms and observations");
    }
  }

  const post = await Post.create({
    userId: req.user._id,
    content: sanitizedContent,
    mediaUrl: String(mediaUrl || "").trim(),
    type,
    symptoms: type === "case" ? String(symptoms || "").trim() : "",
    observations: type === "case" ? String(observations || "").trim() : "",
    reportImages: Array.isArray(reportImages) ? reportImages : [],
    isAnonymous: Boolean(isAnonymous)
  });

  await increaseReputation(req.user._id, ReputationEvents.POST_CREATED);

  const hydratedPost = await Post.findById(post._id).populate(
    "userId",
    "name profileImage role isVerified specialization reputationScore"
  );

  res.status(201).json({
    success: true,
    data: hydratedPost
  });
});

const getPosts = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const typeFilter = req.query.type ? { type: req.query.type } : {};

  const [posts, total] = await Promise.all([
    Post.find(typeFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name profileImage role isVerified specialization reputationScore")
      .lean(),
    Post.countDocuments(typeFilter)
  ]);

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

const getCaseDiscussions = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [posts, total] = await Promise.all([
    Post.find({ type: "case" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name profileImage role isVerified specialization reputationScore")
      .lean(),
    Post.countDocuments({ type: "case" })
  ]);

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

const likePost = catchAsync(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const likedAlready = post.likes.some((id) => String(id) === String(req.user._id));

  if (likedAlready) {
    post.likes = post.likes.filter((id) => String(id) !== String(req.user._id));
  } else {
    post.likes.push(req.user._id);

    if (String(post.userId) !== String(req.user._id)) {
      await increaseReputation(post.userId, ReputationEvents.POST_LIKED);
      await createNotification({
        userId: post.userId,
        type: "like",
        title: "Your post received a new like",
        body: `${req.user.name} liked your post`,
        referenceId: String(post._id),
        triggerUserId: req.user._id
      });
    }
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: {
      postId: post._id,
      liked: !likedAlready,
      likesCount: post.likes.length
    }
  });
});

const commentPost = catchAsync(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const text = String(req.body.text || "").trim();
  if (!text) {
    throw new ApiError(400, "Comment text is required");
  }

  const comment = await Comment.create({
    postId: post._id,
    userId: req.user._id,
    text
  });

  post.commentCount += 1;
  await post.save();

  await increaseReputation(req.user._id, ReputationEvents.COMMENT_CREATED);

  if (String(post.userId) !== String(req.user._id)) {
    await createNotification({
      userId: post.userId,
      type: "comment",
      title: "New comment on your post",
      body: `${req.user.name} commented on your post`,
      referenceId: String(post._id),
      triggerUserId: req.user._id
    });
  }

  const hydratedComment = await Comment.findById(comment._id).populate(
    "userId",
    "name profileImage role isVerified specialization"
  );

  res.status(201).json({
    success: true,
    data: hydratedComment
  });
});

const getPostComments = catchAsync(async (req, res) => {
  const comments = await Comment.find({ postId: req.params.id })
    .sort({ createdAt: -1 })
    .populate("userId", "name profileImage role isVerified specialization")
    .lean();

  res.status(200).json({
    success: true,
    data: comments
  });
});

const deletePost = catchAsync(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (String(post.userId) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You do not have permission to delete this post");
  }

  await Post.findByIdAndDelete(post._id);
  await Comment.deleteMany({ postId: post._id });

  res.status(200).json({
    success: true,
    data: { _id: post._id }
  });
});

module.exports = {
  createPost,
  getPosts,
  getCaseDiscussions,
  likePost,
  commentPost,
  getPostComments,
  deletePost
};
