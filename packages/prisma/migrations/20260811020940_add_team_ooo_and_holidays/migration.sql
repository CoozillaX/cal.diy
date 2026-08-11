-- CreateTable
CREATE TABLE "public"."TeamOutOfOfficeEntry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "teamId" INTEGER NOT NULL,
    "reasonId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamOutOfOfficeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamHolidaySettings" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "countryCode" TEXT,
    "disabledIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamHolidaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamOutOfOfficeEntry_uuid_key" ON "public"."TeamOutOfOfficeEntry"("uuid");

-- CreateIndex
CREATE INDEX "TeamOutOfOfficeEntry_uuid_idx" ON "public"."TeamOutOfOfficeEntry"("uuid");

-- CreateIndex
CREATE INDEX "TeamOutOfOfficeEntry_teamId_idx" ON "public"."TeamOutOfOfficeEntry"("teamId");

-- CreateIndex
CREATE INDEX "TeamOutOfOfficeEntry_start_end_idx" ON "public"."TeamOutOfOfficeEntry"("start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "TeamHolidaySettings_teamId_key" ON "public"."TeamHolidaySettings"("teamId");

-- AddForeignKey
ALTER TABLE "public"."TeamOutOfOfficeEntry" ADD CONSTRAINT "TeamOutOfOfficeEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamOutOfOfficeEntry" ADD CONSTRAINT "TeamOutOfOfficeEntry_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "public"."OutOfOfficeReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamOutOfOfficeEntry" ADD CONSTRAINT "TeamOutOfOfficeEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamHolidaySettings" ADD CONSTRAINT "TeamHolidaySettings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
