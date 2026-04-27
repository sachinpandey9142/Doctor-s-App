const ApiError = require("../utils/ApiError");

const notFoundHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (error, _req, res, _next) => {
  console.error("API Error:", error);
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid request identifier";
  }

  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    message = `${field} already exists`;
  }

  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {})
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
