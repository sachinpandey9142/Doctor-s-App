const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    participantsHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lastMessage: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
