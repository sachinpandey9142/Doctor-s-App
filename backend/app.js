const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cloudinary = require("cloudinary").v2;

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const jobRoutes = require("./routes/jobRoutes");
const chatRoutes = require("./routes/chatRoutes");
const groupRoutes = require("./routes/groupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

// Configure Cloudinary from environment variables.
// Values are optional at this stage — the upload endpoint will fail gracefully
// with a clear error if credentials are missing when first used.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Serve locally-saved uploads as a static fallback (future use / dev fallback)
app.use("/uploads", express.static("uploads"));

app.get("/health", (_req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Doctor,s App backend is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api", notificationRoutes);
app.use("/api", uploadRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
