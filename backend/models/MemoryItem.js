const mongoose = require("mongoose");

const memoryItemSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MemoryCollection",
      required: true,
      index: true,
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      default: null,
    },
    mediaUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    caption: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

memoryItemSchema.index({ collectionId: 1, sortOrder: 1, createdAt: 1 });

module.exports = mongoose.model("MemoryItem", memoryItemSchema);
