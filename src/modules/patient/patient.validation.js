// Validation rules for Patient module

const validatePhone = (phone) => {
  // Indian mobile — 10 digits starting with 6-9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePincode = (pincode) => {
  // 6 digit pincode
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode);
};

const validateCreatePatient = (data) => {
  const errors = [];

  // firstName — required, 2-100 chars
  if (!data.firstName) {
    errors.push("firstName is required");
  } else if (data.firstName.length < 2 || data.firstName.length > 100) {
    errors.push("firstName must be between 2 and 100 characters");
  }

  // phone — required, valid Indian mobile
  if (!data.phone) {
    errors.push("phone is required");
  } else if (!validatePhone(data.phone)) {
    errors.push("phone must be a valid 10-digit Indian mobile number");
  }

  // gender — required, enum
  if (!data.gender) {
    errors.push("gender is required");
  } else if (!["MALE", "FEMALE", "OTHER"].includes(data.gender)) {
    errors.push("gender must be MALE, FEMALE, or OTHER");
  }

  // age — optional but if provided, must be 0-150
  if (data.age !== undefined && data.age !== null) {
    if (typeof data.age !== "number" || data.age < 0 || data.age > 150 || !Number.isInteger(data.age)) {
      errors.push("age must be an integer between 0 and 150");
    }
  }

  // ageUnit — optional but if provided, must be valid
  if (data.ageUnit && !["years", "months", "days"].includes(data.ageUnit)) {
    errors.push("ageUnit must be years, months, or days");
  }

  // email — optional but if provided, must be valid
  if (data.email && !validateEmail(data.email)) {
    errors.push("email must be a valid email address");
  }

  // pincode — optional but if provided, must be 6 digits
  if (data.pincode && !validatePincode(data.pincode)) {
    errors.push("pincode must be a 6-digit number");
  }

  // bloodGroup — optional but if provided, must be valid
  if (data.bloodGroup) {
    const validBloodGroups = ["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG", "UNKNOWN"];
    if (!validBloodGroups.includes(data.bloodGroup)) {
      errors.push("bloodGroup must be a valid blood group");
    }
  }

  // dateOfBirth — optional but if provided, must be valid date
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push("dateOfBirth must be a valid date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdatePatient = (data) => {
  const errors = [];

  // firstName — if provided, 2-100 chars
  if (data.firstName && (data.firstName.length < 2 || data.firstName.length > 100)) {
    errors.push("firstName must be between 2 and 100 characters");
  }

  // phone — if provided, must be valid
  if (data.phone && !validatePhone(data.phone)) {
    errors.push("phone must be a valid 10-digit Indian mobile number");
  }

  // gender — if provided, must be enum
  if (data.gender && !["MALE", "FEMALE", "OTHER"].includes(data.gender)) {
    errors.push("gender must be MALE, FEMALE, or OTHER");
  }

  // age — if provided, must be 0-150
  if (data.age !== undefined && data.age !== null) {
    if (typeof data.age !== "number" || data.age < 0 || data.age > 150 || !Number.isInteger(data.age)) {
      errors.push("age must be an integer between 0 and 150");
    }
  }

  // ageUnit — if provided, must be valid
  if (data.ageUnit && !["years", "months", "days"].includes(data.ageUnit)) {
    errors.push("ageUnit must be years, months, or days");
  }

  // email — if provided, must be valid
  if (data.email && !validateEmail(data.email)) {
    errors.push("email must be a valid email address");
  }

  // pincode — if provided, must be 6 digits
  if (data.pincode && !validatePincode(data.pincode)) {
    errors.push("pincode must be a 6-digit number");
  }

  // bloodGroup — if provided, must be valid
  if (data.bloodGroup) {
    const validBloodGroups = ["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG", "UNKNOWN"];
    if (!validBloodGroups.includes(data.bloodGroup)) {
      errors.push("bloodGroup must be a valid blood group");
    }
  }

  // dateOfBirth — if provided, must be valid date
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push("dateOfBirth must be a valid date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateCheckDuplicate = (data) => {
  const errors = [];

  if (!data.phone) {
    errors.push("phone is required");
  } else if (!validatePhone(data.phone)) {
    errors.push("phone must be a valid 10-digit Indian mobile number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreatePatient,
  validateUpdatePatient,
  validateCheckDuplicate,
  validatePhone,
  validateEmail,
  validatePincode,
};
