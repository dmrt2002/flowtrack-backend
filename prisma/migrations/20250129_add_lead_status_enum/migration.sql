-- CreateEnum: Create LeadStatus enum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'EMAIL_SENT', 'EMAIL_OPENED', 'FOLLOW_UP_PENDING', 'FOLLOW_UP_SENT', 'RESPONDED', 'BOOKED', 'WON', 'LOST', 'DISQUALIFIED');

-- AlterTable: Add temporary status column with enum type
ALTER TABLE "leads" ADD COLUMN "status_new" "lead_status" NOT NULL DEFAULT 'NEW';

-- DataMigration: Map existing string statuses to enum values
UPDATE "leads" SET "status_new" =
  CASE
    WHEN UPPER("status") = 'NEW' THEN 'NEW'::"lead_status"
    WHEN UPPER("status") IN ('CONTACTED', 'EMAIL_SENT') THEN 'EMAIL_SENT'::"lead_status"
    WHEN UPPER("status") = 'EMAIL_OPENED' THEN 'EMAIL_OPENED'::"lead_status"
    WHEN UPPER("status") IN ('FOLLOW_UP', 'FOLLOW_UP_PENDING') THEN 'FOLLOW_UP_PENDING'::"lead_status"
    WHEN UPPER("status") = 'FOLLOW_UP_SENT' THEN 'FOLLOW_UP_SENT'::"lead_status"
    WHEN UPPER("status") IN ('QUALIFIED', 'RESPONDED') THEN 'RESPONDED'::"lead_status"
    WHEN UPPER("status") IN ('BOOKED', 'MEETING_BOOKED') THEN 'BOOKED'::"lead_status"
    WHEN UPPER("status") IN ('WON', 'CONVERTED', 'CLOSED_WON') THEN 'WON'::"lead_status"
    WHEN UPPER("status") IN ('LOST', 'CLOSED_LOST') THEN 'LOST'::"lead_status"
    WHEN UPPER("status") IN ('DISQUALIFIED', 'NURTURING') THEN 'DISQUALIFIED'::"lead_status"
    ELSE 'NEW'::"lead_status"
  END;

-- AlterTable: Drop old status column
ALTER TABLE "leads" DROP COLUMN "status";

-- AlterTable: Rename new status column to status
ALTER TABLE "leads" RENAME COLUMN "status_new" TO "status";

-- AlterTable: Update index to use new enum column
DROP INDEX IF EXISTS "idx_leads_status";
CREATE INDEX "idx_leads_status" ON "leads"("status");

DROP INDEX IF EXISTS "idx_leads_workflow";
CREATE INDEX "idx_leads_workflow" ON "leads"("workflow_id", "status");
