const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("[Validation Error]", {
      url: req.originalUrl,
      errors: errors.array().map((item) => ({
        field: item.path,
        message: item.msg,
      })),
    });

    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array().map((item) => ({
        field: item.path,
        message: item.msg,
      })),
    });
  }

  return next();
};

module.exports = validateRequest;
