const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  getUserById,
  updateUser,
  getUserPosts,
  searchUsers,
  getSuggestedUsers,
  followUser,
  unfollowUser,
  getFollowers
} = require("../controllers/userController");
const {
  updateUserValidation,
  userIdValidation,
  searchUsersValidation,
  targetUserValidation
} = require("../validations/userValidation");

const router = express.Router();

router.put("/update", authMiddleware, updateUserValidation, validateRequest, updateUser);
router.get("/search", authMiddleware, searchUsersValidation, validateRequest, searchUsers);
router.get("/suggested", authMiddleware, searchUsersValidation, validateRequest, getSuggestedUsers);
router.post("/:targetUserId/follow", authMiddleware, targetUserValidation, validateRequest, followUser);
router.post("/:targetUserId/unfollow", authMiddleware, targetUserValidation, validateRequest, unfollowUser);
router.get("/:id/followers", authMiddleware, userIdValidation, validateRequest, getFollowers);
router.get("/:id/posts", authMiddleware, userIdValidation, validateRequest, getUserPosts);
router.get("/:id", authMiddleware, userIdValidation, validateRequest, getUserById);

module.exports = router;
