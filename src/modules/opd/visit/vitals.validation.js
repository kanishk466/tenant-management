// Vitals Validation — Phase 3A

const validateRecordVitals = (data) => {
  const errors = [];

  // bpSystolic — optional, 60-300
  if (data.bpSystolic !== undefined && data.bpSystolic !== null) {
    if (typeof data.bpSystolic !== "number" || data.bpSystolic < 60 || data.bpSystolic > 300) {
      errors.push("bpSystolic must be between 60 and 300");
    }
  }

  // bpDiastolic — optional, 40-200
  if (data.bpDiastolic !== undefined && data.bpDiastolic !== null) {
    if (typeof data.bpDiastolic !== "number" || data.bpDiastolic < 40 || data.bpDiastolic > 200) {
      errors.push("bpDiastolic must be between 40 and 200");
    }
  }

  // pulseRate — optional, 20-300
  if (data.pulseRate !== undefined && data.pulseRate !== null) {
    if (typeof data.pulseRate !== "number" || data.pulseRate < 20 || data.pulseRate > 300) {
      errors.push("pulseRate must be between 20 and 300");
    }
  }

  // temperature — optional, range depends on unit
  if (data.temperature !== undefined && data.temperature !== null) {
    const temp = parseFloat(data.temperature);
    if (isNaN(temp)) {
      errors.push("temperature must be a valid number");
    } else {
      const tempUnit = data.temperatureUnit || "F";
      if (tempUnit === "F" && (temp < 95 || temp > 110)) {
        errors.push("temperature (F) must be between 95 and 110");
      } else if (tempUnit === "C" && (temp < 35 || temp > 43)) {
        errors.push("temperature (C) must be between 35 and 43");
      }
    }
  }

  // temperatureUnit — optional, F or C
  if (data.temperatureUnit && !["F", "C"].includes(data.temperatureUnit)) {
    errors.push("temperatureUnit must be 'F' or 'C'");
  }

  // spo2 — optional, 50-100
  if (data.spo2 !== undefined && data.spo2 !== null) {
    if (typeof data.spo2 !== "number" || data.spo2 < 50 || data.spo2 > 100) {
      errors.push("spo2 must be between 50 and 100");
    }
  }

  // weight — optional, 1-500 kg
  if (data.weight !== undefined && data.weight !== null) {
    const weight = parseFloat(data.weight);
    if (isNaN(weight) || weight < 1 || weight > 500) {
      errors.push("weight must be between 1 and 500 kg");
    }
  }

  // height — optional, 10-250 cm
  if (data.height !== undefined && data.height !== null) {
    const height = parseFloat(data.height);
    if (isNaN(height) || height < 10 || height > 250) {
      errors.push("height must be between 10 and 250 cm");
    }
  }

  // bloodSugar — optional, 20-800
  if (data.bloodSugar !== undefined && data.bloodSugar !== null) {
    const bs = parseFloat(data.bloodSugar);
    if (isNaN(bs) || bs < 20 || bs > 800) {
      errors.push("bloodSugar must be between 20 and 800");
    }
  }

  // bloodSugarType — optional, fasting|pp|random
  if (data.bloodSugarType) {
    if (!["fasting", "pp", "random"].includes(data.bloodSugarType)) {
      errors.push("bloodSugarType must be 'fasting', 'pp', or 'random'");
    }
  }

  // respiratoryRate — optional
  if (data.respiratoryRate !== undefined && data.respiratoryRate !== null) {
    if (typeof data.respiratoryRate !== "number" || data.respiratoryRate < 4 || data.respiratoryRate > 100) {
      errors.push("respiratoryRate must be a valid number");
    }
  }

  // nurseNotes — optional, string
  if (data.nurseNotes && typeof data.nurseNotes !== "string") {
    errors.push("nurseNotes must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateRecordVitals,
};
