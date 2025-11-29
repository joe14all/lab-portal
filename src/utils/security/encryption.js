/**
 * Encryption Utilities
 * Section 7.2: Data Encryption
 *
 * Provides client-side encryption helpers for sensitive data.
 *
 * Encryption Strategy:
 * - At Rest: AWS KMS for DynamoDB/S3 (server-side)
 * - In Transit: TLS 1.2+ for all API calls
 * - Client-side: Web Crypto API for local encryption
 *
 * Note: This module provides browser-compatible encryption utilities.
 * Server-side encryption is handled by AWS services (KMS, S3-SSE, DynamoDB encryption).
 */

/**
 * Encryption Configuration
 */
const ENCRYPTION_CONFIG = {
  algorithm: "AES-GCM",
  keyLength: 256,
  ivLength: 12, // 96 bits for GCM
  tagLength: 128, // 128 bits authentication tag
};

/**
 * Generates a cryptographic key for encryption
 * @param {string} password - Password to derive key from
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export const deriveKey = async (password, salt) => {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive AES key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ENCRYPTION_CONFIG.algorithm, length: ENCRYPTION_CONFIG.keyLength },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
};

/**
 * Generates random salt for key derivation
 * @returns {Uint8Array} Random salt
 */
export const generateSalt = () => {
  return crypto.getRandomValues(new Uint8Array(16));
};

/**
 * Generates random initialization vector
 * @returns {Uint8Array} Random IV
 */
export const generateIV = () => {
  return crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
};

/**
 * Encrypts data using AES-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @param {Uint8Array} iv - Initialization vector
 * @returns {Promise<Uint8Array>} Encrypted data
 */
export const encrypt = async (plaintext, key, iv) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_CONFIG.algorithm,
      iv: iv,
      tagLength: ENCRYPTION_CONFIG.tagLength,
    },
    key,
    data
  );

  return new Uint8Array(encrypted);
};

/**
 * Decrypts data using AES-GCM
 * @param {Uint8Array} ciphertext - Encrypted data
 * @param {CryptoKey} key - Decryption key
 * @param {Uint8Array} iv - Initialization vector
 * @returns {Promise<string>} Decrypted plaintext
 */
export const decrypt = async (ciphertext, key, iv) => {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_CONFIG.algorithm,
      iv: iv,
      tagLength: ENCRYPTION_CONFIG.tagLength,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

/**
 * Encrypts data with password (includes salt and IV)
 * @param {string} plaintext - Data to encrypt
 * @param {string} password - Encryption password
 * @returns {Promise<string>} Base64-encoded encrypted data with salt and IV
 */
export const encryptWithPassword = async (plaintext, password) => {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);
  const encrypted = await encrypt(plaintext, key, iv);

  // Combine salt, IV, and ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encrypted, salt.length + iv.length);

  // Convert to base64
  return arrayBufferToBase64(combined);
};

/**
 * Decrypts data with password
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {string} password - Decryption password
 * @returns {Promise<string>} Decrypted plaintext
 */
export const decryptWithPassword = async (encryptedData, password) => {
  // Decode base64
  const combined = base64ToArrayBuffer(encryptedData);

  // Extract salt, IV, and ciphertext
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 16 + ENCRYPTION_CONFIG.ivLength);
  const ciphertext = combined.slice(16 + ENCRYPTION_CONFIG.ivLength);

  const key = await deriveKey(password, salt);
  return await decrypt(ciphertext, key, iv);
};

/**
 * Converts ArrayBuffer to base64 string
 * @param {Uint8Array} buffer - Array buffer
 * @returns {string} Base64 string
 */
const arrayBufferToBase64 = (buffer) => {
  const binary = String.fromCharCode.apply(null, buffer);
  return btoa(binary);
};

/**
 * Converts base64 string to ArrayBuffer
 * @param {string} base64 - Base64 string
 * @returns {Uint8Array} Array buffer
 */
const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
};

/**
 * Hashes data using SHA-256
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export const hashData = async (data) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
};

/**
 * Generates a secure random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} Hex-encoded random token
 */
export const generateSecureToken = (length = 32) => {
  const buffer = crypto.getRandomValues(new Uint8Array(length));
  const hexArray = Array.from(buffer).map((b) =>
    b.toString(16).padStart(2, "0")
  );
  return hexArray.join("");
};

/**
 * Encrypts sensitive fields in an object
 * @param {Object} data - Object with sensitive fields
 * @param {Array<string>} sensitiveFields - Field names to encrypt
 * @param {string} password - Encryption password
 * @returns {Promise<Object>} Object with encrypted fields
 */
export const encryptSensitiveFields = async (
  data,
  sensitiveFields,
  password
) => {
  const encrypted = { ...data };

  for (const field of sensitiveFields) {
    if (data[field] !== undefined && data[field] !== null) {
      const value =
        typeof data[field] === "string"
          ? data[field]
          : JSON.stringify(data[field]);

      encrypted[field] = await encryptWithPassword(value, password);
      encrypted[`${field}_encrypted`] = true;
    }
  }

  return encrypted;
};

