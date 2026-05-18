const mongoose = require("mongoose");

/**
 * DiagnosisPoll
 *
 * One document per case post.  Vote counts are kept as pre-aggregated
 * counters on this document to allow O(1) reads without $lookup pipelines.
 * Individual user votes are stored in PollVote (separate collection) to:
 *   - prevent duplicate voting via a unique index
 *   - allow vote-changing (update existing PollVote doc)
 *   - support per-user "did I vote?" hydration in a single query
 */

// Embedded option sub-document
const pollOptionSchema = new mongoose.Schema(
  {
    label:      { type: String, required: true, trim: true, maxlength: 200 },
    voteCount:  { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const diagnosisPollSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      unique: true,   // one poll per post
      index: true,
    },
    options: {
      type: [pollOptionSchema],
      validate: {
        validator: (arr) => arr.length >= 2 && arr.length <= 8,
        message: "A poll must have between 2 and 8 options.",
      },
    },
    totalVotes: { type: Number, default: 0, min: 0 },
    // soft-close after this timestamp (optional, for future use)
    closesAt:   { type: Date, default: null },
    isClosed:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index: postId (already unique) + updatedAt for sorting
diagnosisPollSchema.index({ postId: 1, updatedAt: -1 });

module.exports = mongoose.model("DiagnosisPoll", diagnosisPollSchema);
