const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    // Threaded conversation support
    // null = root comment, otherwise = reply to parent comment
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    // Denormalized: count of direct replies for quick UI
    replyCount: {
      type: Number,
      default: 0,
    },
    // Social engagement
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    // Store reaction counts for future emoji reactions
    reactions: {
      type: Map,
      of: [mongoose.Schema.Types.ObjectId],
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
commentSchema.index({ createdAt: -1 });
commentSchema.index({ postId: 1, parentCommentId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
