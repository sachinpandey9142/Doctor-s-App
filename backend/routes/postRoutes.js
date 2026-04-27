const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  createPost,
  getPosts,
  getCaseDiscussions,
  likePost,
  commentPost,
  getPostComments,
  deletePost
} = require("../controllers/postController");
const {
  createPostValidation,
  feedValidation,
  postIdValidation,
  commentValidation
} = require("../validations/postValidation");

const router = express.Router();

router.post("/", authMiddleware, createPostValidation, validateRequest, createPost);
router.get("/", authMiddleware, feedValidation, validateRequest, getPosts);
router.get("/cases", authMiddleware, feedValidation, validateRequest, getCaseDiscussions);
router.post("/:id/like", authMiddleware, postIdValidation, validateRequest, likePost);
router.post("/:id/comment", authMiddleware, commentValidation, validateRequest, commentPost);
router.get("/:id/comments", authMiddleware, postIdValidation, validateRequest, getPostComments);
router.delete("/:id", authMiddleware, postIdValidation, validateRequest, deletePost);

module.exports = router;
