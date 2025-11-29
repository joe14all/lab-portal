/**
 * Multi-Tenant Isolation Utilities
 * Section 7.4: Multi-Tenant Isolation
 *
 * Implements row-level security and data isolation for multi-tenant architecture.
 * Ensures labs can only access their own data.
 *
 * Security Principles:
 * - Every query MUST include labId filter
 * - Lambda authorizer injects labId into context
 * - Client-side validation before API calls
 * - Fail-closed on missing tenant context
 */

import { getLabContext } from "../auth/cognito.js";

/**
 * Tenant Context
 * Stores current lab context for API calls
 */
let currentLabContext = null;

/**
 * Sets current lab context from auth token
 * @param {string} token - JWT auth token
 * @returns {Object} Lab context
 */
export const setLabContext = (token) => {
  const context = getLabContext(token);

  if (!context || !context.labId) {
    throw new Error("Invalid lab context: missing labId");
  }

  currentLabContext = context;
  return currentLabContext;
};

/**
 * Gets current lab context
 * @returns {Object} Lab context
 * @throws {Error} If context not set
 */
export const getContext = () => {
  if (!currentLabContext) {
    throw new Error("Lab context not initialized. Call setLabContext first.");
  }

  return currentLabContext;
};

/**
 * Clears lab context (on logout)
 */
export const clearContext = () => {
  currentLabContext = null;
};

/**
 * Validates that labId matches current context
 * @param {string} labId - Lab ID to validate
 * @returns {boolean} True if matches
 * @throws {Error} If validation fails
 */
export const validateLabAccess = (labId) => {
  const context = getContext();

  if (!labId) {
    throw new Error("Missing labId in request");
  }

  if (labId !== context.labId) {
    throw new Error("Access denied: labId mismatch");
  }

  return true;
};

/**
 * Filters data array by current lab context
 * @param {Array} data - Data array
 * @param {string} labIdField - Field name containing labId (default 'labId')
 * @returns {Array} Filtered data
 */
export const filterByLab = (data, labIdField = "labId") => {
  const context = getContext();

  if (!Array.isArray(data)) {
    return data;
  }

  return data.filter((item) => item[labIdField] === context.labId);
};

/**
 * Adds labId to query parameters
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Query with labId added
 */
export const addLabFilter = (queryParams = {}) => {
  const context = getContext();

  return {
    ...queryParams,
    labId: context.labId,
  };
};

/**
 * Validates that resource belongs to current lab
 * @param {Object} resource - Resource object
 * @param {string} labIdField - Field name containing labId
 * @returns {boolean} True if resource belongs to lab
 * @throws {Error} If validation fails
 */
export const validateResourceOwnership = (resource, labIdField = "labId") => {
  if (!resource) {
    throw new Error("Resource not found");
  }

  const context = getContext();
  const resourceLabId = resource[labIdField];

  if (!resourceLabId) {
    throw new Error(`Missing ${labIdField} in resource`);
  }

  if (resourceLabId !== context.labId) {
    throw new Error("Access denied: resource belongs to different lab");
  }

  return true;
};

/**
 * DynamoDB Query Builder with Tenant Isolation
 */
