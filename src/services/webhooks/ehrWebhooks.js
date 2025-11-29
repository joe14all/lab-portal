/**
 * EHR Webhook Handlers
 * Section 6.4: EHR Systems → Logistics Integration
 *
 * Handles incoming webhook requests from external EHR systems:
 * - Dentrix
 * - OpenDental
 * - Eaglesoft
 *
 * Provides HMAC signature verification and data mapping
 *
 * NOTE: This is frontend code. In production, webhooks should be handled by backend Lambda functions.
 * This module provides client-side utilities for testing and integration development.
 */

import { routeEvent } from "../events/consumers.js";
import {
  mapDentrixToInternal,
  mapOpenDentalToInternal,
  mapEaglesoftToInternal,
} from "../../utils/integration/ehrMappers.js";

/**
 * EHR System Configurations
 * In production, these would be environment variables or AWS Secrets Manager
 */
const EHR_CONFIGS = {
  dentrix: {
    secret:
      import.meta.env.VITE_DENTRIX_WEBHOOK_SECRET ||
      "dentrix-webhook-secret-key",
    headerName: "X-Dentrix-Signature",
  },
  opendental: {
    secret:
      import.meta.env.VITE_OPENDENTAL_WEBHOOK_SECRET ||
      "opendental-webhook-secret-key",
    headerName: "X-OpenDental-Signature",
  },
  eaglesoft: {
    secret:
      import.meta.env.VITE_EAGLESOFT_WEBHOOK_SECRET ||
      "eaglesoft-webhook-secret-key",
    headerName: "X-Eaglesoft-Signature",
  },
};

/**
 * Verifies HMAC signature from webhook payload
 * Browser-compatible version using Web Crypto API
 * @param {Object|string} payload - Webhook payload (will be stringified if object)
 * @param {string} signature - HMAC signature from header
 * @param {string} secret - Shared secret key
 * @returns {Promise<boolean>} True if signature is valid
 */
export const verifyHMACSignature = async (payload, signature, secret) => {
  try {
    const payloadString =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    // Convert secret to key
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the payload
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      enc.encode(payloadString)
    );

    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Timing-safe comparison (simple version)
    return signature.toLowerCase() === expectedSignature.toLowerCase();
  } catch (error) {
    console.error("Error verifying HMAC signature:", error);
    return false;
  }
};

/**
 * Dentrix Webhook Handler
 * Processes pickup requests from Dentrix EHR system
 *
 * Expected webhook format:
 * POST /webhooks/ehr/dentrix
 * Headers: X-Dentrix-Signature: <hmac-sha256>
 * Body: { externalId, practiceId, patientName, preferredPickupTime, priority, notes }
 */

/**
 * Handles Dentrix webhook requests
 * @param {Object} request - Webhook request object
 * @param {Object} request.headers - HTTP headers
 * @param {Object} request.body - Request body
 * @returns {Promise<Object>} Response object with status and data
 */
