const cloudinary = require("cloudinary").v2;
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

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

  // multer v2 stores files as Uint8Array — convert to Buffer then base64 data URI
  // upload_stream is broken with Uint8Array in multer v2; uploader.upload with data URI works reliably
  const buffer = Buffer.isBuffer(req.file.buffer)
    ? req.file.buffer
    : Buffer.from(req.file.buffer);

  const dataUri = `data:${req.file.mimetype};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "doctors-app",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ quality: "auto:good", fetch_format: "auto" }]
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
