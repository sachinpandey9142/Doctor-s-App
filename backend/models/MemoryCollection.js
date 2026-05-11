const mongoose = require("mongoose");

const memoryCollectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    coverImage: {
      type: String,
      trim: true,
      default: "",
    },
    visibility: {
      type: String,
      enum: ["followers", "public", "private"],
      default: "public",
    },
  },
  {
    timestamps: true,
  },
);

memoryCollectionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("MemoryCollection", memoryCollectionSchema);
