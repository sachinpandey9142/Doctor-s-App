const mongoose = require("mongoose");

/**
 * PollVote
 *
 * Exactly ONE document per (userId, postId) pair enforced by the unique
 * compound index.  This is the source-of-truth for "who voted what".
 *
 * Vote counts on DiagnosisPoll are updated atomically via $inc at the
 * same time a PollVote doc is created/updated (see pollController).
 */
const pollVoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// The unique compound index is the DB-level guard against duplicate votes.
pollVoteSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model("PollVote", pollVoteSchema);
