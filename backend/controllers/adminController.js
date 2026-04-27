const User = require("../models/User");
const Post = require("../models/Post");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const getUsers = catchAsync(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: users });
});

const verifyUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  user.isVerified = true;
  await user.save();
  res.status(200).json({ success: true, data: user });
});

const blockUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  user.isBlocked = true;
  await user.save();
  res.status(200).json({ success: true, data: user });
});

const unblockUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  user.isBlocked = false;
  await user.save();
  res.status(200).json({ success: true, data: user });
});

const getOrganizations = catchAsync(async (req, res) => {
  const orgs = await User.aggregate([
    { $match: { hospital: { $ne: "" } } },
    { $group: { _id: "$hospital", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  res.status(200).json({ success: true, data: orgs });
});

const deletePost = catchAsync(async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) throw new ApiError(404, "Post not found");
  res.status(200).json({ success: true, data: {} });
});

module.exports = {
  getUsers,
  verifyUser,
  blockUser,
  unblockUser,
  getOrganizations,
  deletePost
};