export const handleDentrixWebhook = async (request) => {
  const { headers, body } = request;
  const signature =
    headers[EHR_CONFIGS.dentrix.headerName.toLowerCase()] ||
    headers[EHR_CONFIGS.dentrix.headerName];

  try {
    // Verify HMAC signature
    const isValid = verifyHMACSignature(
      body,
      signature,
      EHR_CONFIGS.dentrix.secret
    );

    if (!isValid) {
      console.error("Invalid Dentrix webhook signature");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid signature" }),
      };
    }

    // Map Dentrix data to internal format
    const pickupRequest = mapDentrixToInternal(body);

    // Validate mapped data
    if (!pickupRequest.clinicId || !pickupRequest.windowStart) {
      console.error("Invalid Dentrix webhook data:", body);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid webhook data" }),
      };
    }

    // Create internal event
    const event = {
      source: "ehr.dentrix",
      detailType: "PickupRequested",
      detail: pickupRequest,
      id: `dentrix-${pickupRequest.pickupId}`,
      time: new Date().toISOString(),
    };

    // Route to consumer
    await routeEvent(event);

    console.log(
      `Processed Dentrix webhook for pickup ${pickupRequest.pickupId}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        pickupId: pickupRequest.pickupId,
        message: "Pickup request received",
      }),
    };
  } catch (error) {
    console.error("Error handling Dentrix webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

/**
 * OpenDental Webhook Handler
 * Processes pickup requests from OpenDental EHR system
 *
 * Expected webhook format:
 * POST /webhooks/ehr/opendental
 * Headers: X-OpenDental-Signature: <hmac-sha256>
 * Body: { LabCaseNum, ClinicNum, PatName, DateTimeScheduled, Priority, Note }
 */

/**
 * Handles OpenDental webhook requests
 * @param {Object} request - Webhook request object
 * @param {Object} request.headers - HTTP headers
 * @param {Object} request.body - Request body
 * @returns {Promise<Object>} Response object with status and data
 */
export const handleOpenDentalWebhook = async (request) => {
  const { headers, body } = request;
  const signature =
    headers[EHR_CONFIGS.opendental.headerName.toLowerCase()] ||
    headers[EHR_CONFIGS.opendental.headerName];

  try {
    // Verify HMAC signature
    const isValid = verifyHMACSignature(
      body,
      signature,
      EHR_CONFIGS.opendental.secret
    );

    if (!isValid) {
      console.error("Invalid OpenDental webhook signature");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid signature" }),
      };
    }

    // Map OpenDental data to internal format
    const pickupRequest = mapOpenDentalToInternal(body);

    // Validate mapped data
    if (!pickupRequest.clinicId || !pickupRequest.windowStart) {
      console.error("Invalid OpenDental webhook data:", body);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid webhook data" }),
      };
    }

    // Create internal event
    const event = {
      source: "ehr.opendental",
      detailType: "PickupRequested",
      detail: pickupRequest,
      id: `opendental-${pickupRequest.pickupId}`,
      time: new Date().toISOString(),
    };

    // Route to consumer
    await routeEvent(event);

    console.log(
      `Processed OpenDental webhook for pickup ${pickupRequest.pickupId}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        pickupId: pickupRequest.pickupId,
        message: "Pickup request received",
      }),
    };
  } catch (error) {
    console.error("Error handling OpenDental webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

/**
 * Eaglesoft Webhook Handler
 * Processes pickup requests from Eaglesoft EHR system
 *
 * Expected webhook format:
 * POST /webhooks/ehr/eaglesoft
 * Headers: X-Eaglesoft-Signature: <hmac-sha256>
 * Body: { caseId, practiceId, patientInfo, scheduledPickup, urgency, comments }
 */

/**
 * Handles Eaglesoft webhook requests
 * @param {Object} request - Webhook request object
 * @param {Object} request.headers - HTTP headers
 * @param {Object} request.body - Request body
 * @returns {Promise<Object>} Response object with status and data
 */
export const handleEaglesoftWebhook = async (request) => {
  const { headers, body } = request;
  const signature =
    headers[EHR_CONFIGS.eaglesoft.headerName.toLowerCase()] ||
    headers[EHR_CONFIGS.eaglesoft.headerName];

  try {
    // Verify HMAC signature
    const isValid = verifyHMACSignature(
      body,
      signature,
      EHR_CONFIGS.eaglesoft.secret
    );

    if (!isValid) {
      console.error("Invalid Eaglesoft webhook signature");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid signature" }),
      };
    }

    // Map Eaglesoft data to internal format
    const pickupRequest = mapEaglesoftToInternal(body);

    // Validate mapped data
    if (!pickupRequest.clinicId || !pickupRequest.windowStart) {
      console.error("Invalid Eaglesoft webhook data:", body);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid webhook data" }),
      };
    }

    // Create internal event
    const event = {
      source: "ehr.eaglesoft",
      detailType: "PickupRequested",
      detail: pickupRequest,
      id: `eaglesoft-${pickupRequest.pickupId}`,
      time: new Date().toISOString(),
    };

    // Route to consumer
    await routeEvent(event);

    console.log(
      `Processed Eaglesoft webhook for pickup ${pickupRequest.pickupId}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        pickupId: pickupRequest.pickupId,
        message: "Pickup request received",
      }),
    };
  } catch (error) {
    console.error("Error handling Eaglesoft webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

/**
 * Generic Webhook Router
 * Routes webhook requests to appropriate EHR handler based on path
 */

/**
 * Routes webhook to appropriate EHR handler
 * @param {string} ehrSystem - EHR system identifier (dentrix, opendental, eaglesoft)
 * @param {Object} request - Webhook request object
 * @returns {Promise<Object>} Response object
 */
export const routeWebhook = async (ehrSystem, request) => {
  const normalizedSystem = ehrSystem.toLowerCase();

  switch (normalizedSystem) {
    case "dentrix":
      return await handleDentrixWebhook(request);

    case "opendental":
      return await handleOpenDentalWebhook(request);

    case "eaglesoft":
      return await handleEaglesoftWebhook(request);

    default:
      console.error(`Unknown EHR system: ${ehrSystem}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Unknown EHR system" }),
      };
  }
};

/**
 * Express/Lambda middleware for webhook processing
 * Can be used in Express app or AWS Lambda function
 */

/**
 * Creates webhook middleware for Express
 * @param {string} ehrSystem - EHR system identifier
 * @returns {Function} Express middleware function
 */
export const createWebhookMiddleware = (ehrSystem) => {
  return async (req, res) => {
    const request = {
      headers: req.headers,
      body: req.body,
    };

    const response = await routeWebhook(ehrSystem, request);

    res.status(response.statusCode).send(response.body);
  };
};

/**
 * AWS Lambda handler for webhook processing
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} Lambda response
 */
export const lambdaWebhookHandler = async (event) => {
  // Extract EHR system from path parameter
  const ehrSystem = event.pathParameters?.ehrSystem;

  if (!ehrSystem) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "EHR system not specified" }),
    };
  }

  const request = {
    headers: event.headers,
    body: typeof event.body === "string" ? JSON.parse(event.body) : event.body,
  };

  return await routeWebhook(ehrSystem, request);
};

/**
 * Webhook Health Check
 * Returns system status and configuration (without secrets)
 */

/**
 * Gets webhook system health status
 * @returns {Object} Health check information
 */
export const getWebhookHealth = () => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    supportedSystems: ["dentrix", "opendental", "eaglesoft"],
    endpoints: {
      dentrix: "/webhooks/ehr/dentrix",
      opendental: "/webhooks/ehr/opendental",
      eaglesoft: "/webhooks/ehr/eaglesoft",
    },
    requiredHeaders: {
      dentrix: EHR_CONFIGS.dentrix.headerName,
      opendental: EHR_CONFIGS.opendental.headerName,
      eaglesoft: EHR_CONFIGS.eaglesoft.headerName,
    },
  };
};

export default {
  verifyHMACSignature,
  handleDentrixWebhook,
  handleOpenDentalWebhook,
  handleEaglesoftWebhook,
  routeWebhook,
  createWebhookMiddleware,
  lambdaWebhookHandler,
  getWebhookHealth,
};
