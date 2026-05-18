const mongoose = require("mongoose");

/**
 * Badge — achievement/badge definition catalog.
 *
 * This is the master list of all possible badges a user can earn.
 * Badges are awarded through the reputation engine or admin actions.
 */
const badgeSchema = new mongoose.Schema(
  {
    // Unique machine-readable identifier
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    // Display name
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },

    // Short description
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },

    // Visual category for grouping in UI
    tier: {
      type: String,
      required: true,
      enum: ["bronze", "silver", "gold", "platinum", "diamond"],
      default: "bronze"
    },

    // Category the badge belongs to
    category: {
      type: String,
      required: true,
      enum: [
        "contribution",
        "expertise",
        "community",
        "milestone",
        "special",
        "moderation"
      ],
      default: "contribution"
    },

    // Icon identifier (mapped to lucide icons on mobile)
    icon: {
      type: String,
      default: "award"
    },

    // Whether this badge can be auto-awarded by the system
    isAutomatic: {
      type: Boolean,
      default: true
    },

    // Criteria for automatic awarding (evaluated by reputation engine)
    criteria: {
      type: {
        type: String,
        enum: [
          "reputation_threshold",
          "post_count",
          "comment_count",
          "helpful_count",
          "streak_days",
          "category_reputation",
          "follower_count",
          "manual"
        ],
        default: "manual"
      },
      value: {
        type: Number,
        default: 0
      },
      category: {
        type: String,
        default: ""
      }
    },

    // Sort order for display
    sortOrder: {
      type: Number,
      default: 0
    },

    // Whether badge is active/visible
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

badgeSchema.index({ category: 1, sortOrder: 1 });

module.exports = mongoose.model("Badge", badgeSchema);
