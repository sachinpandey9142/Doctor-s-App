import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Uploads an image from a local URI to the backend, which forwards it to Cloudinary.
 * Returns the permanent public Cloudinary URL.
 *
 * @param uri - Local file URI from expo-image-picker (e.g. file:///data/user/...)
 * @returns Secure Cloudinary URL safe to store in DB and display to all users
 */
export const uploadMediaRequest = async (uri: string): Promise<string> => {
  // Build multipart/form-data — React Native requires this manual form-data approach
  const formData = new FormData();

  // Infer mime type from extension; default to jpeg for unknown types
  const extension = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm"
  };
  const type = mimeTypeMap[extension] ?? "image/jpeg";

  // React Native's FormData accepts this object shape (not a standard browser Blob)
  formData.append("file", {
    uri,
    name: `upload.${extension}`,
    type
  } as unknown as Blob);

  const response = await apiClient.post<ApiResponse<UploadResult>>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data.data.url;
};

export const uploadImageRequest = uploadMediaRequest;
