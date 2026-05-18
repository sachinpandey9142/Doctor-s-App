const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    tempId: {
      type: String,
      default: "",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
