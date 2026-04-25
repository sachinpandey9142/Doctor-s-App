const { body } = require("express-validator");

const roles = ["doctor", "nurse", "lab-technician", "medical-student", "hospital-staff", "other"];

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 80 }),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be at least 8 characters"),
  body("role").isIn(roles).withMessage("Role must be a valid medical role"),
  body("specialization").optional().isString().trim().isLength({ max: 120 }),
  body("hospital").optional().isString().trim().isLength({ max: 120 }),
  body("experience").optional().isInt({ min: 0, max: 80 }).withMessage("Experience must be a number")
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required")
];

module.exports = {
  registerValidation,
  loginValidation
};
