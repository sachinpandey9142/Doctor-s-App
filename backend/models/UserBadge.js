const mongoose = require("mongoose");

/**
 * UserBadge — junction table for earned badges.
 *
 * Tracks when a user earned each badge, who awarded it
 * (system vs admin), and an optional custom message.
 */
const userBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      required: true
    },

    // How it was awarded
    awardedBy: {
      type: String,
      enum: ["system", "admin"],
      default: "system"
    },

    // If admin-awarded, who awarded it
    awardedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Optional congratulatory message from admin
    message: {
      type: String,
      default: "",
      maxlength: 300
    },

    // Whether user has seen/acknowledged this badge
    isSeen: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// One badge per user
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
userBadgeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("UserBadge", userBadgeSchema);
