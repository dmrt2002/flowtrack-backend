-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_completed_at" TIMESTAMP;

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "configuration_data" JSONB,
ADD COLUMN     "strategy_id" VARCHAR(100);

-- CreateTable
CREATE TABLE "onboarding_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "completed_steps" INTEGER[],
    "selected_strategy_id" VARCHAR(100),
    "template_id" VARCHAR(100),
    "configuration_data" JSONB,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_onboarding_sessions_user" ON "onboarding_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_onboarding_sessions_workspace" ON "onboarding_sessions"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_onboarding_sessions_complete" ON "onboarding_sessions"("is_complete");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sessions_unique_user_workspace" ON "onboarding_sessions"("user_id", "workspace_id");

-- AddForeignKey
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
