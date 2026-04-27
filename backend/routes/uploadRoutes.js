const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middlewares/authMiddleware");
const { uploadImage } = require("../controllers/uploadController");

const router = express.Router();

// Memory storage: buffer lives in RAM, we stream it directly to Cloudinary
// No disk I/O = no temp file cleanup needed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB — React Native sends full-res photos
    files: 1
  }
});

// POST /api/upload
// Auth required so anonymous users cannot spam Cloudinary storage
router.post("/upload", authMiddleware, upload.single("file"), uploadImage);

module.exports = router;
