const { body, param, query } = require("express-validator");

const postTypes = ["text", "image", "video", "case"];

const createPostValidation = [
  body("content").isString().trim().notEmpty().withMessage("Post content is required").isLength({ max: 5000 }),
  body("type").optional().isIn(postTypes),
  body("mediaUrl").optional().isString().trim().isLength({ max: 500 }),
  body("symptoms").optional().isString().trim().isLength({ max: 3000 }),
  body("observations").optional().isString().trim().isLength({ max: 3000 }),
  body("reportImages").optional().isArray({ max: 10 }),
  body("reportImages.*").optional().isString(),
  body("isAnonymous").optional().isBoolean()
];

const feedValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 })
];

const postIdValidation = [param("id").isMongoId().withMessage("Valid post id is required")];

const commentValidation = [
  ...postIdValidation,
  body("text").isString().trim().notEmpty().withMessage("Comment text is required").isLength({ max: 1500 })
];

module.exports = {
  createPostValidation,
  feedValidation,
  postIdValidation,
  commentValidation
};
