/**
 * Integration Layer Utilities
 * Section 6: Cross-Domain Integration Support
 *
 * Provides:
 * - Event validation and transformation
 * - Error handling and retry logic
 * - Integration monitoring
 * - Data sanitization
 */

/**
 * Event Validation
 */

/**
 * Validates event structure and required fields
 * @param {Object} event - Event object
 * @param {string} event.source - Event source
 * @param {string} event.detailType - Event detail type
 * @param {Object} event.detail - Event payload
 * @returns {Object} Validation result with valid flag and errors
 */
export const validateEvent = (event) => {
  const errors = [];

  // Required fields
  if (!event.source) errors.push("Missing event.source");
  if (!event.detailType) errors.push("Missing event.detailType");
  if (!event.detail) errors.push("Missing event.detail");

  // Source format validation
  if (event.source && !/^[a-z]+\.[a-z]+$/.test(event.source)) {
    errors.push("Invalid event.source format (expected: domain.subdomain)");
  }

  // DetailType format validation
  if (event.detailType && !/^[A-Z][a-zA-Z]+$/.test(event.detailType)) {
    errors.push("Invalid event.detailType format");
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Validates CaseReadyToShip event
 * @param {Object} detail - Event detail payload
 * @returns {Object} Validation result
 */
export const validateCaseReadyToShipEvent = (detail) => {
  const errors = [];

  if (!detail.caseId) errors.push("Missing detail.caseId");
  if (!detail.labId) errors.push("Missing detail.labId");
  if (!detail.clinicId) errors.push("Missing detail.clinicId");
  if (!detail.requestedDeliveryDate)
    errors.push("Missing detail.requestedDeliveryDate");

  // Validate date format
  if (
    detail.requestedDeliveryDate &&
    isNaN(new Date(detail.requestedDeliveryDate).getTime())
  ) {
    errors.push("Invalid requestedDeliveryDate format");
  }

  // Validate priority
  const validPriorities = ["STANDARD", "RUSH", "EMERGENCY"];
  if (detail.priority && !validPriorities.includes(detail.priority)) {
    errors.push(
      `Invalid priority. Must be one of: ${validPriorities.join(", ")}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Validates PickupRequested event
 * @param {Object} detail - Event detail payload
 * @returns {Object} Validation result
 */
export const validatePickupRequestedEvent = (detail) => {
  const errors = [];

  if (!detail.pickupId) errors.push("Missing detail.pickupId");
  if (!detail.clinicId) errors.push("Missing detail.clinicId");
  if (!detail.labId) errors.push("Missing detail.labId");
  if (!detail.windowStart) errors.push("Missing detail.windowStart");
  if (!detail.windowEnd) errors.push("Missing detail.windowEnd");

  // Validate time window
  if (detail.windowStart && detail.windowEnd) {
    const start = new Date(detail.windowStart);
    const end = new Date(detail.windowEnd);

    if (isNaN(start.getTime())) errors.push("Invalid windowStart format");
    if (isNaN(end.getTime())) errors.push("Invalid windowEnd format");

    if (start >= end) {
      errors.push("windowStart must be before windowEnd");
    }
  }

  // Validate recurring schedule if present
  if (detail.recurringSchedule) {
    const validFrequencies = ["DAILY", "WEEKLY", "BIWEEKLY"];
    if (!validFrequencies.includes(detail.recurringSchedule.frequency)) {
      errors.push(
        `Invalid recurringSchedule.frequency. Must be one of: ${validFrequencies.join(
          ", "
        )}`
      );
    }

    if (
      !detail.recurringSchedule.daysOfWeek ||
      !Array.isArray(detail.recurringSchedule.daysOfWeek)
    ) {
      errors.push("recurringSchedule.daysOfWeek must be an array");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Data Sanitization
 */

/**
 * Sanitizes event data to remove sensitive information
 * @param {Object} event - Event object
 * @returns {Object} Sanitized event
 */
export const sanitizeEvent = (event) => {
  const sanitized = { ...event };

  // Remove sensitive fields from detail
  if (sanitized.detail) {
    const detail = { ...sanitized.detail };

    // Remove internal IDs that shouldn't be exposed
    delete detail.internalUserId;
    delete detail.apiKey;
    delete detail.secretToken;

    sanitized.detail = detail;
  }

  return sanitized;
};

/**
 * Sanitizes personal information
 * @param {Object} data - Data object with potential PII
 * @returns {Object} Sanitized data
 */
export const sanitizePII = (data) => {
  const sanitized = { ...data };

  // Mask email addresses
  if (sanitized.email) {
    const [local, domain] = sanitized.email.split("@");
    sanitized.email = `${local.substring(0, 2)}***@${domain}`;
  }

  // Mask phone numbers
  if (sanitized.phone) {
    sanitized.phone = `***-***-${sanitized.phone.slice(-4)}`;
  }

  return sanitized;
};

/**
 * Error Handling
 */

/**
 * Wraps integration function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context description for logging
 * @returns {Function} Wrapped function
 */
export const withErrorHandling = (fn, context) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${context}:`, error);

      // Log error for monitoring
      logIntegrationError({
        context: context,
        error: error.message,
        stack: error.stack,
        args: args,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  };
};

/**
 * Retry Logic
 */

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default 3)
 * @param {number} options.baseDelay - Base delay in ms (default 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default 10000)
 * @returns {Promise<any>} Function result
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Integration Monitoring
 */

const integrationMetrics = {
  eventCounts: {},
  errorCounts: {},
  latencies: [],
};

/**
 * Records event processing
 * @param {string} eventType - Event type
 * @param {number} duration - Processing duration in ms
 * @param {boolean} success - Whether processing succeeded
 */
export const recordEventProcessing = (eventType, duration, success) => {
  // Increment event counter
  if (!integrationMetrics.eventCounts[eventType]) {
    integrationMetrics.eventCounts[eventType] = 0;
  }
  integrationMetrics.eventCounts[eventType]++;

  // Record latency
  integrationMetrics.latencies.push({
    eventType: eventType,
    duration: duration,
    success: success,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 1000 latency records
  if (integrationMetrics.latencies.length > 1000) {
    integrationMetrics.latencies.shift();
  }

  // Increment error counter if failed
  if (!success) {
    if (!integrationMetrics.errorCounts[eventType]) {
      integrationMetrics.errorCounts[eventType] = 0;
    }
    integrationMetrics.errorCounts[eventType]++;
  }
};

/**
 * Gets integration metrics
 * @returns {Object} Metrics summary
 */
export const getIntegrationMetrics = () => {
  const totalEvents = Object.values(integrationMetrics.eventCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalErrors = Object.values(integrationMetrics.errorCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const avgLatency =
    integrationMetrics.latencies.length > 0
      ? integrationMetrics.latencies.reduce(
          (sum, record) => sum + record.duration,
          0
        ) / integrationMetrics.latencies.length
      : 0;

  return {
    totalEvents: totalEvents,
    totalErrors: totalErrors,
    errorRate: totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0,
    avgLatencyMs: avgLatency,
    eventCounts: { ...integrationMetrics.eventCounts },
    errorCounts: { ...integrationMetrics.errorCounts },
  };
};

/**
 * Resets integration metrics
 */
export const resetIntegrationMetrics = () => {
  integrationMetrics.eventCounts = {};
  integrationMetrics.errorCounts = {};
  integrationMetrics.latencies = [];
};

/**
 * Logs integration error
 * @param {Object} errorData - Error data
 */
const logIntegrationError = (errorData) => {
  // TODO: Send to logging service (CloudWatch, Datadog, etc.)
  console.error("[INTEGRATION ERROR]", errorData);
};

/**
 * Data Transformation Utilities
 */

/**
 * Converts date to ISO string safely
 * @param {string|Date} date - Date to convert
 * @returns {string|null} ISO string or null if invalid
 */
export const toISOString = (date) => {
  try {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
};

/**
 * Ensures value is an array
 * @param {any} value - Value to convert
 * @returns {Array} Array
 */
export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

/**
 * Deep clones an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merges objects deeply
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export const deepMerge = (target, source) => {
  const output = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
};

/**
 * Rate Limiting
 */

const rateLimits = new Map();

/**
 * Checks if action is rate limited
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in ms
 * @returns {boolean} True if rate limit exceeded
 */
export const isRateLimited = (key, maxRequests, windowMs) => {
  const now = Date.now();
  const record = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };

  // Reset if window expired
  if (now >= record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  // Check limit
  if (record.count >= maxRequests) {
    rateLimits.set(key, record);
    return true;
  }

  // Increment and allow
  record.count++;
  rateLimits.set(key, record);
  return false;
};

/**
 * Clears rate limit for key
 * @param {string} key - Rate limit key
 */
export const clearRateLimit = (key) => {
  rateLimits.delete(key);
};

export default {
  validateEvent,
  validateCaseReadyToShipEvent,
  validatePickupRequestedEvent,
  sanitizeEvent,
  sanitizePII,
  withErrorHandling,
  retryWithBackoff,
  recordEventProcessing,
  getIntegrationMetrics,
  resetIntegrationMetrics,
  toISOString,
  ensureArray,
  deepClone,
  deepMerge,
  isRateLimited,
  clearRateLimit,
};
