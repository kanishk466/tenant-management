// Appointment Validation

const validateBookAppointment = (data) => {
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

  // appointmentDate — required, must be future date
  if (!data.appointmentDate) {
    errors.push("appointmentDate is required");
  } else {
    const appointmentDate = new Date(data.appointmentDate);
    if (isNaN(appointmentDate.getTime())) {
      errors.push("appointmentDate must be a valid date");
    } else {
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDate < today) {
        errors.push("appointmentDate cannot be in the past");
      }
    }
  }

  // appointmentTime — required, format HH:MM
  if (!data.appointmentTime) {
    errors.push("appointmentTime is required");
  } else if (!/^\d{2}:\d{2}$/.test(data.appointmentTime)) {
    errors.push("appointmentTime must be in HH:MM format");
  }

  // visitType — optional but if provided, must be valid
  if (data.visitType && !["OPD", "FOLLOW_UP"].includes(data.visitType)) {
    errors.push("visitType must be OPD or FOLLOW_UP");
  }

  // reason — optional
  if (data.reason && typeof data.reason !== "string") {
    errors.push("reason must be a string");
  }

  // source — optional but if provided, must be valid
  if (data.source && !["COUNTER", "ONLINE", "PHONE"].includes(data.source)) {
    errors.push("source must be COUNTER, ONLINE, or PHONE");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateArriveAppointment = (data) => {
  const errors = [];

  // Nothing required for arrival
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateAppointmentStatus = (data) => {
  const errors = [];

  if (!data.status) {
    errors.push("status is required");
  } else if (!["CONFIRMED", "CANCELLED", "NO_SHOW"].includes(data.status)) {
    errors.push("status must be CONFIRMED, CANCELLED, or NO_SHOW");
  }

  if (data.cancellationReason && typeof data.cancellationReason !== "string") {
    errors.push("cancellationReason must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateGetSlots = (doctorId, appointmentDate) => {
  const errors = [];

  if (!doctorId) {
    errors.push("doctorId is required");
  }

  if (!appointmentDate) {
    errors.push("appointmentDate is required");
  } else {
    const date = new Date(appointmentDate);
    if (isNaN(date.getTime())) {
      errors.push("appointmentDate must be a valid date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Appointment status transitions
const APPOINTMENT_TRANSITIONS = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "ARRIVED"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED"], // Handled separately
  CANCELLED: [],
  NO_SHOW: [],
  COMPLETED: [],
};

const isValidAppointmentTransition = (currentStatus, newStatus) => {
  if (!APPOINTMENT_TRANSITIONS[currentStatus]) {
    return false;
  }
  return APPOINTMENT_TRANSITIONS[currentStatus].includes(newStatus);
};

module.exports = {
  validateBookAppointment,
  validateArriveAppointment,
  validateUpdateAppointmentStatus,
  validateGetSlots,
  APPOINTMENT_TRANSITIONS,
  isValidAppointmentTransition,
};
