-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hospital";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateEnum
CREATE TYPE "platform"."PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT_ADMIN');

-- CreateEnum
CREATE TYPE "platform"."HospitalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "platform"."DeploymentMode" AS ENUM ('SAAS', 'HYBRID', 'ON_PREMISE');

-- CreateEnum
CREATE TYPE "platform"."ComponentType" AS ENUM ('MODULE', 'SUB_MODULE', 'FEATURE');

-- CreateEnum
CREATE TYPE "platform"."PackageAssignmentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hospital"."UserRole" AS ENUM ('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'BILLING_STAFF');

-- CreateEnum
CREATE TYPE "hospital"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "hospital"."BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "hospital"."VisitType" AS ENUM ('OPD', 'FOLLOW_UP', 'EMERGENCY', 'WALKIN', 'REVIEW');

-- CreateEnum
CREATE TYPE "hospital"."VisitStatus" AS ENUM ('REGISTERED', 'WAITING', 'VITALS_DONE', 'IN_CONSULTATION', 'CONSULTATION_DONE', 'BILLING_PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hospital"."TokenStatus" AS ENUM ('WAITING', 'CALLED', 'IN_CONSULTATION', 'DONE', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hospital"."AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "hospital"."AppointmentSource" AS ENUM ('COUNTER', 'ONLINE', 'PHONE', 'WALKIN');

-- CreateEnum
CREATE TYPE "hospital"."BillStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'WAIVED', 'CREDIT');

-- CreateEnum
CREATE TYPE "hospital"."PaymentMode" AS ENUM ('CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE', 'NEFT', 'INSURANCE');

-- CreateEnum
CREATE TYPE "hospital"."LabOrderStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "platform"."platform_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "platform"."PlatformRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."refresh_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."hospitals" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "panNumber" TEXT,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "deploymentMode" "platform"."DeploymentMode" NOT NULL DEFAULT 'SAAS',
    "licenseKey" TEXT,
    "status" "platform"."HospitalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."system_components" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "platform"."ComponentType" NOT NULL,
    "iconName" TEXT,
    "route" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(10,2),
    "yearlyPrice" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."package_components" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."package_limits" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "limitKey" TEXT NOT NULL,
    "limitValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."assigned_packages" (
    "id" SERIAL NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "packageId" INTEGER NOT NULL,
    "status" "platform"."PackageAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "assignedBy" INTEGER,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assigned_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."hospital_users" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "hospital"."UserRole" NOT NULL,
    "department" TEXT,
    "signatureUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."doctors" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialization" TEXT,
    "qualification" TEXT,
    "registrationNo" TEXT,
    "department" TEXT,
    "consultationFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "followUpFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "signatureUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."doctor_schedules" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMin" INTEGER NOT NULL DEFAULT 15,
    "maxPatients" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."doctor_leaves" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "doctorId" TEXT NOT NULL,
    "leaveDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."patients" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "uhid" TEXT NOT NULL,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "dateOfBirth" DATE,
    "age" INTEGER,
    "ageUnit" TEXT NOT NULL DEFAULT 'years',
    "gender" "hospital"."Gender" NOT NULL,
    "bloodGroup" "hospital"."BloodGroup" NOT NULL DEFAULT 'UNKNOWN',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "occupation" TEXT,
    "maritalStatus" TEXT,
    "abhaId" TEXT,
    "aadhaarLast4" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "knownAllergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referredBy" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."visits" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "visitNumber" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "visitTime" TIME,
    "visitType" "hospital"."VisitType" NOT NULL,
    "status" "hospital"."VisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isMlc" BOOLEAN NOT NULL DEFAULT false,
    "mlcNumber" TEXT,
    "chiefComplaint" TEXT,
    "referredBy" TEXT,
    "referredTo" TEXT,
    "registrationComplete" BOOLEAN NOT NULL DEFAULT true,
    "registeredBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."tokens" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "tokenDate" DATE NOT NULL,
    "status" "hospital"."TokenStatus" NOT NULL DEFAULT 'WAITING',
    "calledAt" TIMESTAMP(3),
    "consultationStart" TIMESTAMP(3),
    "consultationEnd" TIMESTAMP(3),
    "waitMinutes" INTEGER,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."vitals" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedBy" TEXT,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseRate" INTEGER,
    "temperature" DECIMAL(4,1),
    "temperatureUnit" TEXT NOT NULL DEFAULT 'F',
    "spo2" INTEGER,
    "weight" DECIMAL(5,2),
    "height" DECIMAL(5,2),
    "bmi" DECIMAL(4,1),
    "bloodSugar" DECIMAL(6,2),
    "bloodSugarType" TEXT,
    "respiratoryRate" INTEGER,
    "nurseNotes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."appointments" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentDate" DATE NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "slotDurationMin" INTEGER NOT NULL DEFAULT 15,
    "visitType" "hospital"."VisitType" NOT NULL DEFAULT 'OPD',
    "reason" TEXT,
    "source" "hospital"."AppointmentSource" NOT NULL DEFAULT 'COUNTER',
    "status" "hospital"."AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "confirmedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "visitId" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "bookedBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."emr_records" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "diagnoses" JSONB NOT NULL DEFAULT '[]',
    "plan" TEXT,
    "doctorNotes" TEXT,
    "advice" TEXT,
    "dietInstructions" TEXT,
    "followUpDays" INTEGER,
    "followUpReason" TEXT,
    "referralNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."prescriptions" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "prescriptionNo" TEXT NOT NULL,
    "drugs" JSONB NOT NULL,
    "specialInstructions" TEXT,
    "pdfUrl" TEXT,
    "whatsappSentAt" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "pharmacyType" TEXT NOT NULL DEFAULT 'inhouse',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."lab_orders" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "tests" JSONB NOT NULL,
    "orderType" TEXT NOT NULL DEFAULT 'inhouse',
    "externalLabName" TEXT,
    "requisitionPdfUrl" TEXT,
    "status" "hospital"."LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "resultPdfUrl" TEXT,
    "resultData" JSONB,
    "resultUploadedAt" TIMESTAMP(3),
    "resultUploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."patient_documents" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "docType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceHospital" TEXT,
    "reportDate" DATE,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."bills" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" DATE NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "outstanding" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "hospital"."BillStatus" NOT NULL DEFAULT 'PENDING',
    "billingType" TEXT NOT NULL DEFAULT 'cash',
    "tpaName" TEXT,
    "tpaClaimNo" TEXT,
    "billPdfUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."bill_line_items" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "billId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "unitRate" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "hsnSacCode" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."payments" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "billId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMode" "hospital"."PaymentMode" NOT NULL,
    "paymentReference" TEXT,
    "paymentDate" DATE NOT NULL,
    "collectedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."pharmacy_inventory" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "drugName" TEXT NOT NULL,
    "genericName" TEXT,
    "strength" TEXT,
    "form" TEXT,
    "batchNo" TEXT,
    "expiryDate" DATE,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 10,
    "unitPrice" DECIMAL(8,2) NOT NULL,
    "mrp" DECIMAL(8,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."dispensing_records" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dispensedBy" TEXT,
    "drugsDispensed" JSONB NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "pharmacyType" TEXT NOT NULL DEFAULT 'inhouse',
    "externalPharmacyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dispensedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."notification_logs" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "patientId" TEXT,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "phone" TEXT,
    "messageBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital"."audit_logs" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform"."platform_users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "platform"."refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_code_key" ON "platform"."hospitals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_subdomain_key" ON "platform"."hospitals"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_email_key" ON "platform"."hospitals"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_licenseKey_key" ON "platform"."hospitals"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "system_components_code_key" ON "platform"."system_components"("code");

-- CreateIndex
CREATE UNIQUE INDEX "packages_name_key" ON "platform"."packages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "package_components_packageId_componentId_key" ON "platform"."package_components"("packageId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "package_limits_packageId_limitKey_key" ON "platform"."package_limits"("packageId", "limitKey");

-- CreateIndex
CREATE INDEX "assigned_packages_hospitalId_idx" ON "platform"."assigned_packages"("hospitalId");

-- CreateIndex
CREATE INDEX "assigned_packages_packageId_idx" ON "platform"."assigned_packages"("packageId");

-- CreateIndex
CREATE INDEX "assigned_packages_hospitalId_status_idx" ON "platform"."assigned_packages"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "hospital_users_hospitalId_role_idx" ON "hospital"."hospital_users"("hospitalId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_hospitalId_email_key" ON "hospital"."hospital_users"("hospitalId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_userId_key" ON "hospital"."doctors"("userId");

-- CreateIndex
CREATE INDEX "doctors_hospitalId_idx" ON "hospital"."doctors"("hospitalId");

-- CreateIndex
CREATE INDEX "doctor_schedules_doctorId_dayOfWeek_idx" ON "hospital"."doctor_schedules"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "doctor_schedules_hospitalId_doctorId_idx" ON "hospital"."doctor_schedules"("hospitalId", "doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_leaves_doctorId_leaveDate_key" ON "hospital"."doctor_leaves"("doctorId", "leaveDate");

-- CreateIndex
CREATE INDEX "patients_hospitalId_phone_idx" ON "hospital"."patients"("hospitalId", "phone");

-- CreateIndex
CREATE INDEX "patients_hospitalId_deletedAt_idx" ON "hospital"."patients"("hospitalId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hospitalId_uhid_key" ON "hospital"."patients"("hospitalId", "uhid");

-- CreateIndex
CREATE INDEX "visits_hospitalId_visitDate_idx" ON "hospital"."visits"("hospitalId", "visitDate");

-- CreateIndex
CREATE INDEX "visits_hospitalId_patientId_idx" ON "hospital"."visits"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "visits_hospitalId_doctorId_visitDate_idx" ON "hospital"."visits"("hospitalId", "doctorId", "visitDate");

-- CreateIndex
CREATE INDEX "visits_hospitalId_status_idx" ON "hospital"."visits"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "visits_hospitalId_visitNumber_key" ON "hospital"."visits"("hospitalId", "visitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_visitId_key" ON "hospital"."tokens"("visitId");

-- CreateIndex
CREATE INDEX "tokens_hospitalId_doctorId_tokenDate_status_idx" ON "hospital"."tokens"("hospitalId", "doctorId", "tokenDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_hospitalId_doctorId_tokenNumber_tokenDate_key" ON "hospital"."tokens"("hospitalId", "doctorId", "tokenNumber", "tokenDate");

-- CreateIndex
CREATE UNIQUE INDEX "vitals_visitId_key" ON "hospital"."vitals"("visitId");

-- CreateIndex
CREATE INDEX "vitals_hospitalId_patientId_idx" ON "hospital"."vitals"("hospitalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_visitId_key" ON "hospital"."appointments"("visitId");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_doctorId_appointmentDate_idx" ON "hospital"."appointments"("hospitalId", "doctorId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_patientId_idx" ON "hospital"."appointments"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_status_idx" ON "hospital"."appointments"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "emr_records_visitId_key" ON "hospital"."emr_records"("visitId");

-- CreateIndex
CREATE INDEX "emr_records_hospitalId_patientId_idx" ON "hospital"."emr_records"("hospitalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_visitId_key" ON "hospital"."prescriptions"("visitId");

-- CreateIndex
CREATE INDEX "prescriptions_hospitalId_patientId_idx" ON "hospital"."prescriptions"("hospitalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_hospitalId_prescriptionNo_key" ON "hospital"."prescriptions"("hospitalId", "prescriptionNo");

-- CreateIndex
CREATE INDEX "lab_orders_hospitalId_patientId_idx" ON "hospital"."lab_orders"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "lab_orders_hospitalId_status_idx" ON "hospital"."lab_orders"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_hospitalId_orderNo_key" ON "hospital"."lab_orders"("hospitalId", "orderNo");

-- CreateIndex
CREATE INDEX "patient_documents_hospitalId_patientId_idx" ON "hospital"."patient_documents"("hospitalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "bills_visitId_key" ON "hospital"."bills"("visitId");

-- CreateIndex
CREATE INDEX "bills_hospitalId_status_idx" ON "hospital"."bills"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "bills_hospitalId_patientId_idx" ON "hospital"."bills"("hospitalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "bills_hospitalId_billNo_key" ON "hospital"."bills"("hospitalId", "billNo");

-- CreateIndex
CREATE INDEX "bill_line_items_billId_idx" ON "hospital"."bill_line_items"("billId");

-- CreateIndex
CREATE INDEX "payments_billId_idx" ON "hospital"."payments"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_hospitalId_paymentNo_key" ON "hospital"."payments"("hospitalId", "paymentNo");

-- CreateIndex
CREATE INDEX "pharmacy_inventory_hospitalId_idx" ON "hospital"."pharmacy_inventory"("hospitalId");

-- CreateIndex
CREATE INDEX "pharmacy_inventory_hospitalId_expiryDate_idx" ON "hospital"."pharmacy_inventory"("hospitalId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "dispensing_records_prescriptionId_key" ON "hospital"."dispensing_records"("prescriptionId");

-- CreateIndex
CREATE INDEX "dispensing_records_hospitalId_patientId_idx" ON "hospital"."dispensing_records"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "notification_logs_hospitalId_patientId_idx" ON "hospital"."notification_logs"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "notification_logs_hospitalId_status_idx" ON "hospital"."notification_logs"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_hospitalId_resource_resourceId_idx" ON "hospital"."audit_logs"("hospitalId", "resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_hospitalId_userId_createdAt_idx" ON "hospital"."audit_logs"("hospitalId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "platform"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform"."platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."hospitals" ADD CONSTRAINT "hospitals_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "platform"."platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."system_components" ADD CONSTRAINT "system_components_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "platform"."system_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."package_components" ADD CONSTRAINT "package_components_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "platform"."packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."package_components" ADD CONSTRAINT "package_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "platform"."system_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."package_limits" ADD CONSTRAINT "package_limits_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "platform"."packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."assigned_packages" ADD CONSTRAINT "assigned_packages_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "platform"."hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."assigned_packages" ADD CONSTRAINT "assigned_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "platform"."packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."assigned_packages" ADD CONSTRAINT "assigned_packages_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "platform"."platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hospital"."hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "hospital"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."doctor_leaves" ADD CONSTRAINT "doctor_leaves_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "hospital"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."visits" ADD CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "hospital"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."visits" ADD CONSTRAINT "visits_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "hospital"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."visits" ADD CONSTRAINT "visits_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "hospital"."hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."tokens" ADD CONSTRAINT "tokens_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."vitals" ADD CONSTRAINT "vitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."vitals" ADD CONSTRAINT "vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "hospital"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."vitals" ADD CONSTRAINT "vitals_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "hospital"."hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "hospital"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "hospital"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."appointments" ADD CONSTRAINT "appointments_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."appointments" ADD CONSTRAINT "appointments_bookedBy_fkey" FOREIGN KEY ("bookedBy") REFERENCES "hospital"."hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."emr_records" ADD CONSTRAINT "emr_records_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."emr_records" ADD CONSTRAINT "emr_records_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "hospital"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."prescriptions" ADD CONSTRAINT "prescriptions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "hospital"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."lab_orders" ADD CONSTRAINT "lab_orders_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."patient_documents" ADD CONSTRAINT "patient_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "hospital"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."bills" ADD CONSTRAINT "bills_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "hospital"."visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."bills" ADD CONSTRAINT "bills_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "hospital"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."bills" ADD CONSTRAINT "bills_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "hospital"."hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."bill_line_items" ADD CONSTRAINT "bill_line_items_billId_fkey" FOREIGN KEY ("billId") REFERENCES "hospital"."bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."payments" ADD CONSTRAINT "payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "hospital"."bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital"."dispensing_records" ADD CONSTRAINT "dispensing_records_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "hospital"."prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
