-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "meeting_event_id" VARCHAR(255),
ADD COLUMN     "meeting_status" VARCHAR(20);

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "scheduling_type" VARCHAR(20);