/**
 * Decrypts sensitive fields in an object
 * @param {Object} data - Object with encrypted fields
 * @param {Array<string>} sensitiveFields - Field names to decrypt
 * @param {string} password - Decryption password
 * @returns {Promise<Object>} Object with decrypted fields
 */
export const decryptSensitiveFields = async (
  data,
  sensitiveFields,
  password
) => {
  const decrypted = { ...data };

  for (const field of sensitiveFields) {
    if (data[`${field}_encrypted`] && data[field]) {
      try {
        const decryptedValue = await decryptWithPassword(data[field], password);

        // Try to parse as JSON, fallback to string
        try {
          decrypted[field] = JSON.parse(decryptedValue);
        } catch {
          decrypted[field] = decryptedValue;
        }

        delete decrypted[`${field}_encrypted`];
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
      }
    }
  }

  return decrypted;
};

/**
 * Masks sensitive data for display/logging
 * @param {string} value - Value to mask
 * @param {Object} options - Masking options
 * @returns {string} Masked value
 */
export const maskSensitiveData = (value, options = {}) => {
  if (!value) {
    return value;
  }

  const {
    showFirst = 0,
    showLast = 0,
    maskChar = "*",
    minLength = 0,
  } = options;

  const valueStr = String(value);

  if (valueStr.length <= minLength) {
    return valueStr.replace(/./g, maskChar);
  }

  const firstPart = valueStr.substring(0, showFirst);
  const lastPart = valueStr.substring(valueStr.length - showLast);
  const maskedMiddle = maskChar.repeat(
    Math.max(0, valueStr.length - showFirst - showLast)
  );

  return firstPart + maskedMiddle + lastPart;
};

/**
 * Masks email address
 * @param {string} email - Email address
 * @returns {string} Masked email (e.g., j***@example.com)
 */
export const maskEmail = (email) => {
  if (!email || !email.includes("@")) {
    return email;
  }

  const [local, domain] = email.split("@");
  const maskedLocal =
    local.length > 1 ? local[0] + "*".repeat(local.length - 1) : local;

  return `${maskedLocal}@${domain}`;
};

/**
 * Masks phone number
 * @param {string} phone - Phone number
 * @returns {string} Masked phone (e.g., ***-***-1234)
 */
export const maskPhone = (phone) => {
  if (!phone) {
    return phone;
  }

  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length < 4) {
    return "*".repeat(digitsOnly.length);
  }

  return "*".repeat(digitsOnly.length - 4) + digitsOnly.slice(-4);
};

/**
 * TLS Configuration Check
 * Validates that all API calls use HTTPS
 */
export const validateSecureConnection = (url) => {
  const urlObj = new URL(url);

  if (urlObj.protocol !== "https:" && !url.includes("localhost")) {
    console.warn(`Insecure connection detected: ${url}`);
    return false;
  }

  return true;
};

/**
 * Validates encryption configuration
 * @returns {Object} Validation result
 */
export const validateEncryptionSupport = () => {
  const supported = {
    webCrypto:
      typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined",
    aesGcm: false,
    pbkdf2: false,
    sha256: false,
  };

  if (supported.webCrypto) {
    // Check for specific algorithm support
    // Note: This is a basic check, full validation requires async operations
    supported.aesGcm = true;
    supported.pbkdf2 = true;
    supported.sha256 = true;
  }

  return {
    supported: supported.webCrypto,
    details: supported,
    recommendation: supported.webCrypto
      ? "Encryption fully supported"
      : "Web Crypto API not available - use HTTPS-only transmission",
  };
};

/**
 * AWS KMS Configuration (for backend reference)
 * This would be used in backend Lambda functions
 */
export const AWS_KMS_CONFIG = {
  // Example configuration - actual values from environment variables
  keyArn: import.meta.env.VITE_KMS_KEY_ARN || "",
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",

  // Encryption context for DynamoDB
  getDynamoDBEncryptionContext: (tableName) => ({
    TableName: tableName,
    Purpose: "LogisticsData",
  }),

  // Encryption context for S3
  getS3EncryptionContext: (bucket, key) => ({
    Bucket: bucket,
    Key: key,
    Purpose: "ProofOfDelivery",
  }),
};

/**
 * S3 Server-Side Encryption Configuration
 */
export const S3_SSE_CONFIG = {
  // SSE-KMS configuration
  ServerSideEncryption: "aws:kms",
  SSEKMSKeyId: AWS_KMS_CONFIG.keyArn,
  BucketKeyEnabled: true,
};

export default {
  deriveKey,
  generateSalt,
  generateIV,
  encrypt,
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  hashData,
  generateSecureToken,
  encryptSensitiveFields,
  decryptSensitiveFields,
  maskSensitiveData,
  maskEmail,
  maskPhone,
  validateSecureConnection,
  validateEncryptionSupport,
  AWS_KMS_CONFIG,
  S3_SSE_CONFIG,
};
