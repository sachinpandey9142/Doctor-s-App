const express = require("express");
const { param } = require("express-validator");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  getNotifications,
  markNotificationAsRead
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/notifications", authMiddleware, getNotifications);
router.patch(
  "/notifications/:id/read",
  authMiddleware,
  [param("id").isMongoId().withMessage("Notification id is invalid")],
  validateRequest,
  markNotificationAsRead
);

module.exports = router;
