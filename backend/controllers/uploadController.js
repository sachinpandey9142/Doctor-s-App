const cloudinary = require("cloudinary").v2;
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const uploadImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded. Send a multipart/form-data request with field 'file'");
  }

  if (!ALLOWED_MIME.includes(req.file.mimetype)) {
    throw new ApiError(400, "Unsupported file type. Only JPEG, PNG, WebP, and GIF are allowed");
  }

  if (req.file.size > MAX_BYTES) {
    throw new ApiError(400, "File exceeds the 5 MB size limit");
  }

  // Cloudinary credentials come from env vars — configured in app.js startup
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "doctors-app",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [{ quality: "auto:good", fetch_format: "auto" }]
      },
      (error, uploadResult) => {
        if (error) {
          return reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
        }
        resolve(uploadResult);
      }
    );

    stream.end(req.file.buffer);
  });

  res.status(201).json({
    success: true,
    data: {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    }
  });
});

module.exports = { uploadImage };
