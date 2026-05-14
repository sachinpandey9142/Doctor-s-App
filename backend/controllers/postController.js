const Post = require("../models/Post");
const Comment = require("../models/Comment");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");
const {
  ReputationEvents,
  increaseReputation,
} = require("../services/reputationService");

const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const COMMENT_REACTIONS = new Set([
  "helpful",
  "insightful",
  "educational",
  "great_case",
  "support",
  "celebrate",
  "research",
]);

const getReactionObject = (reactions) =>
  reactions instanceof Map ? Object.fromEntries(reactions) : reactions || {};

const getReactionCounts = (reactions) =>
  Object.fromEntries(
    Object.entries(getReactionObject(reactions)).map(([key, ids]) => [
      key,
      Array.isArray(ids) ? ids.length : 0,
    ]),
  );

const createPost = catchAsync(async (req, res) => {
  const {
    content,
    mediaUrl = "",
    type = "text",
    symptoms = "",
    observations = "",
    reportImages = [],
    isAnonymous = false,
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
      throw new ApiError(
        400,
        "Case discussion posts require symptoms and observations",
      );
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
    isAnonymous: Boolean(isAnonymous),
  });

  await increaseReputation(req.user._id, ReputationEvents.POST_CREATED);

  const hydratedPost = await Post.findById(post._id).populate(
    "userId",
    "name profileImage role isVerified specialization reputationScore",
  );

  res.status(201).json({
    success: true,
    data: hydratedPost,
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
      .populate(
        "userId",
        "name profileImage role isVerified specialization reputationScore",
      )
      .lean(),
    Post.countDocuments(typeFilter),
  ]);

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

const getCaseDiscussions = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [posts, total] = await Promise.all([
    Post.find({ type: "case" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(
        "userId",
        "name profileImage role isVerified specialization reputationScore",
      )
      .lean(),
    Post.countDocuments({ type: "case" }),
  ]);

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

const likePost = catchAsync(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const likedAlready = post.likes.some(
    (id) => String(id) === String(req.user._id),
  );

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
        triggerUserId: req.user._id,
      });
    }
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: {
      postId: post._id,
      liked: !likedAlready,
      likesCount: post.likes.length,
    },
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

  const { parentCommentId } = req.body;

  // If replying to a comment, verify parent comment exists
  let parent = null;
  if (parentCommentId) {
    parent = await Comment.findById(parentCommentId);
    if (!parent) {
      throw new ApiError(404, "Parent comment not found");
    }

    // Parent comment must belong to same post
    if (String(parent.postId) !== String(post._id)) {
      throw new ApiError(400, "Parent comment does not belong to this post");
    }
  }

  const comment = await Comment.create({
    postId: post._id,
    userId: req.user._id,
    text,
    parentCommentId: parentCommentId || null,
  });

  // If root comment, increment post comment count
  // Replies don't increment post count, only update parent replyCount
  if (!parentCommentId) {
    post.commentCount += 1;
    await post.save();
  } else if (parent) {
    // Increment reply count on parent comment
    parent.replyCount = (parent.replyCount || 0) + 1;
    await parent.save();
  }

  await increaseReputation(req.user._id, ReputationEvents.COMMENT_CREATED);

  // Notifications: only for root comments on post or mentions in parent
  if (!parentCommentId) {
    if (String(post.userId) !== String(req.user._id)) {
      await createNotification({
        userId: post.userId,
        type: "comment",
        title: "New comment on your post",
        body: `${req.user.name} commented on your post`,
        referenceId: String(post._id),
        triggerUserId: req.user._id,
      });
    }
  } else if (parent && String(parent.userId) !== String(req.user._id)) {
    // Notify parent comment author of reply
    await createNotification({
      userId: parent.userId,
      type: "comment",
      title: "New reply to your comment",
      body: `${req.user.name} replied to your comment`,
      referenceId: String(post._id),
      triggerUserId: req.user._id,
    });
  }

  const hydratedComment = await Comment.findById(comment._id).populate(
    "userId",
    "name profileImage role isVerified specialization",
  );

  res.status(201).json({
    success: true,
    data: hydratedComment,
  });
});

