const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000
    },
    mediaUrl: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
