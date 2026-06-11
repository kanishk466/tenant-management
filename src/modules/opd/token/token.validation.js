// Token Validation

const validateCallToken = (data) => {
  const errors = [];

  // Nothing required in body typically — all from params
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateStartConsultation = (data) => {
  const errors = [];

  // Nothing required
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateCompleteConsultation = (data) => {
  const errors = [];

  // Nothing required
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateSkipToken = (data) => {
  const errors = [];

  // Skip reason optional
  if (data.skipReason && typeof data.skipReason !== "string") {
    errors.push("skipReason must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateRequeueToken = (data) => {
  const errors = [];

  // Nothing required
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Token status transitions for queue operations
const QUEUE_TRANSITIONS = {
  WAITING: ["CALLED", "SKIPPED"],
  CALLED: ["IN_CONSULTATION", "SKIPPED"],
  IN_CONSULTATION: ["DONE"],
  DONE: [],
  SKIPPED: ["WAITING"], // Requeue option
  CANCELLED: [],
};

const isValidQueueTransition = (currentStatus, newStatus) => {
  if (!QUEUE_TRANSITIONS[currentStatus]) {
    return false;
  }
  return QUEUE_TRANSITIONS[currentStatus].includes(newStatus);
};

module.exports = {
  validateCallToken,
  validateStartConsultation,
  validateCompleteConsultation,
  validateSkipToken,
  validateRequeueToken,
  QUEUE_TRANSITIONS,
  isValidQueueTransition,
};
