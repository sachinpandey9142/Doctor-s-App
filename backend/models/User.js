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
      enum: ["doctor", "nurse", "lab-technician", "medical-student", "hospital-staff", "other"]
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
    reputationScore: {
      type: Number,
      default: 0,
      min: 0
    },
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
  return object;
};

module.exports = mongoose.model("User", userSchema);
