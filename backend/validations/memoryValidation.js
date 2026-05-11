const { body, param } = require("express-validator");

const collectionIdValidation = [
  param("id").isMongoId().withMessage("Valid collection id is required"),
];

const itemIdValidation = [
  param("id").isMongoId().withMessage("Valid item id is required"),
];

const userIdValidation = [
  param("userId").isMongoId().withMessage("Valid user id is required"),
];

const createCollectionValidation = [
  body("title")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Collection title is required")
    .isLength({ max: 100 }),
  body("coverImage").optional().isString().trim().isLength({ max: 1000 }),
  body("visibility").optional().isIn(["followers", "public", "private"]),
];

const updateCollectionValidation = [
  body("title").optional().isString().trim().isLength({ min: 1, max: 100 }),
  body("coverImage")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 }),
  body("visibility").optional().isIn(["followers", "public", "private"]),
];

const createMemoryItemValidation = [
  body("mediaUrl")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Media URL is required")
    .isLength({ max: 1000 }),
  body("mediaType").isIn(["image", "video"]),
  body("caption").optional().isString().trim().isLength({ max: 500 }),
  body("storyId").optional({ nullable: true }).isMongoId(),
];

const updateMemoryItemValidation = [
  body("caption").optional().isString().trim().isLength({ max: 500 }),
  body("mediaUrl").optional().isString().trim().isLength({ max: 1000 }),
  body("mediaType").optional().isIn(["image", "video"]),
  body("sortOrder").optional().isInt({ min: 0 }),
];

const reorderMemoryItemsValidation = [
  body("itemIds")
    .isArray({ min: 1, max: 100 })
    .withMessage("Item ids are required"),
  body("itemIds.*").isMongoId().withMessage("Each item id must be valid"),
];

const saveStoryValidation = [
  body("storyId").isMongoId().withMessage("Valid story id is required"),
];

module.exports = {
  collectionIdValidation,
  createCollectionValidation,
  createMemoryItemValidation,
  itemIdValidation,
  reorderMemoryItemsValidation,
  saveStoryValidation,
  updateCollectionValidation,
  updateMemoryItemValidation,
  userIdValidation,
};