const getPostComments = catchAsync(async (req, res) => {
  // Get all comments for this post, sorted by thread structure
  // Root comments first (newest first), then their replies
  const comments = await Comment.find({ postId: req.params.id })
    .populate("userId", "name profileImage role isVerified specialization")
    .lean();

  // Separate root comments and replies
  const rootComments = comments
    .filter((c) => !c.parentCommentId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const replies = comments.filter((c) => c.parentCommentId);

  // Build threaded structure
  const threaded = rootComments.map((root) => {
    const rootReplies = replies
      .filter((r) => String(r.parentCommentId) === String(root._id))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    return {
      ...root,
      replies: rootReplies,
    };
  });

  res.status(200).json({
    success: true,
    data: threaded,
  });
});

const deletePost = catchAsync(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (
    String(post.userId) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "You do not have permission to delete this post");
  }

  await Post.findByIdAndDelete(post._id);
  await Comment.deleteMany({ postId: post._id });

  res.status(200).json({
    success: true,
    data: { _id: post._id },
  });
});

const likeComment = catchAsync(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const likedAlready = comment.likes.some(
    (id) => String(id) === String(req.user._id),
  );

  const userId = String(req.user._id);
  const reactionObject = getReactionObject(comment.reactions);
  Object.keys(reactionObject).forEach((reactionKey) => {
    reactionObject[reactionKey] = (reactionObject[reactionKey] ?? []).filter(
      (id) => String(id) !== userId,
    );
    if (reactionObject[reactionKey].length === 0) {
      delete reactionObject[reactionKey];
    }
  });

  comment.reactions = new Map(Object.entries(reactionObject));
  comment.markModified("reactions");

  if (likedAlready) {
    comment.likes = comment.likes.filter(
      (id) => String(id) !== String(req.user._id),
    );
  } else {
    comment.likes.push(req.user._id);

    // Notify comment author of like
    if (String(comment.userId) !== String(req.user._id)) {
      await increaseReputation(comment.userId, ReputationEvents.COMMENT_LIKED);
      await createNotification({
        userId: comment.userId,
        type: "like",
        title: "Your comment received a like",
        body: `${req.user.name} liked your comment`,
        referenceId: String(comment.postId),
        triggerUserId: req.user._id,
      });
    }
  }

  await comment.save();

  res.status(200).json({
    success: true,
    data: {
      commentId: comment._id,
      liked: !likedAlready,
      likesCount: comment.likes.length,
    },
  });
});

const reactComment = catchAsync(async (req, res) => {
  const reaction = String(req.body.reaction || "")
    .trim()
    .toLowerCase();

  if (!COMMENT_REACTIONS.has(reaction)) {
    throw new ApiError(400, "Invalid reaction");
  }

  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const userId = String(req.user._id);
  const currentReactions = getReactionObject(comment.reactions);
  comment.likes = (comment.likes ?? []).filter((id) => String(id) !== userId);

  let existingReaction = null;
  Object.entries(currentReactions).forEach(([key, ids]) => {
    const nextIds = (Array.isArray(ids) ? ids : []).filter(
      (id) => String(id) !== userId,
    );

    if (nextIds.length > 0) {
      currentReactions[key] = nextIds;
    } else {
      delete currentReactions[key];
    }

    if (Array.isArray(ids) && ids.some((id) => String(id) === userId)) {
      existingReaction = key;
    }
  });

  const toggledOff = existingReaction === reaction;

  if (!toggledOff) {
    const nextIds = currentReactions[reaction] || [];
    currentReactions[reaction] = [...nextIds, req.user._id];
  }

  comment.reactions = new Map(Object.entries(currentReactions));
  comment.markModified("reactions");
  await comment.save();

  res.status(200).json({
    success: true,
    data: {
      commentId: comment._id,
      reaction: toggledOff ? null : reaction,
      reactionCounts: getReactionCounts(currentReactions),
      totalReactions: Object.values(currentReactions).reduce(
        (total, ids) => total + (Array.isArray(ids) ? ids.length : 0),
        0,
      ),
    },
  });
});

module.exports = {
  createPost,
  getPosts,
  getCaseDiscussions,
  likePost,
  commentPost,
  getPostComments,
  deletePost,
  likeComment,
  reactComment,
};
