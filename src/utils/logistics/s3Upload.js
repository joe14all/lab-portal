/**
 * S3 Upload Utility for Proof-of-Delivery
 *
 * Implements file upload using AWS S3 pre-signed URLs (Section 5.1.4)
 *
 * Supported file types:
 * - Signatures (PNG)
 * - Delivery photos (JPEG/PNG)
 * - Documents (PDF)
 *
 * Features:
 * - Client-side validation
 * - Image compression
 * - Progress tracking
 * - Retry on failure
 */

import { getProofUploadUrl } from "../services/api/logistics";

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const ALLOWED_DOC_TYPES = ["application/pdf"];
const IMAGE_QUALITY = 0.85; // JPEG compression quality
const MAX_IMAGE_DIMENSION = 2048; // Max width/height in pixels

/**
 * Validate file before upload
 */
function validateFile(file, fileType) {
  const errors = [];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  // Check file type
  const allowedTypes =
    fileType === "signature" || fileType === "photo"
      ? ALLOWED_IMAGE_TYPES
      : ALLOWED_DOC_TYPES;

  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Compress image file
 */
async function compressImage(
  file,
  maxDimension = MAX_IMAGE_DIMENSION,
  quality = IMAGE_QUALITY
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        // Create canvas and compress
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to S3 using pre-signed URL
 */
async function uploadToS3(presignedUrl, file, onProgress = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          url: presignedUrl.split("?")[0], // Remove query params to get permanent URL
        });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Upload signature image
 */
export async function uploadSignature(stopId, signatureFile, options = {}) {
  const { compress = true, onProgress = null, maxRetries = 3 } = options;

  // Validate file
  const validation = validateFile(signatureFile, "signature");
  if (!validation.valid) {
    throw new Error(validation.errors.join(". "));
  }

  // Compress if needed
  let fileToUpload = signatureFile;
  if (compress && ALLOWED_IMAGE_TYPES.includes(signatureFile.type)) {
    try {
      fileToUpload = await compressImage(signatureFile);
    } catch (error) {
      console.warn("Image compression failed, uploading original:", error);
    }
  }

  // Get pre-signed URL from API
  const { uploadUrl, s3Key } = await getProofUploadUrl(stopId, "signature");

  // Upload with retry
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadToS3(uploadUrl, fileToUpload, onProgress);
      return {
        ...result,
        s3Key,
        originalSize: signatureFile.size,
        uploadedSize: fileToUpload.size,
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("Upload failed after retries");
}

/**
 * Upload delivery photo
 */
export async function uploadDeliveryPhoto(stopId, photoFile, options = {}) {
  const { compress = true, onProgress = null, maxRetries = 3 } = options;

  // Validate file
  const validation = validateFile(photoFile, "photo");
  if (!validation.valid) {
    throw new Error(validation.errors.join(". "));
  }

  // Compress if needed
  let fileToUpload = photoFile;
  if (compress && ALLOWED_IMAGE_TYPES.includes(photoFile.type)) {
    try {
      fileToUpload = await compressImage(photoFile);
    } catch (error) {
      console.warn("Image compression failed, uploading original:", error);
    }
  }

  // Get pre-signed URL from API
  const { uploadUrl, s3Key } = await getProofUploadUrl(stopId, "photo");

  // Upload with retry
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadToS3(uploadUrl, fileToUpload, onProgress);
      return {
        ...result,
        s3Key,
        originalSize: photoFile.size,
        uploadedSize: fileToUpload.size,
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("Upload failed after retries");
}

/**
 * Upload multiple files (batch)
 */
export async function uploadProofOfDelivery(stopId, files, options = {}) {
  const { onProgress = null } = options;

  const results = {
    signature: null,
    photos: [],
    errors: [],
  };

  let totalFiles = 0;
  let completedFiles = 0;

  // Count files
  if (files.signature) totalFiles++;
  totalFiles += files.photos?.length || 0;

  const updateProgress = () => {
    if (onProgress) {
      onProgress((completedFiles / totalFiles) * 100);
    }
  };

  // Upload signature
  if (files.signature) {
    try {
      results.signature = await uploadSignature(stopId, files.signature, {
        ...options,
        onProgress: (percent) => {
          if (onProgress) {
            const overallProgress =
              ((completedFiles + percent / 100) / totalFiles) * 100;
            onProgress(overallProgress);
          }
        },
      });
      completedFiles++;
      updateProgress();
    } catch (error) {
      results.errors.push({ type: "signature", error: error.message });
    }
  }

  // Upload photos
  if (files.photos?.length > 0) {
    for (const photo of files.photos) {
      try {
        const result = await uploadDeliveryPhoto(stopId, photo, {
          ...options,
          onProgress: (percent) => {
            if (onProgress) {
              const overallProgress =
                ((completedFiles + percent / 100) / totalFiles) * 100;
              onProgress(overallProgress);
            }
          },
        });
        results.photos.push(result);
        completedFiles++;
        updateProgress();
      } catch (error) {
        results.errors.push({
          type: "photo",
          file: photo.name,
          error: error.message,
        });
      }
    }
  }

  return results;
}

/**
 * Capture signature from canvas and upload
 */
export async function captureAndUploadSignature(stopId, canvas, options = {}) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Failed to capture signature"));
        return;
      }

      const file = new File([blob], "signature.png", { type: "image/png" });

      try {
        const result = await uploadSignature(stopId, file, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, "image/png");
  });
}

/**
 * Create thumbnail from image
 */
export async function createThumbnail(file, maxSize = 200) {
  return compressImage(file, maxSize, 0.7);
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate image dimensions
 */
export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Export all functions
export default {
  uploadSignature,
  uploadDeliveryPhoto,
  uploadProofOfDelivery,
  captureAndUploadSignature,
  compressImage,
  createThumbnail,
  formatFileSize,
  getImageDimensions,
  validateFile,
};
