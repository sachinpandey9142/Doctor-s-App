const { body, param, query } = require("express-validator");

const createConversationValidation = [
  body("participantId")
    .isMongoId()
    .withMessage("participantId must be a valid user id"),
];

const conversationIdValidation = [
  param("conversationId")
    .isMongoId()
    .withMessage("conversationId must be a valid id"),
];

const createGroupValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Group name must be between 2 and 60 characters"),
  body("memberIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("At least one member is required"),
  body("memberIds.*").isMongoId().withMessage("Each member id must be valid"),
  body("image").optional().isString().trim().isLength({ max: 500 }),
];

const updateGroupValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Group name must be between 2 and 60 characters"),
  body("image").optional().isString().trim().isLength({ max: 500 }),
];

const groupMemberValidation = [
  body("memberIds")
    .optional()
    .isArray({ min: 1, max: 50 })
    .withMessage("At least one member is required"),
  body("memberIds.*")
    .optional()
    .isMongoId()
    .withMessage("Each member id must be valid"),
  param("groupId").isMongoId().withMessage("groupId must be a valid id"),
  param("memberId")
    .optional()
    .isMongoId()
    .withMessage("memberId must be a valid id"),
];

const groupActionValidation = [
  param("groupId").isMongoId().withMessage("groupId must be a valid id"),
];

const sendMessageValidation = [
  body("conversationId")
    .isMongoId()
    .withMessage("conversationId must be a valid id"),
  body("text").optional().isString().trim().isLength({ max: 3000 }),
  body("mediaUrl").optional().isString().trim().isLength({ max: 500 }),
];

const conversationMessagesValidation = [
  param("conversationId")
    .isMongoId()
    .withMessage("conversationId must be a valid id"),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  createConversationValidation,
  createGroupValidation,
  updateGroupValidation,
  groupMemberValidation,
  groupActionValidation,
  sendMessageValidation,
  conversationMessagesValidation,
  conversationIdValidation,
};
