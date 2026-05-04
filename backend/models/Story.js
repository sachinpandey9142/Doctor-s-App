const mongoose = require("mongoose");

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    mediaUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true
    },
    caption: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    },
    visibility: {
      type: String,
      enum: ["followers", "public"],
      default: "followers"
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

storySchema.pre("validate", function setExpiry(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + STORY_LIFETIME_MS);
  }
  next();
});

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Story", storySchema);