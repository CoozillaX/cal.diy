-- CreateTable
CREATE TABLE "public"."TeamPermissionSetting" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "minimumRole" "public"."MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamPermissionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamPermissionSetting_teamId_idx" ON "public"."TeamPermissionSetting"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPermissionSetting_teamId_permissionKey_key" ON "public"."TeamPermissionSetting"("teamId", "permissionKey");

-- AddForeignKey
ALTER TABLE "public"."TeamPermissionSetting" ADD CONSTRAINT "TeamPermissionSetting_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
