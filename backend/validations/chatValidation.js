const { body, param, query } = require("express-validator");

const createConversationValidation = [
  body("participantId").isMongoId().withMessage("participantId must be a valid user id")
];

const sendMessageValidation = [
  body("conversationId").isMongoId().withMessage("conversationId must be a valid id"),
  body("text").optional().isString().trim().isLength({ max: 3000 }),
  body("mediaUrl").optional().isString().trim().isLength({ max: 500 })
];

const conversationMessagesValidation = [
  param("conversationId").isMongoId().withMessage("conversationId must be a valid id"),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 })
];

module.exports = {
  createConversationValidation,
  sendMessageValidation,
  conversationMessagesValidation
};
