const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const {
  getProfile,
  getHistory,
  leaderboard,
  getTrustLevels,
  getBadges,
  getUserBadges,
  adjustReputation,
  suppressTrust,
  awardBadge,
  getAudit,
} = require("../controllers/reputationController");

const router = express.Router();

// ── Public routes (auth required) ─────────────────────────────────────────────
router.get("/trust-levels", authMiddleware, getTrustLevels);
router.get("/badges", authMiddleware, getBadges);
router.get("/leaderboard", authMiddleware, leaderboard);
router.get("/me", authMiddleware, getProfile);
router.get("/me/history", authMiddleware, getHistory);
router.get("/:userId", authMiddleware, getProfile);
router.get("/:userId/history", authMiddleware, getHistory);
router.get("/:userId/badges", authMiddleware, getUserBadges);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.post("/admin/adjust", authMiddleware, adminMiddleware, adjustReputation);
router.post("/admin/suppress", authMiddleware, adminMiddleware, suppressTrust);
router.post("/admin/award-badge", authMiddleware, adminMiddleware, awardBadge);
router.get("/admin/audit/:userId", authMiddleware, adminMiddleware, getAudit);

module.exports = router;
