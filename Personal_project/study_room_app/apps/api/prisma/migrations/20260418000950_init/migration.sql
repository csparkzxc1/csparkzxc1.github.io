-- CreateTable
CREATE TABLE "academy" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "ownerTeacherId" UUID,
    "subscriptionTier" VARCHAR(20) NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "grade" SMALLINT,
    "monthlyFee" INTEGER NOT NULL,
    "siblingGroupId" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "enrolledAt" DATE NOT NULL,
    "withdrawnAt" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "name" VARCHAR(50),
    "phone" VARCHAR(20) NOT NULL,
    "relation" VARCHAR(20),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "notificationOptin" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_room" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(30),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_schedule" (
    "id" UUID NOT NULL,
    "classRoomId" UUID NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,

    CONSTRAINT "class_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "classRoomId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_record" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "classRoomId" UUID,
    "date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "checkInAt" TIMESTAMPTZ,
    "checkOutAt" TIMESTAMPTZ,
    "absenceReason" VARCHAR(30),
    "absenceNote" TEXT,
    "recordedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attendance_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_rule" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "absenceFreeCount" SMALLINT NOT NULL DEFAULT 0,
    "absenceDeductionPerClass" INTEGER NOT NULL DEFAULT 0,
    "siblingDiscountRate" DECIMAL(4,3) NOT NULL DEFAULT 0.000,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "billing_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "periodYear" SMALLINT NOT NULL,
    "periodMonth" SMALLINT NOT NULL,
    "baseFee" INTEGER NOT NULL,
    "absenceDeduction" INTEGER NOT NULL DEFAULT 0,
    "siblingDiscount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'issued',
    "issuedAt" TIMESTAMPTZ NOT NULL,
    "paidAt" TIMESTAMPTZ,
    "paymentMethod" VARCHAR(20),
    "note" TEXT,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_item" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "lineType" VARCHAR(30) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "invoice_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "templateCode" VARCHAR(50) NOT NULL,
    "relatedEntityId" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "payload" JSONB NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "providerMsgId" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL,
    "errorCode" VARCHAR(50),
    "sentAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_phone_key" ON "teacher"("phone");

-- CreateIndex
CREATE INDEX "student_academyId_status_idx" ON "student"("academyId", "status");

-- CreateIndex
CREATE INDEX "student_siblingGroupId_idx" ON "student"("siblingGroupId");

-- CreateIndex
CREATE INDEX "guardian_studentId_isPrimary_idx" ON "guardian"("studentId", "isPrimary");

-- CreateIndex
CREATE INDEX "guardian_phone_idx" ON "guardian"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "class_schedule_classRoomId_dayOfWeek_startTime_key" ON "class_schedule"("classRoomId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "attendance_record_date_classRoomId_idx" ON "attendance_record"("date", "classRoomId");

-- CreateIndex
CREATE INDEX "attendance_record_studentId_date_idx" ON "attendance_record"("studentId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_record_studentId_date_key" ON "attendance_record"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "billing_rule_academyId_key" ON "billing_rule"("academyId");

-- CreateIndex
CREATE INDEX "invoice_periodYear_periodMonth_status_idx" ON "invoice"("periodYear", "periodMonth", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_studentId_periodYear_periodMonth_key" ON "invoice"("studentId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "notification_log_academyId_createdAt_idx" ON "notification_log"("academyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notification_log_status_createdAt_idx" ON "notification_log"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian" ADD CONSTRAINT "guardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_room" ADD CONSTRAINT "class_room_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedule" ADD CONSTRAINT "class_schedule_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "class_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "class_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "class_room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_rule" ADD CONSTRAINT "billing_rule_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
