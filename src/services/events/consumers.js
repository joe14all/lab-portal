/**
 * Event Consumers - Cross-Domain Event Handlers
 * Section 6: Integration Points & Event Flows
 *
 * Handles incoming events from:
 * - Production domain (CaseReadyToShip)
 * - CRM domain (PickupRequested)
 * - Logistics domain (DeliveryCompleted for Finance integration)
 */

import { api } from "../api/logistics.js";
import { validateTimeWindow } from "../../utils/logistics/timeWindowValidator.js";

/**
 * 6.1 Production → Logistics Integration
 * Handles CaseReadyToShip events from production domain
 */

/**
 * Creates a delivery task when a case is ready to ship
 * @param {Object} event - CaseReadyToShip event
 * @param {string} event.source - 'cases.production'
 * @param {string} event.detailType - 'CaseReadyToShip'
 * @param {Object} event.detail - Event payload
 * @returns {Promise<Object>} Created delivery task
 */
export const handleCaseReadyToShip = async (event) => {
  const {
    caseId,
    clinicId,
    priority,
    requestedDeliveryDate,
    packageSpecs,
    labId,
    patientName,
    notes,
  } = event.detail;

  try {
    // Find existing pickup/delivery for the same date and clinic
    const existingDelivery = await findDeliveryForDate(
      clinicId,
      requestedDeliveryDate
    );

    if (existingDelivery && existingDelivery.status === "Pending") {
      // Append case to existing delivery
      const updatedDelivery = await appendCaseToDelivery(existingDelivery.id, {
        caseId: caseId,
        patientName: patientName,
        packageSpecs: packageSpecs,
        notes: notes,
      });

      console.log(
        `Case ${caseId} added to existing delivery ${existingDelivery.id}`
      );
      return updatedDelivery;
    } else {
      // Create new delivery task
      const deliveryTask = await api.createDelivery({
        labId,
        clinicId,
        caseIds: [caseId],
        scheduledDate: requestedDeliveryDate,
        priority: priority || "STANDARD",
        type: "Delivery",
        status: "Pending",
        packageSpecs,
        metadata: {
          patientName,
          notes,
          sourceEvent: "CaseReadyToShip",
          sourceEventId: event.id,
        },
      });

      // Notify dispatcher if rush
      if (priority === "RUSH" || priority === "EMERGENCY") {
        await notifyDispatcher({
          type: "RUSH_DELIVERY",
          caseId,
          clinicId,
          requestedDeliveryDate,
          priority,
        });
      }

      console.log(
        `Created new delivery task ${deliveryTask.id} for case ${caseId}`
      );
      return deliveryTask;
    }
  } catch (error) {
    console.error("Error handling CaseReadyToShip event:", error);
    throw error;
  }
};

/**
 * Finds an existing delivery task for a clinic on a specific date
 * @param {string} clinicId - Clinic identifier
 * @param {string} date - ISO date string
 * @returns {Promise<Object|null>} Delivery task or null
 */
const findDeliveryForDate = async (clinicId, date) => {
  try {
    const deliveries = await api.getDeliveries({
      clinicId,
      scheduledDate: date,
      status: "Pending",
    });

    return deliveries.length > 0 ? deliveries[0] : null;
  } catch (error) {
    console.error("Error finding delivery for date:", error);
    return null;
  }
};

/**
 * Appends a case to an existing delivery task
 * @param {string} deliveryId - Delivery task identifier
 * @param {Object} caseData - Case information
 * @returns {Promise<Object>} Updated delivery task
 */
