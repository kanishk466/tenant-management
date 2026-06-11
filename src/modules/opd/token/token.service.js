// Token Service — Queue management
const prisma = require("../../../config/prisma");
const visitService = require("../visit/visit.service");
const { isValidQueueTransition } = require("./token.validation");

class TokenService {
  /**
   * Get full queue for a doctor on a specific date
   */
  async getQueueForDoctor(hospitalId, doctorId, date = null) {
    try {
      // Default to today
      const queryDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(
        queryDate.getFullYear(),
        queryDate.getMonth(),
        queryDate.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get doctor
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          hospitalId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          specialization: true,
        },
      });

      if (!doctor) {
        const error = new Error("Doctor not found or inactive");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
      }

      // Get all tokens for this doctor on this date
      const tokens = await prisma.token.findMany({
        where: {
          hospitalId,
          doctorId,
          tokenDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        select: {
          id: true,
          tokenNumber: true,
          status: true,
          calledAt: true,
          consultationStart: true,
          consultationEnd: true,
          visitId: true,
          visit: {
            select: {
              id: true,
              isEmergency: true,
              chiefComplaint: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  age: true,
                  gender: true,
                  knownAllergies: true,
                },
              },
              vitals: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: [
          { visit: { isEmergency: "desc" } }, // Emergency first
          { status: "desc" }, // CALLED > IN_CONSULTATION > WAITING > ...
          { tokenNumber: "asc" }, // Then by token number
        ],
      });

      // Build queue response
      const summary = {
        total: tokens.length,
        waiting: 0,
        inConsultation: 0,
        done: 0,
        skipped: 0,
      };

      let currentToken = null;
      const queue = [];

      tokens.forEach((token) => {
        // Count by status
        if (token.status === "WAITING") summary.waiting++;
        else if (token.status === "IN_CONSULTATION") summary.inConsultation++;
        else if (token.status === "DONE") summary.done++;
        else if (token.status === "SKIPPED") summary.skipped++;

        // Current token (IN_CONSULTATION)
        if (token.status === "IN_CONSULTATION") {
          currentToken = {
            tokenNumber: token.tokenNumber,
            patientName: `${token.visit.patient.firstName} ${token.visit.patient.lastName || ""}`.trim(),
            status: token.status,
            consultationStart: token.consultationStart,
            visitId: token.visitId,
          };
          return;
        }

        // Queue (WAITING, CALLED, DONE, SKIPPED)
        if (token.status !== "CALLED" && token.status !== "WAITING") {
          return; // Skip DONE/SKIPPED for main queue
        }

        // Calculate wait time
        let waitMinutes = 0;
        if (token.calledAt) {
          waitMinutes = Math.floor(
            (new Date() - new Date(token.calledAt)) / 60000
          );
        }

        queue.push({
          tokenNumber: token.tokenNumber,
          visitId: token.visitId,
          patientId: token.visit.patient.id,
          patientName: `${token.visit.patient.firstName} ${token.visit.patient.lastName || ""}`.trim(),
          age: token.visit.patient.age,
          gender: token.visit.patient.gender,
          visitType: token.visit.visitType || "OPD",
          status: token.status,
          vitalsRecorded: !!token.visit.vitals,
          waitMinutes,
          chiefComplaint: token.visit.chiefComplaint || "",
          knownAllergies: token.visit.patient.knownAllergies,
          isEmergency: token.visit.isEmergency,
        });
      });

      return {
        doctor,
        date: queryDate.toISOString().split("T")[0],
        summary,
        currentToken,
        queue,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Call next patient (WAITING → CALLED)
   */
  async callToken(hospitalId, tokenId, doctorId) {
    try {
      // Get token
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          hospitalId,
          doctorId,
        },
      });

      if (!token) {
        const error = new Error("Token not found");
        error.code = "TOKEN_NOT_FOUND";
        throw error;
      }

      // Rule 1: Check no other token IN_CONSULTATION for this doctor
      const inConsultation = await prisma.token.findFirst({
        where: {
          hospitalId,
          doctorId,
          status: "IN_CONSULTATION",
          id: { not: tokenId },
        },
      });

      if (inConsultation) {
        const error = new Error(
          "Another patient is already in consultation with this doctor"
        );
        error.code = "ANOTHER_TOKEN_IN_CONSULTATION";
        throw error;
      }

      // Rule 2: Token must be WAITING
      if (token.status !== "WAITING") {
        const error = new Error(
          `Token must be WAITING status to call. Current status: ${token.status}`
        );
        error.code = "INVALID_TOKEN_STATUS";
        throw error;
      }

      // Update token: WAITING → CALLED
      const updated = await prisma.token.update({
        where: { id: tokenId },
        data: {
          status: "CALLED",
          calledAt: new Date(),
        },
        select: {
          id: true,
          tokenNumber: true,
          status: true,
          calledAt: true,
          visitId: true,
          visit: {
            select: {
              id: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  age: true,
                  gender: true,
                  bloodGroup: true,
                  knownAllergies: true,
                  chronicConditions: true,
                },
              },
            },
          },
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start consultation (CALLED → IN_CONSULTATION)
   */
  async startConsultation(hospitalId, tokenId, doctorId) {
    try {
      // Get token
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          hospitalId,
          doctorId,
        },
      });

      if (!token) {
        const error = new Error("Token not found");
        error.code = "TOKEN_NOT_FOUND";
        throw error;
      }

      // Token must be CALLED
      if (token.status !== "CALLED") {
        const error = new Error(
          `Token must be CALLED to start consultation. Current status: ${token.status}`
        );
        error.code = "INVALID_TOKEN_STATUS";
        throw error;
      }

      // Transaction: Update token + visit
      const result = await prisma.$transaction(async (tx) => {
        // Update token
        const updatedToken = await tx.token.update({
          where: { id: tokenId },
          data: {
            status: "IN_CONSULTATION",
            consultationStart: new Date(),
          },
          select: {
            id: true,
            tokenNumber: true,
            status: true,
            consultationStart: true,
            visitId: true,
          },
        });

        // Update visit status
        await tx.visit.update({
          where: { id: token.visitId },
          data: {
            status: "IN_CONSULTATION",
          },
        });

        return updatedToken;
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete consultation (IN_CONSULTATION → DONE)
   */
  async completeConsultation(hospitalId, tokenId, doctorId) {
    try {
      // Get token
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          hospitalId,
          doctorId,
        },
      });

      if (!token) {
        const error = new Error("Token not found");
        error.code = "TOKEN_NOT_FOUND";
        throw error;
      }

      // Token must be IN_CONSULTATION
      if (token.status !== "IN_CONSULTATION") {
        const error = new Error(
          `Token must be IN_CONSULTATION to complete. Current status: ${token.status}`
        );
        error.code = "INVALID_TOKEN_STATUS";
        throw error;
      }

      const consultationEnd = new Date();
      const consultationStart = token.consultationStart
        ? new Date(token.consultationStart)
        : new Date();
      const waitMinutes = Math.floor(
        (consultationEnd - consultationStart) / 60000
      );

      // Transaction: Update token + visit
      const result = await prisma.$transaction(async (tx) => {
        // Update token
        const updatedToken = await tx.token.update({
          where: { id: tokenId },
          data: {
            status: "DONE",
            consultationEnd,
            waitMinutes, // Store consultation duration
          },
          select: {
            id: true,
            tokenNumber: true,
            status: true,
            consultationEnd: true,
            waitMinutes: true,
            visitId: true,
          },
        });

        // Update visit status
        await tx.visit.update({
          where: { id: token.visitId },
          data: {
            status: "CONSULTATION_DONE",
          },
        });

        return updatedToken;
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Skip token (WAITING/CALLED → SKIPPED)
   */
  async skipToken(hospitalId, tokenId, skipReason = null) {
    try {
      // Get token
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          hospitalId,
        },
      });

      if (!token) {
        const error = new Error("Token not found");
        error.code = "TOKEN_NOT_FOUND";
        throw error;
      }

      // Token must be WAITING or CALLED
      if (!["WAITING", "CALLED"].includes(token.status)) {
        const error = new Error(
          `Token can only be skipped from WAITING or CALLED status. Current status: ${token.status}`
        );
        error.code = "INVALID_TOKEN_STATUS";
        throw error;
      }

      // Update token
      const updated = await prisma.token.update({
        where: { id: tokenId },
        data: {
          status: "SKIPPED",
        },
        select: {
          id: true,
          tokenNumber: true,
          status: true,
          visitId: true,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Requeue token (SKIPPED → WAITING with new token number)
   */
  async requeueToken(hospitalId, tokenId, doctorId) {
    try {
      // Get token
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          hospitalId,
        },
      });

      if (!token) {
        const error = new Error("Token not found");
        error.code = "TOKEN_NOT_FOUND";
        throw error;
      }

      // Token must be SKIPPED
      if (token.status !== "SKIPPED") {
        const error = new Error(
          `Token must be SKIPPED to requeue. Current status: ${token.status}`
        );
        error.code = "INVALID_TOKEN_STATUS";
        throw error;
      }

      // Get today's date
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get highest token number for this doctor today (for requeue)
      const lastToken = await prisma.$queryRaw`
        SELECT "tokenNumber"
        FROM "hospital"."tokens"
        WHERE "hospitalId" = ${hospitalId}
          AND "doctorId" = ${doctorId}
          AND "tokenDate" >= ${startOfDay}
          AND "tokenDate" < ${endOfDay}
        ORDER BY "tokenNumber" DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      let newTokenNumber = 1;
      if (lastToken && lastToken.length > 0) {
        newTokenNumber = lastToken[0].tokenNumber + 1;
      }

      // Update token: SKIPPED → WAITING with new token number
      const updated = await prisma.token.update({
        where: { id: tokenId },
        data: {
          status: "WAITING",
          tokenNumber: newTokenNumber,
        },
        select: {
          id: true,
          tokenNumber: true,
          status: true,
          visitId: true,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get display board info (public/no-auth)
   * Shows currently calling + recently called tokens
   */
  async getDisplayBoard(hospitalId, doctorId = null) {
    try {
      // Get today's date
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Build where clause
      const where = {
        hospitalId,
        tokenDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      };

      if (doctorId) {
        where.doctorId = doctorId;
      }

      // Get tokens (IN_CONSULTATION + recently CALLED)
      const tokens = await prisma.token.findMany({
        where,
        select: {
          id: true,
          tokenNumber: true,
          status: true,
          doctor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { status: "desc" }, // IN_CONSULTATION first
          { calledAt: "desc" }, // Then by called time
        ],
        take: 20, // Get last 20
      });

      // Separate current + recently called
      const nowCalling = [];
      const recentlyCalled = [];

      tokens.forEach((token) => {
        if (token.status === "IN_CONSULTATION") {
          nowCalling.push({
            tokenNumber: token.tokenNumber,
            doctorName: token.doctor.name,
            counter: `Room ${token.doctor.id.substring(0, 2)}`, // Placeholder
          });
        } else if (token.status === "CALLED") {
          recentlyCalled.push({
            tokenNumber: token.tokenNumber,
            doctorName: token.doctor.name,
          });
        }
      });

      return {
        now_calling: nowCalling,
        recently_called: recentlyCalled,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TokenService();
