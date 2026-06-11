// Visit Validation

const validateCreateVisit = (data) => {
  const errors = [];

  // patientId — required
  if (!data.patientId) {
    errors.push("patientId is required");
  } else if (typeof data.patientId !== "string") {
    errors.push("patientId must be a string");
  }

  // doctorId — required
  if (!data.doctorId) {
    errors.push("doctorId is required");
  } else if (typeof data.doctorId !== "string") {
    errors.push("doctorId must be a string");
  }

  // visitType — required, enum
  if (!data.visitType) {
    errors.push("visitType is required");
  } else if (!["OPD", "FOLLOW_UP", "EMERGENCY", "WALKIN", "REVIEW"].includes(data.visitType)) {
    errors.push("visitType must be OPD, FOLLOW_UP, EMERGENCY, WALKIN, or REVIEW");
  }

  // chiefComplaint — optional, string if provided
  if (data.chiefComplaint && typeof data.chiefComplaint !== "string") {
    errors.push("chiefComplaint must be a string");
  }

  // referredBy — optional, string if provided
  if (data.referredBy && typeof data.referredBy !== "string") {
    errors.push("referredBy must be a string");
  }

  // isEmergency — optional, boolean if provided
  if (data.isEmergency !== undefined && typeof data.isEmergency !== "boolean") {
    errors.push("isEmergency must be a boolean");
  }

  // appointmentId — optional, string if provided
  if (data.appointmentId && typeof data.appointmentId !== "string") {
    errors.push("appointmentId must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateVisitStatus = (data) => {
  const errors = [];

  if (!data.status) {
    errors.push("status is required");
  } else if (
    ![
      "REGISTERED",
      "WAITING",
      "VITALS_DONE",
      "IN_CONSULTATION",
      "CONSULTATION_DONE",
      "BILLING_PENDING",
      "COMPLETED",
      "CANCELLED",
    ].includes(data.status)
  ) {
    errors.push(
      "status must be one of: REGISTERED, WAITING, VITALS_DONE, IN_CONSULTATION, CONSULTATION_DONE, BILLING_PENDING, COMPLETED, CANCELLED"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateCancelVisit = (data) => {
  const errors = [];

  // cancellationReason — optional
  if (data.cancellationReason && typeof data.cancellationReason !== "string") {
    errors.push("cancellationReason must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Allowed status transitions
const ALLOWED_TRANSITIONS = {
  REGISTERED: ["WAITING", "CANCELLED"],
  WAITING: ["VITALS_DONE", "CANCELLED"],
  VITALS_DONE: ["IN_CONSULTATION", "CANCELLED"],
  IN_CONSULTATION: ["CONSULTATION_DONE", "CANCELLED"],
  CONSULTATION_DONE: ["BILLING_PENDING", "CANCELLED"],
  BILLING_PENDING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // No transitions from COMPLETED
  CANCELLED: [], // No transitions from CANCELLED
};

const isValidStatusTransition = (currentStatus, newStatus) => {
  if (!ALLOWED_TRANSITIONS[currentStatus]) {
    return false;
  }
  return ALLOWED_TRANSITIONS[currentStatus].includes(newStatus);
};

module.exports = {
  validateCreateVisit,
  validateUpdateVisitStatus,
  validateCancelVisit,
  ALLOWED_TRANSITIONS,
  isValidStatusTransition,
};