const appendCaseToDelivery = async (deliveryId, caseData) => {
  try {
    const delivery = await api.getDeliveryById(deliveryId);

    const updatedCaseIds = [...(delivery.caseIds || []), caseData.caseId];
    const updatedNotes = delivery.metadata?.notes
      ? `${delivery.metadata.notes}\n\n${caseData.notes || ""}`
      : caseData.notes;

    return await api.updateDelivery(deliveryId, {
      caseIds: updatedCaseIds,
      metadata: {
        ...delivery.metadata,
        notes: updatedNotes,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error appending case to delivery:", error);
    throw error;
  }
};

/**
 * 6.2 Logistics → Finance Integration
 * Handles DeliveryCompleted events to update invoices
 */

/**
 * Marks invoices as delivered when delivery is completed
 * @param {Object} event - DeliveryCompleted event
 * @param {string} event.source - 'logistics.driver'
 * @param {string} event.detailType - 'DeliveryCompleted'
 * @param {Object} event.detail - Event payload
 * @returns {Promise<void>}
 */
export const handleDeliveryCompleted = async (event) => {
  const { caseIds, deliveredAt, proofOfDelivery, receivedBy, stopId, routeId } =
    event.detail;

  try {
    // Get invoices for delivered cases
    const invoices = await getInvoicesForCases(caseIds);

    if (invoices.length === 0) {
      console.warn(`No invoices found for cases: ${caseIds.join(", ")}`);
      return;
    }

    // Update each invoice with delivery confirmation
    const updatePromises = invoices.map((invoice) =>
      updateInvoiceStatus(invoice.id, {
        status: "Delivered",
        deliveryConfirmation: {
          signatureUrl: proofOfDelivery.signatureUrl,
          photoUrl: proofOfDelivery.photoUrl,
          receivedBy: receivedBy.name,
          receivedByTitle: receivedBy.title,
          verifiedAt: deliveredAt,
          verificationCode: proofOfDelivery.verificationCode,
          geoHash: proofOfDelivery.geoHash,
          stopId,
          routeId,
        },
      })
    );

    await Promise.all(updatePromises);

    // Trigger billing workflow
    await triggerBillingWorkflow(invoices, {
      deliveredAt,
      proofOfDelivery,
      receivedBy,
    });

    console.log(`Updated ${invoices.length} invoices for delivery completion`);
  } catch (error) {
    console.error("Error handling DeliveryCompleted event:", error);
    throw error;
  }
};

/**
 * Gets invoices associated with case IDs
 * Mock implementation - replace with actual Finance API call
 * @param {string[]} caseIds - Array of case identifiers
 * @returns {Promise<Array>} Array of invoice objects
 */
const getInvoicesForCases = async (caseIds) => {
  // TODO: Replace with actual Finance domain API call
  console.log(`[MOCK] Fetching invoices for cases: ${caseIds.join(", ")}`);

  // Mock response
  return caseIds.map((caseId) => ({
    id: `INV-${caseId}`,
    caseId,
    status: "Pending",
    amount: 500.0,
    createdAt: new Date().toISOString(),
  }));
};

/**
 * Updates invoice status and delivery confirmation
 * Mock implementation - replace with actual Finance API call
 * @param {string} invoiceId - Invoice identifier
 * @param {Object} updates - Update payload
 * @returns {Promise<Object>} Updated invoice
 */
const updateInvoiceStatus = async (invoiceId, updates) => {
  // TODO: Replace with actual Finance domain API call
  console.log(`[MOCK] Updating invoice ${invoiceId}:`, updates);

  return {
    id: invoiceId,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Triggers billing workflow for delivered invoices
 * Mock implementation - replace with actual Finance workflow
 * @param {Array} invoices - Array of invoice objects
 * @param {Object} deliveryData - Delivery confirmation data
 * @returns {Promise<void>}
 */
const triggerBillingWorkflow = async (invoices, deliveryData) => {
  // TODO: Replace with actual Finance domain workflow trigger
  console.log(
    `[MOCK] Triggering billing workflow for ${invoices.length} invoices`,
    deliveryData
  );

  // Could publish event to Finance domain's EventBridge
  // await publishEvent('finance.billing', 'BillingTriggered', { invoices, deliveryData });
};

/**
 * 6.3 CRM → Logistics Integration
 * Handles PickupRequested events from CRM portal
 */

/**
 * Processes pickup request from clinic portal
 * @param {Object} event - PickupRequested event
 * @param {string} event.source - 'crm.portal'
 * @param {string} event.detailType - 'PickupRequested'
 * @param {Object} event.detail - Event payload
 * @returns {Promise<Object>} Created pickup request
 */
export const handlePickupRequested = async (event) => {
  const {
    pickupId,
    clinicId,
    labId,
    requestedBy,
    requestTime,
    windowStart,
    windowEnd,
    packageCount,
    isRush,
    notes,
    recurringSchedule,
  } = event.detail;

  try {
    // Get clinic details
    const clinic = await getClinic(clinicId);

    if (!clinic) {
      throw new Error(`Clinic not found: ${clinicId}`);
    }

    // Validate time window against clinic operating hours
    const isValidWindow = validateTimeWindow(
      new Date(windowStart),
      new Date(windowEnd),
      clinic.operatingHours
    );

    if (!isValidWindow.valid) {
      throw new Error(`Invalid pickup window: ${isValidWindow.reason}`);
    }

    // Create pickup request
    const pickupRequest = await api.createPickup({
      id: pickupId,
      labId,
      clinicId,
      type: "Pickup",
      status: "Pending",
      scheduledDate: windowStart,
      timeWindow: {
        start: windowStart,
        end: windowEnd,
      },
      packageCount,
      priority: isRush ? "RUSH" : "STANDARD",
      requestedBy,
      notes,
      metadata: {
        sourceEvent: "PickupRequested",
        sourceEventId: event.id,
        requestTime,
      },
    });

    // Handle recurring schedule if specified
    if (recurringSchedule) {
      await generateRecurringPickups(
        clinicId,
        labId,
        recurringSchedule,
        requestedBy,
        90 // Generate for next 90 days
      );
    }

    // Notify dispatcher if rush
    if (isRush) {
      await notifyDispatcher({
        type: "RUSH_PICKUP",
        pickupId,
        clinicId,
        requestedBy: requestedBy.name,
        phone: requestedBy.phone,
        windowStart,
        windowEnd,
      });
    }

    console.log(`Created pickup request ${pickupId} for clinic ${clinicId}`);
    return pickupRequest;
  } catch (error) {
    console.error("Error handling PickupRequested event:", error);
    throw error;
  }
};

/**
 * Generates recurring pickup requests based on schedule
 * @param {string} clinicId - Clinic identifier
 * @param {string} labId - Lab identifier
 * @param {Object} schedule - Recurring schedule configuration
 * @param {Object} requestedBy - Requester information
 * @param {number} days - Number of days to generate (default 90)
 * @returns {Promise<Array>} Array of created pickup requests
 */
const generateRecurringPickups = async (
  clinicId,
  labId,
  schedule,
  requestedBy,
  days = 90
) => {
  const { frequency, daysOfWeek, timeWindow } = schedule;
  const pickups = [];
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if this day matches the schedule
    const shouldCreatePickup =
      frequency === "DAILY" ||
      (frequency === "WEEKLY" && daysOfWeek.includes(dayOfWeek)) ||
      (frequency === "BIWEEKLY" &&
        daysOfWeek.includes(dayOfWeek) &&
        isAlternateWeek(currentDate, startDate));

    if (shouldCreatePickup) {
      try {
        const pickup = await api.createPickup({
          labId,
          clinicId,
          type: "Pickup",
          status: "Pending",
          scheduledDate: currentDate.toISOString().split("T")[0],
          timeWindow: {
            start: `${currentDate.toISOString().split("T")[0]}T${
              timeWindow.start
            }`,
            end: `${currentDate.toISOString().split("T")[0]}T${timeWindow.end}`,
          },
          priority: "STANDARD",
          requestedBy,
          metadata: {
            sourceEvent: "RecurringPickupGenerated",
            recurringSchedule: schedule,
          },
        });

        pickups.push(pickup);
      } catch (error) {
        console.error(
          `Error creating recurring pickup for ${currentDate.toISOString()}:`,
          error
        );
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(
    `Generated ${pickups.length} recurring pickups for clinic ${clinicId}`
  );
  return pickups;
};

/**
 * Checks if current date is in an alternate week (for biweekly schedules)
 * @param {Date} currentDate - Current date
 * @param {Date} startDate - Start date of schedule
 * @returns {boolean} True if in alternate week
 */
const isAlternateWeek = (currentDate, startDate) => {
  const weeksDiff = Math.floor(
    (currentDate - startDate) / (7 * 24 * 60 * 60 * 1000)
  );
  return weeksDiff % 2 === 0;
};

/**
 * Gets clinic details by ID
 * Mock implementation - replace with actual CRM API call
 * @param {string} clinicId - Clinic identifier
 * @returns {Promise<Object>} Clinic object
 */
const getClinic = async (clinicId) => {
  // TODO: Replace with actual CRM domain API call
  console.log(`[MOCK] Fetching clinic details for: ${clinicId}`);

  // Mock response
  return {
    id: clinicId,
    name: "Sample Dental Clinic",
    address: {
      street: "123 Main St",
      city: "Boston",
      state: "MA",
      zip: "02101",
      coordinates: { lat: 42.3601, lng: -71.0589 },
    },
    operatingHours: {
      monday: { open: "08:00", close: "17:00" },
      tuesday: { open: "08:00", close: "17:00" },
      wednesday: { open: "08:00", close: "17:00" },
      thursday: { open: "08:00", close: "17:00" },
      friday: { open: "08:00", close: "17:00" },
      saturday: null,
      sunday: null,
    },
    phone: "(555) 123-4567",
    contactEmail: "contact@sampleclinic.com",
  };
};

/**
 * Notifies dispatcher of urgent delivery/pickup
 * Mock implementation - replace with actual notification service
 * @param {Object} notification - Notification data
 * @returns {Promise<void>}
 */
const notifyDispatcher = async (notification) => {
  // TODO: Replace with actual notification service (SNS, Twilio, etc.)
  console.log("[MOCK] Sending dispatcher notification:", notification);

  // Could send SMS via SNS
  // await sns.publish({
  //   PhoneNumber: DISPATCHER_PHONE,
  //   Message: `URGENT: ${notification.type} - ${notification.clinicId}`
  // });
};

/**
 * Event Router
 * Routes incoming events to appropriate handler based on event type
 */

/**
 * Routes event to appropriate consumer handler
 * @param {Object} event - Event object with source, detailType, and detail
 * @returns {Promise<any>} Handler result
 */
export const routeEvent = async (event) => {
  const { source, detailType } = event;

  try {
    // Production → Logistics
    if (source === "cases.production" && detailType === "CaseReadyToShip") {
      return await handleCaseReadyToShip(event);
    }

    // Logistics → Finance
    if (source === "logistics.driver" && detailType === "DeliveryCompleted") {
      return await handleDeliveryCompleted(event);
    }

    // CRM → Logistics
    if (source === "crm.portal" && detailType === "PickupRequested") {
      return await handlePickupRequested(event);
    }

    // Unknown event type
    console.warn("Unknown event type:", { source, detailType });
    return null;
  } catch (error) {
    console.error("Error routing event:", error);
    throw error;
  }
};

/**
 * Batch processes multiple events
 * @param {Array} events - Array of event objects
 * @returns {Promise<Array>} Array of processing results
 */
export const processBatchEvents = async (events) => {
  const results = await Promise.allSettled(
    events.map((event) => routeEvent(event))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(
    `Processed ${events.length} events: ${succeeded} succeeded, ${failed} failed`
  );

  return results;
};

export default {
  handleCaseReadyToShip,
  handleDeliveryCompleted,
  handlePickupRequested,
  routeEvent,
  processBatchEvents,
};
