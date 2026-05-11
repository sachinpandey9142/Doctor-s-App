const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionItems,
  createMemoryItem,
  saveStoryToMemory,
  updateMemoryItem,
  reorderCollectionItems,
  deleteMemoryItem,
} = require("../controllers/memoryController");
const {
  collectionIdValidation,
  createCollectionValidation,
  createMemoryItemValidation,
  itemIdValidation,
  reorderMemoryItemsValidation,
  saveStoryValidation,
  userIdValidation,
  updateCollectionValidation,
  updateMemoryItemValidation,
} = require("../validations/memoryValidation");

const router = express.Router();

// Collections
router.get(
  "/user/:userId",
  authMiddleware,
  userIdValidation,
  validateRequest,
  getCollections,
);
router.post(
  "/",
  authMiddleware,
  createCollectionValidation,
  validateRequest,
  createCollection,
);
router.patch(
  "/:id",
  authMiddleware,
  collectionIdValidation,
  updateCollectionValidation,
  validateRequest,
  updateCollection,
);
router.delete(
  "/:id",
  authMiddleware,
  collectionIdValidation,
  validateRequest,
  deleteCollection,
);

// Items & Stories
router.get(
  "/:id/items",
  authMiddleware,
  collectionIdValidation,
  validateRequest,
  getCollectionItems,
);
router.post(
  "/:id/items",
  authMiddleware,
  collectionIdValidation,
  createMemoryItemValidation,
  validateRequest,
  createMemoryItem,
);
router.post(
  "/:id/save-story",
  authMiddleware,
  collectionIdValidation,
  saveStoryValidation,
  validateRequest,
  saveStoryToMemory,
);
router.patch(
  "/:id/items/reorder",
  authMiddleware,
  collectionIdValidation,
  reorderMemoryItemsValidation,
  validateRequest,
  reorderCollectionItems,
);
router.patch(
  "/items/:id",
  authMiddleware,
  itemIdValidation,
  updateMemoryItemValidation,
  validateRequest,
  updateMemoryItem,
);
router.delete(
  "/items/:id",
  authMiddleware,
  itemIdValidation,
  validateRequest,
  deleteMemoryItem,
);

module.exports = router;