export const DynamoDBQueryBuilder = {
  /**
   * Builds query parameters with labId filter
   * @param {Object} params - Base query parameters
   * @returns {Object} Query with tenant isolation
   */
  buildQuery: (params) => {
    const context = getContext();

    return {
      ...params,
      FilterExpression: params.FilterExpression
        ? `${params.FilterExpression} AND labId = :labId`
        : "labId = :labId",
      ExpressionAttributeValues: {
        ...params.ExpressionAttributeValues,
        ":labId": context.labId,
      },
    };
  },

  /**
   * Builds scan parameters with labId filter
   * @param {Object} params - Base scan parameters
   * @returns {Object} Scan with tenant isolation
   */
  buildScan: (params) => {
    const context = getContext();

    return {
      ...params,
      FilterExpression: params.FilterExpression
        ? `${params.FilterExpression} AND labId = :labId`
        : "labId = :labId",
      ExpressionAttributeValues: {
        ...params.ExpressionAttributeValues,
        ":labId": context.labId,
      },
    };
  },

  /**
   * Builds get item parameters with validation
   * @param {Object} params - Get item parameters
   * @returns {Object} Validated parameters
   */
  buildGetItem: (params) => {
    // For GetItem, we validate after retrieval
    return params;
  },

  /**
   * Builds put item parameters with labId
   * @param {Object} params - Put item parameters
   * @returns {Object} Item with labId added
   */
  buildPutItem: (params) => {
    const context = getContext();

    return {
      ...params,
      Item: {
        ...params.Item,
        labId: context.labId,
      },
    };
  },

  /**
   * Builds update item parameters with labId condition
   * @param {Object} params - Update item parameters
   * @returns {Object} Update with tenant validation
   */
  buildUpdateItem: (params) => {
    const context = getContext();

    return {
      ...params,
      ConditionExpression: params.ConditionExpression
        ? `${params.ConditionExpression} AND labId = :labId`
        : "labId = :labId",
      ExpressionAttributeValues: {
        ...params.ExpressionAttributeValues,
        ":labId": context.labId,
      },
    };
  },

  /**
   * Builds delete item parameters with labId condition
   * @param {Object} params - Delete item parameters
   * @returns {Object} Delete with tenant validation
   */
  buildDeleteItem: (params) => {
    const context = getContext();

    return {
      ...params,
      ConditionExpression: params.ConditionExpression
        ? `${params.ConditionExpression} AND labId = :labId`
        : "labId = :labId",
      ExpressionAttributeValues: {
        ...params.ExpressionAttributeValues,
        ":labId": context.labId,
      },
    };
  },
};

/**
 * API Request Builder with Tenant Isolation
 */
export const APIRequestBuilder = {
  /**
   * Adds labId to query string
   * @param {string} url - Base URL
   * @param {Object} params - Query parameters
   * @returns {string} URL with labId parameter
   */
  buildURL: (url, params = {}) => {
    const context = getContext();
    const queryParams = new URLSearchParams({
      ...params,
      labId: context.labId,
    });

    return `${url}?${queryParams.toString()}`;
  },

  /**
   * Adds labId to request body
   * @param {Object} body - Request body
   * @returns {Object} Body with labId added
   */
  buildBody: (body = {}) => {
    const context = getContext();

    return {
      ...body,
      labId: context.labId,
    };
  },

  /**
   * Adds labId to headers
   * @param {Object} headers - Request headers
   * @returns {Object} Headers with labId added
   */
  buildHeaders: (headers = {}) => {
    const context = getContext();

    return {
      ...headers,
      "X-Lab-Id": context.labId,
    };
  },
};

/**
 * Validates multi-tenant isolation in API response
 * @param {Object} response - API response
 * @param {string} labIdField - Field name containing labId
 * @returns {Object} Validated response
 * @throws {Error} If response contains data from other labs
 */
export const validateResponse = (response, labIdField = "labId") => {
  const context = getContext();

  if (!response) {
    return response;
  }

  // Single object validation
  if (response[labIdField]) {
    validateResourceOwnership(response, labIdField);
    return response;
  }

  // Array validation
  if (Array.isArray(response)) {
    response.forEach((item, index) => {
      if (item[labIdField] && item[labIdField] !== context.labId) {
        throw new Error(
          `Response contains data from different lab at index ${index}`
        );
      }
    });
    return response;
  }

  // Nested data validation
  if (response.data) {
    return {
      ...response,
      data: validateResponse(response.data, labIdField),
    };
  }

  return response;
};

/**
 * Wraps API call with automatic tenant isolation
 * @param {Function} apiCall - API call function
 * @param {Object} options - Options
 * @returns {Function} Wrapped API call
 */
