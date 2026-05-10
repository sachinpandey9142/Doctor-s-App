const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  createConversation,
  createGroupConversation,
  joinCaseDiscussionChat,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  renameGroupConversation,
  addGroupMembers,
  removeGroupMember,
  leaveGroupConversation,
  clearGroupChat,
} = require("../controllers/chatController");
const {
  createConversationValidation,
  createGroupValidation,
  updateGroupValidation,
  groupMemberValidation,
  groupActionValidation,
  sendMessageValidation,
  conversationMessagesValidation,
  conversationIdValidation,
} = require("../validations/chatValidation");

const router = express.Router();

router.post(
  "/conversations",
  authMiddleware,
  createConversationValidation,
  validateRequest,
  createConversation,
);
router.post(
  "/groups/create",
  authMiddleware,
  createGroupValidation,
  validateRequest,
  createGroupConversation,
);
router.post("/case/:postId", authMiddleware, joinCaseDiscussionChat);
router.get("/conversations", authMiddleware, getConversations);
router.get(
  "/conversations/:conversationId",
  authMiddleware,
  conversationIdValidation,
  validateRequest,
  getConversation,
);
router.get(
  "/messages/:conversationId",
  authMiddleware,
  conversationMessagesValidation,
  validateRequest,
  getMessages,
);
router.post(
  "/messages",
  authMiddleware,
  sendMessageValidation,
  validateRequest,
  sendMessage,
);
router.put(
  "/groups/:groupId",
  authMiddleware,
  updateGroupValidation,
  groupActionValidation,
  validateRequest,
  renameGroupConversation,
);
router.post(
  "/groups/:groupId/members",
  authMiddleware,
  groupMemberValidation,
  validateRequest,
  addGroupMembers,
);
router.delete(
  "/groups/:groupId/members/:memberId",
  authMiddleware,
  groupMemberValidation,
  validateRequest,
  removeGroupMember,
);
router.post(
  "/groups/:groupId/leave",
  authMiddleware,
  groupActionValidation,
  validateRequest,
  leaveGroupConversation,
);
router.delete(
  "/groups/:groupId/clear-chat",
  authMiddleware,
  groupActionValidation,
  validateRequest,
  clearGroupChat,
);

module.exports = router;
