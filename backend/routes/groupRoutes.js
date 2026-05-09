const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  createGroup,
  getGroups,
  getGroupById,
  renameGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  clearGroupChat,
} = require("../controllers/chatController");
const {
  createGroupValidation,
  groupIdValidation,
  renameGroupValidation,
  addGroupMembersValidation,
  removeGroupMemberValidation,
  leaveGroupValidation,
  clearGroupChatValidation,
} = require("../validations/groupValidation");

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  createGroupValidation,
  validateRequest,
  createGroup,
);
router.get("/", authMiddleware, getGroups);
router.get(
  "/:id",
  authMiddleware,
  groupIdValidation,
  validateRequest,
  getGroupById,
);
router.post(
  "/:id/rename",
  authMiddleware,
  renameGroupValidation,
  validateRequest,
  renameGroup,
);
router.post(
  "/:id/add-members",
  authMiddleware,
  addGroupMembersValidation,
  validateRequest,
  addGroupMembers,
);
router.post(
  "/:id/remove-member",
  authMiddleware,
  removeGroupMemberValidation,
  validateRequest,
  removeGroupMember,
);
router.post(
  "/:id/leave",
  authMiddleware,
  leaveGroupValidation,
  validateRequest,
  leaveGroup,
);
router.delete(
  "/:id/clear-chat",
  authMiddleware,
  clearGroupChatValidation,
  validateRequest,
  clearGroupChat,
);

module.exports = router;
