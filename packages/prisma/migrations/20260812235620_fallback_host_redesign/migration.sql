-- The fallback host is now a dedicated, event-type-level pointer rather than a per-host flag -
-- see EventType.fallbackHostUserId below. Host.ignoreTimeConflicts is superseded entirely and
-- dropped (test-only data, no production backfill needed).

-- AlterTable
ALTER TABLE "Host" DROP COLUMN "ignoreTimeConflicts";

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "fallbackHostUserId" INTEGER;

-- CreateIndex
CREATE INDEX "EventType_fallbackHostUserId_idx" ON "EventType"("fallbackHostUserId");

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_fallbackHostUserId_fkey" FOREIGN KEY ("fallbackHostUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
