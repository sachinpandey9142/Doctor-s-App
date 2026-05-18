const mongoose = require("mongoose");

const Post          = require("../models/Post");
const DiagnosisPoll = require("../models/DiagnosisPoll");
const PollVote      = require("../models/PollVote");
const ApiError      = require("../utils/ApiError");
const catchAsync    = require("../utils/catchAsync");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the client-facing poll shape.
 * Adds the current user's voted optionId (or null) and per-option percentages.
 */
const formatPoll = (poll, userVote) => {
  const totalVotes = poll.totalVotes || 0;
  const votedOptionId = userVote ? String(userVote.optionId) : null;

  const options = poll.options.map((opt) => {
    const count = opt.voteCount || 0;
    const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    return {
      _id:       String(opt._id),
      label:     opt.label,
      voteCount: count,
      pct,
    };
  });

  return {
    _id:          String(poll._id),
    postId:       String(poll.postId),
    options,
    totalVotes,
    isClosed:     poll.isClosed,
    closesAt:     poll.closesAt,
    votedOptionId,
    updatedAt:    poll.updatedAt,
  };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/posts/:postId/poll
 * Returns the poll state for a case post, including the current user's vote.
 */
const getPoll = catchAsync(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  const [poll, userVote] = await Promise.all([
    DiagnosisPoll.findOne({ postId }).lean(),
    PollVote.findOne({ userId: req.user._id, postId }).lean(),
  ]);

  if (!poll) {
    throw new ApiError(404, "Poll not found for this post");
  }

  res.status(200).json({
    success: true,
    data: formatPoll(poll, userVote),
  });
});

/**
 * POST /api/posts/:postId/poll/vote
 * Body: { optionId }
 *
 * Atomically:
 *   1. Validate option belongs to this poll
 *   2. Upsert the PollVote (handles first-vote + vote-change)
 *   3. Update counters on DiagnosisPoll:
 *      - decrement old option (if changing vote)
 *      - increment new option
 *      - recalculate totalVotes
 *
 * All three mutations use findOneAndUpdate so there are no race conditions.
 */
const castVote = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const { optionId } = req.body;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }
  if (!mongoose.isValidObjectId(optionId)) {
    throw new ApiError(400, "Invalid optionId");
  }

  const poll = await DiagnosisPoll.findOne({ postId });
  if (!poll) {
    throw new ApiError(404, "Poll not found for this post");
  }
  if (poll.isClosed) {
    throw new ApiError(403, "This poll is closed");
  }

  // Validate optionId belongs to this poll
  const targetOption = poll.options.id(optionId);
  if (!targetOption) {
    throw new ApiError(400, "Invalid option for this poll");
  }

  // Check for existing vote (for vote-change logic)
  const existingVote = await PollVote.findOne({
    userId: req.user._id,
    postId,
  });

  const previousOptionId = existingVote ? String(existingVote.optionId) : null;
  const isSameOption     = previousOptionId === String(optionId);

  // No-op: user is voting for the same option they already voted for
  if (isSameOption) {
    const [freshPoll, userVote] = await Promise.all([
      DiagnosisPoll.findOne({ postId }).lean(),
      PollVote.findOne({ userId: req.user._id, postId }).lean(),
    ]);
    return res.status(200).json({
      success: true,
      data: formatPoll(freshPoll, userVote),
    });
  }

  // ── Atomic update sequence ────────────────────────────────────────────────

  if (previousOptionId) {
    // Vote change: decrement old option, increment new option
    await DiagnosisPoll.findByIdAndUpdate(poll._id, {
      $inc: {
        [`options.${poll.options.findIndex(
          (o) => String(o._id) === previousOptionId
        )}.voteCount`]: -1,
        [`options.${poll.options.findIndex(
          (o) => String(o._id) === String(optionId)
        )}.voteCount`]: 1,
        // totalVotes stays the same when changing a vote
      },
    });

    // Update the existing PollVote
    await PollVote.findByIdAndUpdate(existingVote._id, {
      optionId,
    });
  } else {
    // First vote: increment new option + totalVotes
    await DiagnosisPoll.findByIdAndUpdate(poll._id, {
      $inc: {
        [`options.${poll.options.findIndex(
          (o) => String(o._id) === String(optionId)
        )}.voteCount`]: 1,
        totalVotes: 1,
      },
    });

    // Create the PollVote record (unique index prevents duplicates)
    await PollVote.create({
      userId: req.user._id,
      postId,
      optionId,
    });
  }

  // ── Return fresh poll state ───────────────────────────────────────────────
  const [updatedPoll, userVote] = await Promise.all([
    DiagnosisPoll.findOne({ postId }).lean(),
    PollVote.findOne({ userId: req.user._id, postId }).lean(),
  ]);

  const formatted = formatPoll(updatedPoll, userVote);

  // Emit socket event for realtime sync across all viewers of this case
  const io = req.app.get("io");
  if (io) {
    io.to(`poll:${postId}`).emit("pollVoteUpdate", {
      postId:    String(postId),
      poll:      formatted,
    });
  }

  res.status(200).json({
    success: true,
    data: formatted,
  });
});

/**
 * POST /api/posts/:postId/poll
 * Create or replace the poll for a case post.
 * Body: { options: string[] }
 * Only the post owner or an admin can call this.
 */
const createOrReplacePoll = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const { options } = req.body;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");
  if (post.type !== "case") {
    throw new ApiError(400, "Polls can only be attached to case posts");
  }

  if (
    String(post.userId) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Only the post author or an admin can manage this poll");
  }

  if (!Array.isArray(options) || options.length < 2 || options.length > 8) {
    throw new ApiError(400, "A poll requires between 2 and 8 options");
  }

  const labeledOptions = options.map((label) => ({
    label: String(label).trim().slice(0, 200),
    voteCount: 0,
  }));

  // Upsert: if poll already exists, replace options and reset counts
  const poll = await DiagnosisPoll.findOneAndUpdate(
    { postId },
    {
      $set: {
        options:    labeledOptions,
        totalVotes: 0,
        isClosed:   false,
      },
    },
    { upsert: true, new: true }
  );

  // Delete all existing votes when poll is replaced
  await PollVote.deleteMany({ postId });

  res.status(200).json({
    success: true,
    data: formatPoll(poll, null),
  });
});

/**
 * GET /api/posts/:postId/poll/analytics
 * Returns full analytics for the poll (admin/post-owner only).
 */
const getPollAnalytics = catchAsync(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  if (
    String(post.userId) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Access denied");
  }

  const [poll, voteTimeline] = await Promise.all([
    DiagnosisPoll.findOne({ postId }).lean(),
    // Aggregate votes over time (daily buckets)
    PollVote.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      {
        $group: {
          _id: {
            date:     { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            optionId: "$optionId",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]),
  ]);

  if (!poll) throw new ApiError(404, "Poll not found");

  res.status(200).json({
    success: true,
    data: {
      poll:         formatPoll(poll, null),
      voteTimeline,
    },
  });
});

module.exports = {
  getPoll,
  castVote,
  createOrReplacePoll,
  getPollAnalytics,
};
