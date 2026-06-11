// Vitals Service — Phase 3A

const prisma = require("../../../config/prisma");

class VitalsService {
  /**
   * Record vitals for a visit
   * Upsert logic — if vitals exist, update; otherwise create
   */
  async recordVitals(hospitalId, visitId, vitalData, nurseUserId) {
    try {
      // Step 1: Verify visit exists and belongs to hospital
      const visit = await prisma.visit.findFirst({
        where: {
          id: visitId,
          hospitalId,
        },
        select: {
          id: true,
          patientId: true,
          status: true,
          visitDate: true,
        },
      });

      if (!visit) {
        const error = new Error("Visit not found");
        error.code = "VISIT_NOT_FOUND";
        throw error;
      }

      // Step 2: Check visit status — must be WAITING or VITALS_DONE
      if (!["WAITING", "VITALS_DONE"].includes(visit.status)) {
        const error = new Error(
          `Cannot record vitals for visit in ${visit.status} status. Allowed statuses: WAITING, VITALS_DONE`
        );
        error.code = "VITALS_NOT_ALLOWED";
        throw error;
      }

      // Step 3: Calculate BMI if both weight and height provided
      let bmi = null;
      if (vitalData.weight !== undefined && vitalData.height !== undefined) {
        const weight = parseFloat(vitalData.weight);
        const heightCm = parseFloat(vitalData.height);
        const heightM = heightCm / 100;
        if (weight > 0 && heightM > 0) {
          bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
        }
      }

      // Step 4: Upsert vitals record
      const vitals = await prisma.vitals.upsert({
        where: { visitId },
        create: {
          hospitalId,
          visitId,
          patientId: visit.patientId,
          recordedBy: nurseUserId || null,
          bpSystolic: vitalData.bpSystolic || null,
          bpDiastolic: vitalData.bpDiastolic || null,
          pulseRate: vitalData.pulseRate || null,
          temperature: vitalData.temperature ? parseFloat(vitalData.temperature) : null,
          temperatureUnit: vitalData.temperatureUnit || "F",
          spo2: vitalData.spo2 || null,
          weight: vitalData.weight ? parseFloat(vitalData.weight) : null,
          height: vitalData.height ? parseFloat(vitalData.height) : null,
          bmi,
          bloodSugar: vitalData.bloodSugar ? parseFloat(vitalData.bloodSugar) : null,
          bloodSugarType: vitalData.bloodSugarType || null,
          respiratoryRate: vitalData.respiratoryRate || null,
          nurseNotes: vitalData.nurseNotes || null,
        },
        update: {
          recordedBy: nurseUserId || null,
          bpSystolic: vitalData.bpSystolic !== undefined ? vitalData.bpSystolic : undefined,
          bpDiastolic: vitalData.bpDiastolic !== undefined ? vitalData.bpDiastolic : undefined,
          pulseRate: vitalData.pulseRate !== undefined ? vitalData.pulseRate : undefined,
          temperature: vitalData.temperature !== undefined ? parseFloat(vitalData.temperature) : undefined,
          temperatureUnit: vitalData.temperatureUnit || "F",
          spo2: vitalData.spo2 !== undefined ? vitalData.spo2 : undefined,
          weight: vitalData.weight !== undefined ? parseFloat(vitalData.weight) : undefined,
          height: vitalData.height !== undefined ? parseFloat(vitalData.height) : undefined,
          bmi,
          bloodSugar: vitalData.bloodSugar !== undefined ? parseFloat(vitalData.bloodSugar) : undefined,
          bloodSugarType: vitalData.bloodSugarType || undefined,
          respiratoryRate: vitalData.respiratoryRate !== undefined ? vitalData.respiratoryRate : undefined,
          nurseNotes: vitalData.nurseNotes !== undefined ? vitalData.nurseNotes : undefined,
          recordedAt: new Date(),
        },
      });

      // Step 5: Update visit status to VITALS_DONE (if not already)
      if (visit.status !== "VITALS_DONE") {
        await prisma.visit.update({
          where: { id: visitId },
          data: { status: "VITALS_DONE" },
        });
      }

      // Step 6: Fetch patient allergies and chronic conditions
      const patient = await prisma.patient.findUnique({
        where: { id: visit.patientId },
        select: {
          knownAllergies: true,
          chronicConditions: true,
        },
      });

      // Step 7: Format response
      const response = {
        vitals: {
          id: vitals.id,
          bpSystolic: vitals.bpSystolic,
          bpDiastolic: vitals.bpDiastolic,
          pulseRate: vitals.pulseRate,
          temperature: vitals.temperature,
          temperatureUnit: vitals.temperatureUnit,
          spo2: vitals.spo2,
          weight: vitals.weight,
          height: vitals.height,
          bmi: vitals.bmi,
          bloodSugar: vitals.bloodSugar,
          bloodSugarType: vitals.bloodSugarType,
          respiratoryRate: vitals.respiratoryRate,
          nurseNotes: vitals.nurseNotes,
          recordedAt: vitals.recordedAt,
        },
        visitStatus: "VITALS_DONE",
        patientAlerts: {
          allergies: patient?.knownAllergies || [],
          chronicConditions: patient?.chronicConditions || [],
        },
      };

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vitals for current visit + history (last 3 visits)
   */
  async getVitalsWithHistory(hospitalId, visitId) {
    try {
      // Step 1: Get current visit vitals
      const currentVitals = await prisma.vitals.findUnique({
        where: { visitId },
        select: {
          id: true,
          bpSystolic: true,
          bpDiastolic: true,
          pulseRate: true,
          temperature: true,
          temperatureUnit: true,
          spo2: true,
          weight: true,
          height: true,
          bmi: true,
          bloodSugar: true,
          bloodSugarType: true,
          respiratoryRate: true,
          nurseNotes: true,
          recordedAt: true,
          visit: {
            select: {
              patientId: true,
            },
          },
        },
      });

      if (!currentVitals) {
        const error = new Error("Vitals not found for this visit");
        error.code = "VITALS_NOT_FOUND";
        throw error;
      }

      // Step 2: Get last 3 previous visits vitals for this patient
      const patientId = currentVitals.visit.patientId;

      const previousVisitsVitals = await prisma.vitals.findMany({
        where: {
          patientId,
          visit: {
            hospitalId,
            id: { not: visitId },
          },
        },
        select: {
          bpSystolic: true,
          bpDiastolic: true,
          weight: true,
          height: true,
          bmi: true,
          recordedAt: true,
          visit: {
            select: {
              visitDate: true,
            },
          },
        },
        orderBy: {
          recordedAt: "desc",
        },
        take: 3,
      });

      // Step 3: Format history
      const history = previousVisitsVitals.map((v) => ({
        visitDate: v.visit.visitDate,
        bp:
          v.bpSystolic && v.bpDiastolic
            ? `${v.bpSystolic}/${v.bpDiastolic}`
            : "N/A",
        weight: v.weight || null,
        height: v.height || null,
        bmi: v.bmi || null,
        recordedAt: v.recordedAt,
      }));

      return {
        current: {
          id: currentVitals.id,
          bpSystolic: currentVitals.bpSystolic,
          bpDiastolic: currentVitals.bpDiastolic,
          pulseRate: currentVitals.pulseRate,
          temperature: currentVitals.temperature,
          temperatureUnit: currentVitals.temperatureUnit,
          spo2: currentVitals.spo2,
          weight: currentVitals.weight,
          height: currentVitals.height,
          bmi: currentVitals.bmi,
          bloodSugar: currentVitals.bloodSugar,
          bloodSugarType: currentVitals.bloodSugarType,
          respiratoryRate: currentVitals.respiratoryRate,
          nurseNotes: currentVitals.nurseNotes,
          recordedAt: currentVitals.recordedAt,
        },
        history,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new VitalsService();
