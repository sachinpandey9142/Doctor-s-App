const { body, param, query } = require("express-validator");

const createStoryValidation = [
  body("mediaUrl").isString().trim().notEmpty().withMessage("Story mediaUrl is required").isLength({ max: 1000 }),
  body("type").isIn(["image", "video"]),
  body("caption").optional().isString().trim().isLength({ max: 500 }),
  body("visibility").optional().isIn(["followers", "public"])
];

const storyIdValidation = [param("id").isMongoId().withMessage("Valid story id is required")];

const feedValidation = [
  query("limit").optional().isInt({ min: 1, max: 50 })
];

module.exports = {
  createStoryValidation,
  storyIdValidation,
  feedValidation
};