const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["message", "like", "comment", "job", "follow"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    referenceId: {
      type: String,
      default: ""
    },
    triggerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
