const { body, param } = require("express-validator");

const groupIdValidation = [
  param("id").isMongoId().withMessage("Group id is invalid"),
];

const createGroupValidation = [
  body("groupName")
    .isString()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Group name is required"),
  body("groupImage").optional().isString().trim().isLength({ max: 500 }),
  body("memberIds")
    .isArray({ min: 1 })
    .withMessage("Select at least one follower"),
  body("memberIds.*").isMongoId().withMessage("Each member id must be valid"),
];

const renameGroupValidation = [
  ...groupIdValidation,
  body("groupName")
    .isString()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Group name is required"),
  body("groupImage").optional().isString().trim().isLength({ max: 500 }),
];

const addGroupMembersValidation = [
  ...groupIdValidation,
  body("memberIds")
    .isArray({ min: 1 })
    .withMessage("Select at least one follower"),
  body("memberIds.*").isMongoId().withMessage("Each member id must be valid"),
];

const removeGroupMemberValidation = [
  ...groupIdValidation,
  body("targetUserId").isMongoId().withMessage("targetUserId must be valid"),
];

const leaveGroupValidation = [...groupIdValidation];
const clearGroupChatValidation = [...groupIdValidation];

module.exports = {
  groupIdValidation,
  createGroupValidation,
  renameGroupValidation,
  addGroupMembersValidation,
  removeGroupMemberValidation,
  leaveGroupValidation,
  clearGroupChatValidation,
};
