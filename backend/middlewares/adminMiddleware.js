const ApiError = require("../utils/ApiError");

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    next(new ApiError(403, "Access denied. Admin privileges required."));
  }
};

module.exports = adminMiddleware;
