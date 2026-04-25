const { body, param } = require("express-validator");

const createJobValidation = [
  body("title").isString().trim().notEmpty().withMessage("Job title is required").isLength({ max: 180 }),
  body("hospital").isString().trim().notEmpty().withMessage("Hospital is required").isLength({ max: 180 }),
  body("location").isString().trim().notEmpty().withMessage("Location is required").isLength({ max: 180 }),
  body("salary").optional().isString().trim().isLength({ max: 120 }),
  body("description")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ max: 5000 })
];

const applyJobValidation = [param("id").isMongoId().withMessage("Valid job id is required")];

module.exports = {
  createJobValidation,
  applyJobValidation
};