export const withTenantIsolation = (apiCall, options = {}) => {
  return async (...args) => {
    const context = getContext();

    if (!context || !context.labId) {
      throw new Error("Cannot execute API call: lab context not set");
    }

    try {
      const result = await apiCall(...args);

      // Validate response if enabled
      if (options.validateResponse !== false) {
        return validateResponse(result, options.labIdField);
      }

      return result;
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  };
};

/**
 * Lambda Authorizer Context (for reference)
 * This shows how Lambda authorizer injects labId into API Gateway context
 */
export const LambdaAuthorizerExample = {
  /**
   * Generates IAM policy with labId context
   */
  generatePolicy: (principalId, effect, resource, labId) => {
    return {
      principalId: principalId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: effect,
            Resource: resource,
          },
        ],
      },
      context: {
        labId: labId,
        userId: principalId,
      },
    };
  },

  /**
   * Extracts labId from JWT token in authorizer
   */
  extractLabId: () => {
    // This would be implemented in Lambda authorizer
    // Returns labId from token custom claims
    // Example: const decoded = jwt.decode(token); return decoded['custom:labId'];
    return null;
  },
};

/**
 * Client-side query validation
 * Ensures all queries include labId before sending to API
 */
export const QueryValidator = {
  /**
   * Validates logistics query parameters
   * @param {Object} params - Query parameters
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateLogisticsQuery: (params) => {
    const context = getContext();

    if (!params.labId) {
      throw new Error("Query missing required labId parameter");
    }

    if (params.labId !== context.labId) {
      throw new Error("Query labId does not match user context");
    }

    return true;
  },

  /**
   * Validates route query parameters
   * @param {Object} params - Query parameters
   * @returns {boolean} True if valid
   */
  validateRouteQuery: (params) => {
    return QueryValidator.validateLogisticsQuery(params);
  },

  /**
   * Validates pickup query parameters
   * @param {Object} params - Query parameters
   * @returns {boolean} True if valid
   */
  validatePickupQuery: (params) => {
    return QueryValidator.validateLogisticsQuery(params);
  },
};

/**
 * Data sanitization before cross-lab operations
 * Removes sensitive lab-specific data before sharing
 */
export const sanitizeForCrossLab = (data, options = {}) => {
  const {
    removeFields = ["labId", "labName", "internalNotes"],
    maskFields = ["clinicId", "driverId"],
  } = options;

  const sanitized = { ...data };

  // Remove sensitive fields
  removeFields.forEach((field) => {
    delete sanitized[field];
  });

  // Mask fields
  maskFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = `***${sanitized[field].slice(-4)}`;
    }
  });

  return sanitized;
};

/**
 * Tenant context initialization helper
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Initialized context
 */
export const initializeTenantContext = async (token) => {
  try {
    const context = setLabContext(token);

    console.log("Tenant context initialized:", {
      labId: context.labId,
      userId: context.userId,
    });

    return context;
  } catch (error) {
    console.error("Failed to initialize tenant context:", error);
    throw error;
  }
};

/**
 * Gets current tenant isolation status
 * @returns {Object} Isolation status
 */
export const getTenantIsolationStatus = () => {
  try {
    const context = getContext();

    return {
      enabled: true,
      labId: context.labId,
      userId: context.userId,
      status: "ACTIVE",
    };
  } catch {
    return {
      enabled: false,
      labId: null,
      userId: null,
      status: "NOT_INITIALIZED",
    };
  }
};

/**
 * Middleware for React components
 * Validates tenant context before rendering
 * @param {Function} Component - React component
 * @returns {Function} Wrapped component
 */
export const withTenantContext = (Component) => {
  return (props) => {
    try {
      getContext();
      return Component(props);
    } catch (error) {
      console.error("Tenant context not available:", error);
      return null;
    }
  };
};

export default {
  setLabContext,
  getContext,
  clearContext,
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
};
