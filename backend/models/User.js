const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "doctor", "nurse", "lab-technician", "medical-student", "hospital-staff", "other"]
    },
    specialization: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120
    },
    hospital: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
      max: 80
    },
    isVerified: {
      type: Boolean,
      default: false
    },

    // ── Reputation & Trust System ──────────────────────────────────────────────
    reputationScore: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },

    // Trust level — derived from reputationScore, cached for fast queries
    trustLevel: {
      type: String,
      default: "new-member",
      enum: [
        "new-member",
        "contributor",
        "trusted-contributor",
        "senior-contributor",
        "specialist",
        "expert-voice",
        "community-mentor",
        "verified-authority"
      ],
      index: true
    },

    // Category-specific reputation scores (Map of category → score)
    categoryReputation: {
      type: Map,
      of: Number,
      default: {}
    },

    // Denormalized daily reputation tracking for rate limiting
    dailyRepGained: {
      type: Number,
      default: 0,
      min: 0
    },
    dailyRepDate: {
      type: String,
      default: ""
    },

    // Streak tracking for consistency bonus
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActiveDate: {
      type: String,
      default: ""
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0
    },

    // Badge count (denormalized for profile display)
    badgeCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Moderation flags
    trustSuppressed: {
      type: Boolean,
      default: false
    },
    trustSuppressedUntil: {
      type: Date,
      default: null
    },
    moderationNotes: {
      type: String,
      default: "",
      select: false
    },

    // ── Realtime Presence ──────────────────────────────────────────────────────
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: null
    },

    // ── Social Fields ─────────────────────────────────────────────────────────
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    profileImage: {
      type: String,
      default: ""
    },
    coverImage: {
      type: String,
      default: ""
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    idDocument: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toJSON = function toJSON() {
  const object = this.toObject();
  delete object.password;
  delete object.__v;
  delete object.moderationNotes;
  return object;
};

module.exports = mongoose.model("User", userSchema);
