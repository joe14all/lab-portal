/**
 * EHR Data Mappers
 * Section 6.4: EHR Systems → Logistics Integration
 *
 * Transforms external EHR system data formats to internal schema
 * Supports:
 * - Dentrix
 * - OpenDental
 * - Eaglesoft
 */

/**
 * Dentrix to Internal Format Mapper
 *
 * Dentrix Field Mapping:
 * - externalId → pickupId
 * - practiceId → clinicId
 * - patientName → metadata.patientName
 * - preferredPickupTime → windowStart/windowEnd
 * - priority (0-2) → isRush
 * - notes → notes
 */

/**
 * Maps Dentrix webhook data to internal pickup request format
 * @param {Object} dentrixData - Dentrix webhook payload
 * @param {string} dentrixData.externalId - Dentrix case ID
 * @param {string} dentrixData.practiceId - Dentrix practice identifier
 * @param {string} dentrixData.patientName - Patient full name
 * @param {string} dentrixData.preferredPickupTime - ISO timestamp
 * @param {number} dentrixData.priority - Priority level (0=normal, 1=high, 2=emergency)
 * @param {string} dentrixData.notes - Additional notes
 * @param {number} dentrixData.packageCount - Number of packages
 * @param {string} dentrixData.contactName - Contact person name
 * @param {string} dentrixData.contactPhone - Contact phone number
 * @returns {Object} Internal pickup request format
 */
