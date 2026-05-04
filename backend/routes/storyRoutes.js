const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const { createStory, getStoryFeed, viewStory } = require("../controllers/storyController");
const { createStoryValidation, storyIdValidation, feedValidation } = require("../validations/storyValidation");

const router = express.Router();

router.get("/feed", authMiddleware, feedValidation, validateRequest, getStoryFeed);
router.post("/", authMiddleware, createStoryValidation, validateRequest, createStory);
router.post("/:id/view", authMiddleware, storyIdValidation, validateRequest, viewStory);

module.exports = router;