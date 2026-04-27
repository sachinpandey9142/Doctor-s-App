const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  createConversation,
  joinCaseDiscussionChat,
  getConversations,
  getMessages,
  sendMessage
} = require("../controllers/chatController");
const {
  createConversationValidation,
  sendMessageValidation,
  conversationMessagesValidation
} = require("../validations/chatValidation");

const router = express.Router();

router.post("/conversations", authMiddleware, createConversationValidation, validateRequest, createConversation);
router.post("/case/:postId", authMiddleware, joinCaseDiscussionChat);
router.get("/conversations", authMiddleware, getConversations);
router.get(
  "/messages/:conversationId",
  authMiddleware,
  conversationMessagesValidation,
  validateRequest,
  getMessages
);
router.post("/messages", authMiddleware, sendMessageValidation, validateRequest, sendMessage);

module.exports = router;
