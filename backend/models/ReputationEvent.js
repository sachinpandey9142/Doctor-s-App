const mongoose = require("mongoose");

/**
 * ReputationEvent — immutable audit log of every reputation change.
 *
 * This is the source-of-truth ledger. The user's `reputationScore` is a
 * denormalized counter that MUST match `SUM(delta)` for that user.
 *
 * Every event records:
 *   - WHO received the reputation change (targetUserId)
 *   - WHO caused it (sourceUserId — null for system actions)
 *   - WHAT triggered it (eventType + referenceModel + referenceId)
 *   - HOW MUCH changed (delta, including sign)
 *   - WHAT category it falls under (category — for specialty reputation)
 *   - Admin-only metadata (reason, moderatorNote)
 */
const reputationEventSchema = new mongoose.Schema(
  {
    // The user whose reputation changed
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // The user who triggered the change (null for system/cron events)
    sourceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Structured event type for analytics & filtering
    eventType: {
      type: String,
      required: true,
      enum: [
        // Positive organic events
        "post_created",
        "post_upvoted",
        "comment_created",
        "comment_upvoted",
        "post_saved",
        "accepted_solution",
        "featured_post",
        "daily_consistency",
        "follow_gained",
        "mentorship_contribution",

        // Negative organic events
        "post_downvoted",
        "comment_downvoted",
        "content_removed",
        "spam_confirmed",

        // Admin actions
        "admin_boost",
        "admin_penalty",
        "admin_badge_award",
        "admin_reset",

        // System events
        "trust_level_promotion",
        "achievement_unlocked",
        "verification_bonus"
      ],
      index: true
    },

    // Reputation delta (positive or negative)
    delta: {
      type: Number,
      required: true
    },

    // Running total AFTER this event (for easy timeline rendering)
    balanceAfter: {
      type: Number,
      default: 0
    },

    // Category for specialty reputation tracking
    category: {
      type: String,
      default: "general",
      enum: [
        "general",
        "orthopedics",
        "cardiology",
        "neurology",
        "pediatrics",
        "oncology",
        "dermatology",
        "psychiatry",
        "radiology",
        "surgery",
        "internal-medicine",
        "emergency-medicine",
        "research",
        "case-discussion",
        "education",
        "mentorship"
      ],
      index: true
    },

    // Reference to the content that triggered this event
    referenceModel: {
      type: String,
      enum: ["Post", "Comment", "User", "Badge", null],
      default: null
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    // Weight multiplier applied (for audit trail)
    weightMultiplier: {
      type: Number,
      default: 1.0
    },

    // Admin-only fields
    reason: {
      type: String,
      default: "",
      maxlength: 500
    },
    moderatorNote: {
      type: String,
      default: "",
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
reputationEventSchema.index({ targetUserId: 1, createdAt: -1 });
reputationEventSchema.index({ targetUserId: 1, category: 1 });
reputationEventSchema.index({ targetUserId: 1, eventType: 1, createdAt: -1 });
reputationEventSchema.index({ sourceUserId: 1, targetUserId: 1, createdAt: -1 });

module.exports = mongoose.model("ReputationEvent", reputationEventSchema);
