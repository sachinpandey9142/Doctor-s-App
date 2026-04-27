const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

const register = catchAsync(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    specialization = "",
    hospital = "",
    experience = 0,
    profileImage = "",
    idDocument = ""
  } = req.body;

  const normalizedEmail = String(email).toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    specialization: String(specialization || "").trim(),
    hospital: String(hospital || "").trim(),
    experience: Number(experience) || 0,
    profileImage: String(profileImage || "").trim(),
    idDocument: String(idDocument || "").trim()
  });

  const token = signToken(user);

  res.status(201).json({
    success: true,
    data: {
      token,
      user: user.toJSON()
    }
  });
});

const login = catchAsync(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const password = String(req.body.password);

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(user);
  user.password = undefined;

  res.status(200).json({
    success: true,
    data: {
      token,
      user: user.toJSON()
    }
  });
});

module.exports = {
  register,
  login
};
