const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const authMiddleware = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is required");
  }

  const token = authHeader.slice(7).trim();
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    throw new ApiError(401, "Invalid authentication token");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been blocked.");
  }

  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  if (!user.isVerified && Date.now() - new Date(user.createdAt).getTime() > GRACE_PERIOD_MS) {
    throw new ApiError(403, "Your 24-hour grace period has expired. Please wait for verification.");
  }

  req.user = user;
  next();
});

module.exports = authMiddleware;
