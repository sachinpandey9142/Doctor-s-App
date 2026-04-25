const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    hospital: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    salary: {
      type: String,
      default: "Negotiable",
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    applicants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
