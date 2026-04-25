const express = require("express");

const { register, login } = require("../controllers/authController");
const validateRequest = require("../middlewares/validateRequest");
const { registerValidation, loginValidation } = require("../validations/authValidation");

const router = express.Router();

router.post("/register", registerValidation, validateRequest, register);
router.post("/login", loginValidation, validateRequest, login);

module.exports = router;
