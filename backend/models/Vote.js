const mongoose = require("mongoose");

/**
 * Vote — deduplicated, weighted voting system.
 *
 * Tracks WHO voted on WHAT, with their calculated weight at vote time.
 * Prevents duplicate votes and enables weighted reputation calculations.
 * Also used for anti-abuse: rate limiting, self-vote prevention, etc.
 */
const voteSchema = new mongoose.Schema(
  {
    // Who voted
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // What was voted on
    targetModel: {
      type: String,
      required: true,
      enum: ["Post", "Comment"]
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    // Who owns the content being voted on
    targetOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Vote direction
    direction: {
      type: String,
      required: true,
      enum: ["up", "down"]
    },

    // The voter's weight at time of voting (snapshot for audit)
    weight: {
      type: Number,
      default: 1.0,
      min: 0
    },

    // The voter's trust level at time of voting (snapshot)
    voterTrustLevel: {
      type: String,
      default: "new-member"
    },

    // The voter's role at time of voting (snapshot)
    voterRole: {
      type: String,
      default: "other"
    },

    // Category of the content (for specialty rep)
    category: {
      type: String,
      default: "general"
    },

    // Reputation delta that was applied to the target owner
    reputationDelta: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Unique constraint: one vote per user per target
voteSchema.index({ voterId: 1, targetModel: 1, targetId: 1 }, { unique: true });

// Rate limiting queries
voteSchema.index({ voterId: 1, createdAt: -1 });

// Anti-abuse: track voter → target owner interaction frequency
voteSchema.index({ voterId: 1, targetOwnerId: 1, createdAt: -1 });

module.exports = mongoose.model("Vote", voteSchema);
