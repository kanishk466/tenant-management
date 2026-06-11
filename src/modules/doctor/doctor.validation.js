// Doctor Module — Validation Logic

const validateCreateDoctor = (data) => {
  const errors = [];

  // name — required, min 2, max 100
  if (!data.name) {
    errors.push("name is required");
  } else if (typeof data.name !== "string") {
    errors.push("name must be a string");
  } else if (data.name.trim().length < 2) {
    errors.push("name must be at least 2 characters");
  } else if (data.name.trim().length > 100) {
    errors.push("name must not exceed 100 characters");
  }

  // email — required, valid email
  if (!data.email) {
    errors.push("email is required");
  } else if (typeof data.email !== "string") {
    errors.push("email must be a string");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("email must be a valid email address");
  }

  // phone — optional, Indian mobile validation
  if (data.phone) {
    if (typeof data.phone !== "string") {
      errors.push("phone must be a string");
    } else if (!/^[6-9]\d{9}$/.test(data.phone)) {
      errors.push("phone must be a valid Indian mobile number (10 digits starting with 6-9)");
    }
  }

  // specialization — optional
  if (data.specialization && typeof data.specialization !== "string") {
    errors.push("specialization must be a string");
  }

  // qualification — optional
  if (data.qualification && typeof data.qualification !== "string") {
    errors.push("qualification must be a string");
  }

  // registrationNo — optional
  if (data.registrationNo && typeof data.registrationNo !== "string") {
    errors.push("registrationNo must be a string");
  }

  // department — optional
  if (data.department && typeof data.department !== "string") {
    errors.push("department must be a string");
  }

  // consultationFee — required, min 0
  if (data.consultationFee === undefined || data.consultationFee === null) {
    errors.push("consultationFee is required");
  } else {
    const fee = parseFloat(data.consultationFee);
    if (isNaN(fee) || fee < 0) {
      errors.push("consultationFee must be a valid number >= 0");
    }
  }

  // followUpFee — optional, min 0
  if (data.followUpFee !== undefined && data.followUpFee !== null) {
    const fee = parseFloat(data.followUpFee);
    if (isNaN(fee) || fee < 0) {
      errors.push("followUpFee must be a valid number >= 0");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateDoctor = (data) => {
  const errors = [];

  // name — optional but if provided, min 2, max 100
  if (data.name !== undefined) {
    if (typeof data.name !== "string") {
      errors.push("name must be a string");
    } else if (data.name.trim().length < 2) {
      errors.push("name must be at least 2 characters");
    } else if (data.name.trim().length > 100) {
      errors.push("name must not exceed 100 characters");
    }
  }

  // specialization — optional
  if (data.specialization !== undefined && typeof data.specialization !== "string") {
    errors.push("specialization must be a string");
  }

  // qualification — optional
  if (data.qualification !== undefined && typeof data.qualification !== "string") {
    errors.push("qualification must be a string");
  }

  // registrationNo — optional
  if (data.registrationNo !== undefined && typeof data.registrationNo !== "string") {
    errors.push("registrationNo must be a string");
  }

  // department — optional
  if (data.department !== undefined && typeof data.department !== "string") {
    errors.push("department must be a string");
  }

  // consultationFee — optional, min 0
  if (data.consultationFee !== undefined && data.consultationFee !== null) {
    const fee = parseFloat(data.consultationFee);
    if (isNaN(fee) || fee < 0) {
      errors.push("consultationFee must be a valid number >= 0");
    }
  }

  // followUpFee — optional, min 0
  if (data.followUpFee !== undefined && data.followUpFee !== null) {
    const fee = parseFloat(data.followUpFee);
    if (isNaN(fee) || fee < 0) {
      errors.push("followUpFee must be a valid number >= 0");
    }
  }

  // signatureUrl — optional
  if (data.signatureUrl !== undefined && typeof data.signatureUrl !== "string") {
    errors.push("signatureUrl must be a string");
  }

  // isActive — optional, must be boolean
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.push("isActive must be a boolean");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateSchedule = (data) => {
  const errors = [];

  if (!data.schedule) {
    errors.push("schedule is required");
    return { isValid: false, errors };
  }

  if (!Array.isArray(data.schedule)) {
    errors.push("schedule must be an array");
    return { isValid: false, errors };
  }

  if (data.schedule.length === 0) {
    errors.push("schedule must contain at least one day");
    return { isValid: false, errors };
  }

  // Validate each day
  data.schedule.forEach((day, dayIndex) => {
    if (day.dayOfWeek === undefined || day.dayOfWeek === null) {
      errors.push(`schedule[${dayIndex}].dayOfWeek is required`);
    } else if (typeof day.dayOfWeek !== "number" || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      errors.push(`schedule[${dayIndex}].dayOfWeek must be between 0 and 6`);
    }

    if (!day.sessions || !Array.isArray(day.sessions)) {
      errors.push(`schedule[${dayIndex}].sessions must be an array`);
      return;
    }

    // Validate sessions for this day
    day.sessions.forEach((session, sessionIndex) => {
      const prefix = `schedule[${dayIndex}].sessions[${sessionIndex}]`;

      // startTime validation
      if (!session.startTime) {
        errors.push(`${prefix}.startTime is required`);
      } else if (!/^\d{2}:\d{2}$/.test(session.startTime)) {
        errors.push(`${prefix}.startTime must be in HH:MM format`);
      }

      // endTime validation
      if (!session.endTime) {
        errors.push(`${prefix}.endTime is required`);
      } else if (!/^\d{2}:\d{2}$/.test(session.endTime)) {
        errors.push(`${prefix}.endTime must be in HH:MM format`);
      }

      // Validate startTime < endTime
      if (session.startTime && session.endTime) {
        const [startH, startM] = session.startTime.split(":").map(Number);
        const [endH, endM] = session.endTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (startMinutes >= endMinutes) {
          errors.push(`${prefix}: startTime must be before endTime`);
        }
      }

      // slotDurationMin validation
      if (!session.slotDurationMin) {
        errors.push(`${prefix}.slotDurationMin is required`);
      } else if (![5, 10, 15, 20, 30, 60].includes(session.slotDurationMin)) {
        errors.push(`${prefix}.slotDurationMin must be one of: 5, 10, 15, 20, 30, 60`);
      }

      // maxPatients validation
      if (!session.maxPatients) {
        errors.push(`${prefix}.maxPatients is required`);
      } else if (typeof session.maxPatients !== "number" || session.maxPatients < 1 || session.maxPatients > 200) {
        errors.push(`${prefix}.maxPatients must be between 1 and 200`);
      }
    });

    // Check for overlapping sessions within same day
    if (day.sessions && Array.isArray(day.sessions)) {
      for (let i = 0; i < day.sessions.length; i++) {
        for (let j = i + 1; j < day.sessions.length; j++) {
          const s1 = day.sessions[i];
          const s2 = day.sessions[j];

          if (s1.startTime && s1.endTime && s2.startTime && s2.endTime) {
            const [s1StartH, s1StartM] = s1.startTime.split(":").map(Number);
            const [s1EndH, s1EndM] = s1.endTime.split(":").map(Number);
            const [s2StartH, s2StartM] = s2.startTime.split(":").map(Number);
            const [s2EndH, s2EndM] = s2.endTime.split(":").map(Number);

            const s1StartMin = s1StartH * 60 + s1StartM;
            const s1EndMin = s1EndH * 60 + s1EndM;
            const s2StartMin = s2StartH * 60 + s2StartM;
            const s2EndMin = s2EndH * 60 + s2EndM;

            // Check overlap: A.start < B.end && B.start < A.end
            if (s1StartMin < s2EndMin && s2StartMin < s1EndMin) {
              errors.push({
                code: "SCHEDULE_SESSION_OVERLAP",
                message: `schedule[${dayIndex}]: Sessions overlap - Session ${i} (${s1.startTime}-${s1.endTime}) overlaps with Session ${j} (${s2.startTime}-${s2.endTime})`,
              });
            }
          }
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateLeaveDate = (leaveDate) => {
  const errors = [];

  if (!leaveDate) {
    errors.push("leaveDate is required");
  } else {
    const date = new Date(leaveDate);
    if (isNaN(date.getTime())) {
      errors.push("leaveDate must be a valid date");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        errors.push("Cannot mark leave for past dates");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateBulkLeave = (data) => {
  const errors = [];

  // fromDate — required
  if (!data.fromDate) {
    errors.push("fromDate is required");
  } else {
    const fromDate = new Date(data.fromDate);
    if (isNaN(fromDate.getTime())) {
      errors.push("fromDate must be a valid date");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (fromDate < today) {
        errors.push("fromDate cannot be in the past");
      }
    }
  }

  // toDate — required
  if (!data.toDate) {
    errors.push("toDate is required");
  } else {
    const toDate = new Date(data.toDate);
    if (isNaN(toDate.getTime())) {
      errors.push("toDate must be a valid date");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (toDate < today) {
        errors.push("toDate cannot be in the past");
      }
    }
  }

  // Validate fromDate <= toDate
  if (data.fromDate && data.toDate) {
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);
    if (fromDate > toDate) {
      errors.push("fromDate must be <= toDate");
    } else {
      // Check max 30 days
      const daysDiff = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 30) {
        errors.push("Bulk leave cannot exceed 30 days");
      }
    }
  }

  // reason — optional
  if (data.reason && typeof data.reason !== "string") {
    errors.push("reason must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateListDoctors = (query) => {
  const errors = [];

  // isActive — optional, must be boolean
  if (query.isActive !== undefined) {
    if (query.isActive !== "true" && query.isActive !== "false") {
      errors.push("isActive must be 'true' or 'false'");
    }
  }

  // specialization — optional, string
  if (query.specialization && typeof query.specialization !== "string") {
    errors.push("specialization must be a string");
  }

  // department — optional, string
  if (query.department && typeof query.department !== "string") {
    errors.push("department must be a string");
  }

  // q — optional, string
  if (query.q && typeof query.q !== "string") {
    errors.push("q must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateSchedule,
  validateLeaveDate,
  validateBulkLeave,
  validateListDoctors,
};
