const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const {
  getPoll,
  castVote,
  createOrReplacePoll,
  getPollAnalytics,
} = require("../controllers/pollController");

const router = express.Router();

// GET    /api/posts/:postId/poll          — get poll state + current user vote
router.get("/:postId/poll", authMiddleware, getPoll);

// POST   /api/posts/:postId/poll          — create / replace poll (owner/admin)
router.post("/:postId/poll", authMiddleware, createOrReplacePoll);

// POST   /api/posts/:postId/poll/vote     — cast or change a vote
router.post("/:postId/poll/vote", authMiddleware, castVote);

// GET    /api/posts/:postId/poll/analytics — full analytics (owner/admin)
router.get("/:postId/poll/analytics", authMiddleware, getPollAnalytics);

module.exports = router;
