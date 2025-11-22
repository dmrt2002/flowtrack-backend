-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "workspace_member_role" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "oauth_provider_type" AS ENUM ('GOOGLE_EMAIL', 'OUTLOOK_EMAIL', 'CALENDLY');

-- CreateEnum
CREATE TYPE "workflow_status" AS ENUM ('draft', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "node_category" AS ENUM ('trigger', 'action', 'logic', 'utility');

-- CreateEnum
CREATE TYPE "field_type" AS ENUM ('TEXT', 'EMAIL', 'TEXTAREA', 'DROPDOWN', 'NUMBER', 'DATE', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "lead_source" AS ENUM ('FORM', 'EMAIL_FORWARD', 'API', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "lead_event_category" AS ENUM ('activity', 'system', 'communication', 'automation');

-- CreateEnum
CREATE TYPE "workflow_execution_status" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled', 'paused');

-- CreateEnum
CREATE TYPE "execution_step_status" AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "log_level" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "usage_event_category" AS ENUM ('compute', 'communication', 'storage', 'api');

-- CreateEnum
CREATE TYPE "webhook_delivery_status" AS ENUM ('pending', 'delivered', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('clerk', 'local');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clerk_user_id" VARCHAR(255),
    "email" CITEXT NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "avatar_url" TEXT,
    "auth_provider" "auth_provider" NOT NULL DEFAULT 'local',
    "password_hash" VARCHAR(255),
    "password_changed_at" TIMESTAMP,
    "email_verification_token" VARCHAR(255),
    "email_verification_expiry" TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMP,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "intake_email_id" VARCHAR(50) NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "workspace_member_role" NOT NULL DEFAULT 'member',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "invited_by_user_id" UUID,
    "invited_at" TIMESTAMP,
    "joined_at" TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "provider_type" "oauth_provider_type" NOT NULL,
    "provider_user_id" VARCHAR(255),
    "provider_email" CITEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_type" VARCHAR(20) NOT NULL DEFAULT 'Bearer',
    "expires_at" TIMESTAMP,
    "scope" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "oauth_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "template_id" VARCHAR(100),
    "template_version" INTEGER,
    "booking_url" TEXT,
    "status" "workflow_status" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "successful_executions" INTEGER NOT NULL DEFAULT 0,
    "failed_executions" INTEGER NOT NULL DEFAULT 0,
    "last_executed_at" TIMESTAMP,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "react_flow_node_id" VARCHAR(100) NOT NULL,
    "node_type" VARCHAR(50) NOT NULL,
    "node_category" "node_category" NOT NULL,
    "position_x" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "position_y" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "execution_order" INTEGER,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "workflow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "react_flow_edge_id" VARCHAR(100) NOT NULL,
    "source_node_id" VARCHAR(100) NOT NULL,
    "target_node_id" VARCHAR(100) NOT NULL,
    "source_handle" VARCHAR(50),
    "target_handle" VARCHAR(50),
    "edge_type" VARCHAR(20) NOT NULL DEFAULT 'default',
    "label" VARCHAR(100),
    "condition" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "workflow_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "field_key" VARCHAR(50) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "field_type" "field_type" NOT NULL,
    "options" JSONB,
    "placeholder" VARCHAR(255),
    "help_text" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "validation_rules" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "name" VARCHAR(150),
    "company_name" VARCHAR(150),
    "phone" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'NEW',
    "source" "lead_source" NOT NULL,
    "source_metadata" JSONB,
    "assigned_to_user_id" UUID,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "last_activity_at" TIMESTAMP,
    "last_email_sent_at" TIMESTAMP,
    "last_email_opened_at" TIMESTAMP,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_field_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "form_field_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "lead_field_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "event_category" "lead_event_category" NOT NULL DEFAULT 'activity',
    "description" TEXT,
    "metadata" JSONB,
    "triggered_by_user_id" UUID,
    "triggered_by_workflow_execution_id" UUID,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lead_id" UUID,
    "execution_number" BIGSERIAL NOT NULL,
    "idempotency_key" VARCHAR(255),
    "trigger_type" VARCHAR(50) NOT NULL,
    "trigger_node_id" UUID,
    "trigger_data" JSONB,
    "status" "workflow_execution_status" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "error_details" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "lock_acquired_at" TIMESTAMP,
    "lock_released_at" TIMESTAMP,
    "output_data" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "execution_id" UUID NOT NULL,
    "workflow_node_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "status" "execution_step_status" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "duration_ms" INTEGER,
    "input_data" JSONB,
    "output_data" JSONB,
    "error_message" TEXT,
    "error_details" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "execution_id" UUID NOT NULL,
    "execution_step_id" UUID,
    "workspace_id" UUID NOT NULL,
    "log_level" "log_level" NOT NULL,
    "log_category" VARCHAR(50),
    "message" TEXT NOT NULL,
    "details" JSONB,
    "node_type" VARCHAR(50),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "price_monthly_cents" INTEGER,
    "price_yearly_cents" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "quotas" JSONB NOT NULL,
    "features" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "subscription_plan_id" UUID NOT NULL,
    "stripe_subscription_id" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "billing_cycle" "billing_cycle" NOT NULL,
    "trial_start_date" DATE,
    "trial_end_date" DATE,
    "current_period_start" DATE NOT NULL,
    "current_period_end" DATE NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_quotas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "quota_key" VARCHAR(50) NOT NULL,
    "quota_limit" INTEGER NOT NULL,
    "quota_used" INTEGER NOT NULL DEFAULT 0,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "last_reset_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "usage_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "event_category" "usage_event_category" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "related_resource_id" UUID,
    "related_resource_type" VARCHAR(50),
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "billed_at" TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "description" VARCHAR(255),
    "secret_key" VARCHAR(255),
    "auth_header_name" VARCHAR(100),
    "auth_header_value" TEXT,
    "subscribed_events" TEXT[],
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_seconds" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_endpoint_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "http_status_code" INTEGER,
    "request_headers" JSONB,
    "response_body" TEXT,
    "response_headers" JSONB,
    "status" "webhook_delivery_status" NOT NULL DEFAULT 'pending',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP,
    "delivered_at" TIMESTAMP,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "was_successful" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_daily_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "stat_date" DATE NOT NULL,
    "leads_created" INTEGER NOT NULL DEFAULT 0,
    "leads_qualified" INTEGER NOT NULL DEFAULT 0,
    "leads_won" INTEGER NOT NULL DEFAULT 0,
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "successful_executions" INTEGER NOT NULL DEFAULT 0,
    "failed_executions" INTEGER NOT NULL DEFAULT 0,
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "emails_opened" INTEGER NOT NULL DEFAULT 0,
    "emails_clicked" INTEGER NOT NULL DEFAULT 0,
    "avg_execution_duration_ms" INTEGER,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");

-- CreateIndex
CREATE INDEX "idx_users_clerk_id" ON "users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email_verification_token" ON "users"("email_verification_token");

-- CreateIndex
CREATE INDEX "idx_users_auth_provider" ON "users"("auth_provider");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_intake_email_id_key" ON "workspaces"("intake_email_id");

-- CreateIndex
CREATE INDEX "idx_workspaces_owner" ON "workspaces"("owner_user_id");

-- CreateIndex
CREATE INDEX "idx_workspaces_slug" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "idx_workspaces_intake_email" ON "workspaces"("intake_email_id");

-- CreateIndex
CREATE INDEX "idx_workspace_members_workspace" ON "workspace_members"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_workspace_members_user" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_unique_user_workspace" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_oauth_credentials_workspace" ON "oauth_credentials"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_oauth_credentials_provider" ON "oauth_credentials"("provider_type", "provider_email");

-- CreateIndex
CREATE INDEX "idx_oauth_credentials_expiry" ON "oauth_credentials"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_credentials_unique_workspace_provider" ON "oauth_credentials"("workspace_id", "provider_type");

-- CreateIndex
CREATE INDEX "idx_workflows_workspace" ON "workflows"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "idx_workflows_status" ON "workflows"("status");

-- CreateIndex
CREATE INDEX "idx_workflows_template" ON "workflows"("template_id", "template_version");

-- CreateIndex
CREATE INDEX "idx_workflow_nodes_workflow" ON "workflow_nodes"("workflow_id");

-- CreateIndex
CREATE INDEX "idx_workflow_nodes_type" ON "workflow_nodes"("node_type");

-- CreateIndex
CREATE INDEX "idx_workflow_nodes_category" ON "workflow_nodes"("node_category");

-- CreateIndex
CREATE INDEX "idx_workflow_nodes_config" ON "workflow_nodes" USING GIN ("config" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_nodes_unique_react_flow_id" ON "workflow_nodes"("workflow_id", "react_flow_node_id");

-- CreateIndex
CREATE INDEX "idx_workflow_edges_workflow" ON "workflow_edges"("workflow_id");

-- CreateIndex
CREATE INDEX "idx_workflow_edges_source" ON "workflow_edges"("source_node_id");

-- CreateIndex
CREATE INDEX "idx_workflow_edges_target" ON "workflow_edges"("target_node_id");

-- CreateIndex
CREATE INDEX "idx_workflow_edges_condition" ON "workflow_edges" USING GIN ("condition" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_edges_unique_connection" ON "workflow_edges"("workflow_id", "source_node_id", "target_node_id", "source_handle", "target_handle");

-- CreateIndex
CREATE INDEX "idx_form_fields_workflow" ON "form_fields"("workflow_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_unique_key_per_workflow" ON "form_fields"("workflow_id", "field_key");

-- CreateIndex
CREATE INDEX "idx_leads_workflow" ON "leads"("workflow_id", "status");

-- CreateIndex
CREATE INDEX "idx_leads_workspace" ON "leads"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_leads_email" ON "leads"("email");

-- CreateIndex
CREATE INDEX "idx_leads_status" ON "leads"("status");

-- CreateIndex
CREATE INDEX "idx_leads_assigned" ON "leads"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_leads_created" ON "leads"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_leads_tags" ON "leads" USING GIN ("tags" array_ops);

-- CreateIndex
CREATE UNIQUE INDEX "leads_unique_email_per_workflow" ON "leads"("workflow_id", "email");

-- CreateIndex
CREATE INDEX "idx_lead_field_data_lead" ON "lead_field_data"("lead_id");

-- CreateIndex
CREATE INDEX "idx_lead_field_data_field" ON "lead_field_data"("form_field_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_field_data_unique_lead_field" ON "lead_field_data"("lead_id", "form_field_id");

-- CreateIndex
CREATE INDEX "idx_lead_events_lead" ON "lead_events"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_lead_events_type" ON "lead_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_lead_events_created" ON "lead_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_workflow_executions_workflow" ON "workflow_executions"("workflow_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_workflow_executions_workspace" ON "workflow_executions"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_workflow_executions_lead" ON "workflow_executions"("lead_id");

-- CreateIndex
CREATE INDEX "idx_workflow_executions_status" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "idx_workflow_executions_idempotency" ON "workflow_executions"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_workflow_executions_created" ON "workflow_executions"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_unique_idempotency" ON "workflow_executions"("workflow_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_execution_steps_execution" ON "execution_steps"("execution_id", "step_number");

-- CreateIndex
CREATE INDEX "idx_execution_steps_node" ON "execution_steps"("workflow_node_id");

-- CreateIndex
CREATE INDEX "idx_execution_steps_status" ON "execution_steps"("status");

-- CreateIndex
CREATE INDEX "idx_execution_logs_execution" ON "execution_logs"("execution_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_execution_logs_workspace" ON "execution_logs"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_execution_logs_level" ON "execution_logs"("log_level");

-- CreateIndex
CREATE INDEX "idx_execution_logs_category" ON "execution_logs"("log_category");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "idx_subscription_plans_active" ON "subscription_plans"("is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_workspace" ON "subscriptions"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_subscriptions_stripe" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_usage_quotas_workspace" ON "usage_quotas"("workspace_id", "quota_key");

-- CreateIndex
CREATE INDEX "idx_usage_quotas_period" ON "usage_quotas"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "usage_quotas_unique_workspace_key_period" ON "usage_quotas"("workspace_id", "quota_key", "period_start");

-- CreateIndex
CREATE INDEX "idx_usage_events_workspace" ON "usage_events"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_usage_events_type" ON "usage_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_usage_events_billable" ON "usage_events"("is_billable", "billed_at");

-- CreateIndex
CREATE INDEX "idx_usage_events_created" ON "usage_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_webhook_endpoints_workspace" ON "webhook_endpoints"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_webhook_endpoints_active" ON "webhook_endpoints"("is_active");

-- CreateIndex
CREATE INDEX "idx_webhook_deliveries_endpoint" ON "webhook_deliveries"("webhook_endpoint_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_webhook_deliveries_status" ON "webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "idx_webhook_deliveries_retry" ON "webhook_deliveries"("next_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_password_reset_token" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_password_reset_user_expiry" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "idx_password_reset_created" ON "password_reset_tokens"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_token" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_user" ON "refresh_tokens"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "idx_refresh_expiry" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_login_attempts_email" ON "login_attempts"("email", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_login_attempts_ip" ON "login_attempts"("ip_address", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_login_attempts_created" ON "login_attempts"("created_at");

-- CreateIndex
CREATE INDEX "idx_workspace_daily_stats_workspace" ON "workspace_daily_stats"("workspace_id", "stat_date" DESC);

-- CreateIndex
CREATE INDEX "idx_workspace_daily_stats_date" ON "workspace_daily_stats"("stat_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_daily_stats_unique_workspace_date" ON "workspace_daily_stats"("workspace_id", "stat_date");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_credentials" ADD CONSTRAINT "oauth_credentials_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_field_data" ADD CONSTRAINT "lead_field_data_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_field_data" ADD CONSTRAINT "lead_field_data_form_field_id_fkey" FOREIGN KEY ("form_field_id") REFERENCES "form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_trigger_node_id_fkey" FOREIGN KEY ("trigger_node_id") REFERENCES "workflow_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_workflow_node_id_fkey" FOREIGN KEY ("workflow_node_id") REFERENCES "workflow_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_quotas" ADD CONSTRAINT "usage_quotas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_endpoint_id_fkey" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_daily_stats" ADD CONSTRAINT "workspace_daily_stats_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
