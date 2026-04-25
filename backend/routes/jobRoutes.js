const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validateRequest = require("../middlewares/validateRequest");
const { createJob, listJobs, applyToJob } = require("../controllers/jobController");
const { createJobValidation, applyJobValidation } = require("../validations/jobValidation");

const router = express.Router();

router.post("/", authMiddleware, createJobValidation, validateRequest, createJob);
router.get("/", authMiddleware, listJobs);
router.post("/:id/apply", authMiddleware, applyJobValidation, validateRequest, applyToJob);

module.exports = router;
