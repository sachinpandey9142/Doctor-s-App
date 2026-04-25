const { body, param, query } = require("express-validator");

// NOTE: "role" is intentionally not in this list.
// Users cannot self-assign roles. Only admins may change roles.
const updateUserValidation = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 80 }),
  body("specialization").optional().isString().trim().isLength({ max: 120 }),
  body("hospital").optional().isString().trim().isLength({ max: 120 }),
  body("experience").optional().isInt({ min: 0, max: 80 }),
  body("profileImage").optional().isString().trim().isLength({ max: 500 })
];

const userIdValidation = [param("id").isMongoId().withMessage("User id is invalid")];

const searchUsersValidation = [
  query("q").optional().isString().trim().isLength({ max: 80 }),
  query("limit").optional().isInt({ min: 1, max: 25 }).withMessage("Limit must be between 1 and 25")
];

const targetUserValidation = [param("targetUserId").isMongoId().withMessage("Target user id is invalid")];

module.exports = {
  updateUserValidation,
  userIdValidation,
  searchUsersValidation,
  targetUserValidation
};