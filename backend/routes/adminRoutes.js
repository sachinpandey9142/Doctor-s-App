const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const {
  getUsers,
  verifyUser,
  blockUser,
  unblockUser,
  getOrganizations,
  deletePost,
  getReputationAnalytics,
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/users", getUsers);
router.put("/users/:id/verify", verifyUser);
router.put("/users/:id/block", blockUser);
router.put("/users/:id/unblock", unblockUser);

router.get("/organizations", getOrganizations);

router.delete("/posts/:id", deletePost);

router.get("/reputation/analytics", getReputationAnalytics);

module.exports = router;