export const mapDentrixToInternal = (dentrixData) => {
  const {
    externalId,
    practiceId,
    patientName,
    preferredPickupTime,
    priority = 0,
    notes,
    packageCount = 1,
    contactName,
    contactPhone,
    labId,
  } = dentrixData;

  // Parse preferred pickup time
  const pickupTime = new Date(preferredPickupTime);

  // Create 2-hour window around preferred time
  const windowStart = new Date(pickupTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const windowEnd = new Date(pickupTime.getTime() + 60 * 60 * 1000); // 1 hour after

  // Map priority: 0=normal, 1=high, 2=emergency
  const isRush = priority >= 1;

  return {
    pickupId: `dentrix-${externalId}`,
    clinicId: practiceId,
    labId: labId || "LAB001", // Default lab if not provided
    requestedBy: {
      userId: `dentrix-user-${practiceId}`,
      name: contactName || "Dentrix User",
      phone: contactPhone || "",
    },
    requestTime: new Date().toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    packageCount: packageCount,
    isRush: isRush,
    notes: notes || "",
    metadata: {
      source: "dentrix",
      externalId: externalId,
      patientName: patientName,
      originalPriority: priority,
    },
  };
};

/**
 * OpenDental to Internal Format Mapper
 *
 * OpenDental Field Mapping:
 * - LabCaseNum → pickupId
 * - ClinicNum → clinicId
 * - PatName → metadata.patientName
 * - DateTimeScheduled → windowStart/windowEnd
 * - Priority → isRush
 * - Note → notes
 */

/**
 * Maps OpenDental webhook data to internal pickup request format
 * @param {Object} openDentalData - OpenDental webhook payload
 * @param {string} openDentalData.LabCaseNum - OpenDental lab case number
 * @param {string} openDentalData.ClinicNum - OpenDental clinic number
 * @param {string} openDentalData.PatName - Patient name
 * @param {string} openDentalData.DateTimeScheduled - Scheduled datetime
 * @param {string} openDentalData.Priority - Priority level (Normal, High, Emergency)
 * @param {string} openDentalData.Note - Notes
 * @param {number} openDentalData.NumPackages - Number of packages
 * @param {string} openDentalData.ContactName - Contact person
 * @param {string} openDentalData.ContactPhone - Contact phone
 * @param {string} openDentalData.LabNum - Lab identifier
 * @returns {Object} Internal pickup request format
 */
export const mapOpenDentalToInternal = (openDentalData) => {
  const {
    LabCaseNum,
    ClinicNum,
    PatName,
    DateTimeScheduled,
    Priority = "Normal",
    Note,
    NumPackages = 1,
    ContactName,
    ContactPhone,
    LabNum,
  } = openDentalData;

  // Parse scheduled datetime
  const scheduledTime = new Date(DateTimeScheduled);

  // Create 2-hour window
  const windowStart = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(scheduledTime.getTime() + 60 * 60 * 1000);

  // Map priority string to boolean
  const priorityMap = {
    Normal: false,
    High: true,
    Emergency: true,
    Urgent: true,
  };
  const isRush = priorityMap[Priority] || false;

  return {
    pickupId: `opendental-${LabCaseNum}`,
    clinicId: String(ClinicNum),
    labId: LabNum || "LAB001",
    requestedBy: {
      userId: `opendental-user-${ClinicNum}`,
      name: ContactName || "OpenDental User",
      phone: ContactPhone || "",
    },
    requestTime: new Date().toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    packageCount: NumPackages,
    isRush: isRush,
    notes: Note || "",
    metadata: {
      source: "opendental",
      externalId: LabCaseNum,
      patientName: PatName,
      originalPriority: Priority,
    },
  };
};

/**
 * Eaglesoft to Internal Format Mapper
 *
 * Eaglesoft Field Mapping:
 * - caseId → pickupId
 * - practiceId → clinicId
 * - patientInfo.name → metadata.patientName
 * - scheduledPickup → windowStart/windowEnd
 * - urgency → isRush
 * - comments → notes
 */

/**
 * Maps Eaglesoft webhook data to internal pickup request format
 * @param {Object} eaglesoftData - Eaglesoft webhook payload
 * @param {string} eaglesoftData.caseId - Eaglesoft case ID
 * @param {string} eaglesoftData.practiceId - Practice identifier
 * @param {Object} eaglesoftData.patientInfo - Patient information
 * @param {string} eaglesoftData.patientInfo.name - Patient name
 * @param {string} eaglesoftData.scheduledPickup - Scheduled pickup time
 * @param {string} eaglesoftData.urgency - Urgency level (routine, urgent, stat)
 * @param {string} eaglesoftData.comments - Comments/notes
 * @param {number} eaglesoftData.itemCount - Number of items
 * @param {Object} eaglesoftData.contact - Contact information
 * @param {string} eaglesoftData.contact.name - Contact name
 * @param {string} eaglesoftData.contact.phone - Contact phone
 * @param {string} eaglesoftData.labId - Lab identifier
 * @returns {Object} Internal pickup request format
 */
export const mapEaglesoftToInternal = (eaglesoftData) => {
  const {
    caseId,
    practiceId,
    patientInfo = {},
    scheduledPickup,
    urgency = "routine",
    comments,
    itemCount = 1,
    contact = {},
    labId,
  } = eaglesoftData;

  // Parse scheduled pickup time
  const pickupTime = new Date(scheduledPickup);

  // Create 2-hour window
  const windowStart = new Date(pickupTime.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(pickupTime.getTime() + 60 * 60 * 1000);

  // Map urgency to rush status
  const urgencyMap = {
    routine: false,
    urgent: true,
    stat: true,
    emergency: true,
  };
  const isRush = urgencyMap[urgency.toLowerCase()] || false;

  return {
    pickupId: `eaglesoft-${caseId}`,
    clinicId: practiceId,
    labId: labId || "LAB001",
    requestedBy: {
      userId: `eaglesoft-user-${practiceId}`,
      name: contact.name || "Eaglesoft User",
      phone: contact.phone || "",
    },
    requestTime: new Date().toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    packageCount: itemCount,
    isRush: isRush,
    notes: comments || "",
    metadata: {
      source: "eaglesoft",
      externalId: caseId,
      patientName: patientInfo.name || "Unknown",
      originalUrgency: urgency,
    },
  };
};

/**
 * Generic EHR Mapper
 * Auto-detects EHR system and maps accordingly
 */

/**
 * Maps EHR data to internal format with auto-detection
 * @param {Object} ehrData - EHR system data
 * @param {string} ehrSystem - EHR system identifier (dentrix, opendental, eaglesoft)
 * @returns {Object} Internal pickup request format
 */
export const mapEHRToInternal = (ehrData, ehrSystem) => {
  const normalizedSystem = ehrSystem.toLowerCase();

  switch (normalizedSystem) {
    case "dentrix":
      return mapDentrixToInternal(ehrData);

    case "opendental":
      return mapOpenDentalToInternal(ehrData);

    case "eaglesoft":
      return mapEaglesoftToInternal(ehrData);

    default:
      throw new Error(`Unsupported EHR system: ${ehrSystem}`);
  }
};

/**
 * Internal to EHR Format Mappers (for responses/confirmations)
 */

/**
 * Maps internal pickup confirmation to Dentrix format
 * @param {Object} pickupData - Internal pickup data
 * @returns {Object} Dentrix-formatted response
 */
export const mapInternalToDentrix = (pickupData) => {
  return {
    externalId: pickupData.metadata?.externalId || pickupData.id,
    confirmationNumber: pickupData.id,
    status: pickupData.status,
    scheduledTime: pickupData.timeWindow?.start || pickupData.scheduledDate,
    estimatedArrival: pickupData.estimatedArrival,
    driverInfo: pickupData.assignedDriver
      ? {
          name: pickupData.assignedDriver.name,
          phone: pickupData.assignedDriver.phone,
        }
      : null,
  };
};

/**
 * Maps internal pickup confirmation to OpenDental format
 * @param {Object} pickupData - Internal pickup data
 * @returns {Object} OpenDental-formatted response
 */
export const mapInternalToOpenDental = (pickupData) => {
  return {
    LabCaseNum: pickupData.metadata?.externalId || pickupData.id,
    ConfirmationNum: pickupData.id,
    Status: pickupData.status,
    ScheduledDateTime: pickupData.timeWindow?.start || pickupData.scheduledDate,
    EstimatedArrival: pickupData.estimatedArrival,
    DriverName: pickupData.assignedDriver?.name || null,
    DriverPhone: pickupData.assignedDriver?.phone || null,
  };
};

/**
 * Maps internal pickup confirmation to Eaglesoft format
 * @param {Object} pickupData - Internal pickup data
 * @returns {Object} Eaglesoft-formatted response
 */
export const mapInternalToEaglesoft = (pickupData) => {
  return {
    caseId: pickupData.metadata?.externalId || pickupData.id,
    confirmationId: pickupData.id,
    status: pickupData.status,
    scheduledPickup: pickupData.timeWindow?.start || pickupData.scheduledDate,
    eta: pickupData.estimatedArrival,
    driver: pickupData.assignedDriver
      ? {
          name: pickupData.assignedDriver.name,
          contact: pickupData.assignedDriver.phone,
        }
      : null,
  };
};

/**
 * Validation Utilities
 */

/**
 * Validates Dentrix webhook payload
 * @param {Object} data - Dentrix data
 * @returns {Object} Validation result with valid flag and errors array
 */
export const validateDentrixData = (data) => {
  const errors = [];

  if (!data.externalId) errors.push("Missing externalId");
  if (!data.practiceId) errors.push("Missing practiceId");
  if (!data.preferredPickupTime) errors.push("Missing preferredPickupTime");

  // Validate date
  if (
    data.preferredPickupTime &&
    isNaN(new Date(data.preferredPickupTime).getTime())
  ) {
    errors.push("Invalid preferredPickupTime format");
  }

  // Validate priority
  if (data.priority !== undefined && (data.priority < 0 || data.priority > 2)) {
    errors.push("Priority must be 0, 1, or 2");
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Validates OpenDental webhook payload
 * @param {Object} data - OpenDental data
 * @returns {Object} Validation result
 */
export const validateOpenDentalData = (data) => {
  const errors = [];

  if (!data.LabCaseNum) errors.push("Missing LabCaseNum");
  if (!data.ClinicNum) errors.push("Missing ClinicNum");
  if (!data.DateTimeScheduled) errors.push("Missing DateTimeScheduled");

  // Validate date
  if (
    data.DateTimeScheduled &&
    isNaN(new Date(data.DateTimeScheduled).getTime())
  ) {
    errors.push("Invalid DateTimeScheduled format");
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Validates Eaglesoft webhook payload
 * @param {Object} data - Eaglesoft data
 * @returns {Object} Validation result
 */
export const validateEaglesoftData = (data) => {
  const errors = [];

  if (!data.caseId) errors.push("Missing caseId");
  if (!data.practiceId) errors.push("Missing practiceId");
  if (!data.scheduledPickup) errors.push("Missing scheduledPickup");

  // Validate date
  if (data.scheduledPickup && isNaN(new Date(data.scheduledPickup).getTime())) {
    errors.push("Invalid scheduledPickup format");
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
};

export default {
  mapDentrixToInternal,
  mapOpenDentalToInternal,
  mapEaglesoftToInternal,
  mapEHRToInternal,
  mapInternalToDentrix,
  mapInternalToOpenDental,
  mapInternalToEaglesoft,
  validateDentrixData,
  validateOpenDentalData,
  validateEaglesoftData,
};
