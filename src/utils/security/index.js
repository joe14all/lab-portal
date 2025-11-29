/**
 * Security & Compliance Utilities - Main Export
 * Section 7: Security & Compliance
 *
 * Provides comprehensive security utilities for HIPAA compliance,
 * data encryption, audit logging, and multi-tenant isolation.
 */

// Chain of Custody (7.1)
export {
  CustodyEventType,
  VerificationMethod,
  createCustodyRecord,
  recordCustodyEvent,
  validateDeliveryLocation,
  verifyCustodyChain,
  generateVerificationCode,
  validateVerificationCode,
  getCustodyHistory,
  getCurrentHolder,
  recordLabDeparture,
  recordInTransit,
  recordClinicArrival,
  recordPatientHandoff,
  recordCustodyException,
} from "./chainOfCustody.js";

// Encryption (7.2)
export {
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
} from "./encryption.js";

// Audit Logging (7.3)
export {
  AuditEventType,
  AuditSeverity,
  createAuditLog,
  logCustodyEvent,
  logDataAccess,
  logAuthEvent,
  logSecurityEvent,
  logRouteEvent,
  queryAuditLogs,
  getAuditTrail,
  getUserActivity,
  getSecurityEvents,
  generateComplianceReport,
  formatForDynamoDB,
  CloudWatchLogger,
  getClientMetadata,
  withAuditLogging,
} from "./auditLog.js";

// Multi-Tenant Isolation (7.4)
export {
  setLabContext,
  getContext as getLabContext,
  clearContext as clearLabContext,
  validateLabAccess,
  filterByLab,
  addLabFilter,
  validateResourceOwnership,
  DynamoDBQueryBuilder,
  APIRequestBuilder,
  validateResponse,
  withTenantIsolation,
  QueryValidator,
  sanitizeForCrossLab,
  initializeTenantContext,
  getTenantIsolationStatus,
  withTenantContext,
} from "./tenantIsolation.js";

// Re-export default objects for convenience
import chainOfCustody from "./chainOfCustody.js";
import encryption from "./encryption.js";
import auditLog from "./auditLog.js";
import tenantIsolation from "./tenantIsolation.js";

export const ChainOfCustody = chainOfCustody;
export const Encryption = encryption;
export const AuditLog = auditLog;
export const TenantIsolation = tenantIsolation;

export default {
  ChainOfCustody: chainOfCustody,
  Encryption: encryption,
  AuditLog: auditLog,
  TenantIsolation: tenantIsolation,
};
