const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    mediaUrl: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "case"],
      default: "text"
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    commentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    symptoms: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000
    },
    observations: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000
    },
    reportImages: {
      type: [String],
      default: []
    },
    isAnonymous: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
