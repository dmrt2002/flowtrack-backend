# FlowTrack Database Architecture Overview

## Executive Summary

This document provides a high-level overview of the FlowTrack database architecture, designed to support a multi-tenant SaaS automation platform for solopreneurs.

**Database:** PostgreSQL 14+
**ORM:** Prisma
**Primary Key Strategy:** UUIDs
**Multi-Tenancy Model:** Workspace-based isolation
**Soft Delete:** Enabled on all mutable tables

---

## Architecture Principles

### 1. Multi-Tenancy First
Every piece of user data is strictly isolated by `workspace_id`. This ensures:
- Zero risk of cross-tenant data leaks
- Efficient query performance with workspace-scoped indexes
- GDPR/SOC2 compliance readiness
- Row-Level Security (RLS) at the database level

### 2. Graph-Based Workflow Engine
Unlike rigid step-based workflows, FlowTrack uses a flexible graph architecture:
- **Nodes:** Individual automation steps (triggers, actions, logic)
- **Edges:** Connections between nodes with conditional routing
- **JSONB Configuration:** Each node type stores its specific config in a flexible JSONB field
- **React Flow Compatible:** Direct mapping to the frontend visual editor

### 3. High-Throughput Execution Logging
Automation systems generate massive log volumes:
- **Table Partitioning:** Monthly partitions on `execution_logs` by `created_at`
- **Retention Strategy:** Automated cleanup of old partitions
- **Analytics Ready:** Time-series optimized for dashboard queries

### 4. Usage-Based Billing Foundation
Built-in metering for SaaS pricing models:
- **Subscription Plans:** Tiered plans with quota limits
- **Usage Quotas:** Current period tracking (workflows, executions, leads)
- **Usage Events:** Detailed event log for billing reconciliation
- **Overage Detection:** Real-time quota enforcement

### 5. Security & Compliance
- **OAuth Credentials:** Application-level encryption (Prisma field-level)
- **Soft Deletes:** Audit trail preservation with `deleted_at` timestamps
- **Event Logging:** Complete audit trail in `lead_events` table
- **Row-Level Security:** PostgreSQL RLS policies for defense-in-depth

---

## Database Modules

### Module 1: Identity & Access Management (IAM)
**Tables:** `users`, `workspaces`, `workspace_members`, `oauth_credentials`

**Purpose:** User authentication, workspace management, and OAuth token storage.

**Key Features:**
- Clerk integration for authentication
- One owner per workspace (v1 simplification)
- Multi-member support ready (for future team features)
- Encrypted OAuth tokens for Gmail/Outlook/Calendly

**Multi-Tenancy Anchor:** All data flows through `workspaces` table.

---

### Module 2: Workflow Orchestration
**Tables:** `workflows`, `workflow_nodes`, `workflow_edges`, `form_fields`

**Purpose:** Visual automation builder backend storage.

**Key Features:**
- **Graph Architecture:** Nodes and edges model (not sequential steps)
- **JSONB Configuration:** Flexible per-node settings without schema changes
- **React Flow Mapping:** Direct serialization of React Flow canvas state
- **Template Support:** Workflows can be cloned from templates (`template_id`)
- **Version Control:** Built-in versioning for workflow changes

**Example Node Types:**
- `TRIGGER_FORM`: Form submission trigger
- `TRIGGER_DEMO_BOOKED`: Calendly webhook trigger
- `ACTION_SEND_EMAIL`: Send email action
- `LOGIC_DELAY`: Time delay (e.g., wait 3 days)
- `LOGIC_CONDITION`: Conditional branching (if/then)

---

### Module 3: Leads & Data Management
**Tables:** `leads`, `lead_field_data`, `lead_events`

**Purpose:** Contact/prospect storage with custom form data and activity tracking.

**Key Features:**
- **Dynamic Fields:** Custom form responses stored in `lead_field_data` (EAV pattern)
- **Pipeline Status:** Kanban column tracking (`NEW`, `QUALIFIED`, `BOOKED`, `WON`, etc.)
- **Complete Audit Trail:** Every action logged in `lead_events`
- **Source Tracking:** Distinguish form submissions vs. email forwards vs. manual entry
- **Activity Denormalization:** Fast access to last email/activity timestamps

---

### Module 4: Execution Engine
**Tables:** `workflow_executions`, `execution_steps`, `execution_logs` (partitioned)

**Purpose:** Runtime execution tracking and logging.

**Key Features:**
- **Hierarchical Structure:** Execution → Steps → Logs
- **Idempotency:** Prevent duplicate executions via `idempotency_key`
- **Concurrency Control:** Row-level locking for queue processing
- **Retry Mechanism:** Built-in retry tracking and max attempt limits
- **Performance Metrics:** Duration tracking at execution and step levels
- **Partitioned Logs:** High-volume write optimization

**Execution Flow:**
1. Trigger fires → Create `workflow_execution` (status: `queued`)
2. BullMQ worker picks job → Status: `running`
3. Traverse graph, execute nodes → Create `execution_steps`
4. Log detailed output → Insert into `execution_logs`
5. Complete → Status: `completed` or `failed`

---

### Module 5: Billing & Usage Tracking
**Tables:** `subscription_plans`, `subscriptions`, `usage_quotas`, `usage_events`

**Purpose:** SaaS subscription management and usage metering.

**Key Features:**
- **Tiered Plans:** Free, Starter, Pro with quota limits
- **Stripe Integration:** `stripe_subscription_id` and `stripe_customer_id`
- **Real-Time Quotas:** Fast quota checks via `usage_quotas` table
- **Detailed Metering:** Event-level tracking in `usage_events`
- **Overage Handling:** Configurable limits with 20% buffer

**Quota Types:**
- `workflows`: Number of active workflows
- `leads`: Total leads stored
- `executions_per_month`: Workflow runs per billing period
- `email_sends_per_month`: Email actions per billing period

---

### Module 6: Webhooks & Integrations
**Tables:** `webhook_endpoints`, `webhook_deliveries`

**Purpose:** Outgoing webhooks for third-party integrations.

**Key Features:**
- **Event Subscriptions:** Subscribe to specific events (e.g., `lead.created`)
- **Retry Logic:** Automatic retries with exponential backoff
- **Delivery Tracking:** HTTP status codes, response bodies, timing
- **Security:** HMAC signature support

---

### Module 7: Analytics & Reporting
**Tables:** `workspace_daily_stats`

**Purpose:** Pre-aggregated metrics for dashboard performance.

**Key Features:**
- **Daily Aggregates:** Leads created, executions, emails sent, success rates
- **Fast Dashboards:** Avoid expensive real-time aggregations
- **Eventual Consistency:** Updated via scheduled jobs or triggers

---

## Data Flow Examples

### Example 1: New Lead Submission
```
1. User fills form at /p/{workspace.slug}
2. POST /api/public/lead creates:
   - lead (with workspace_id)
   - lead_field_data (custom fields)
   - lead_event (type: FORM_SUBMITTED)
3. Find TRIGGER_FORM node in workflow_nodes
4. Create workflow_execution (status: queued)
5. BullMQ queues job
6. Worker traverses graph, executes actions
7. Creates execution_steps and execution_logs
```

### Example 2: Calendly Booking
```
1. Calendly sends webhook to /api/webhook/calendly
2. Find lead by email
3. Update lead.status = 'BOOKED'
4. Create lead_event (type: WEBHOOK_RECEIVED)
5. Find TRIGGER_DEMO_BOOKED node
6. Create workflow_execution
7. Execute follow-up email action
8. Increment usage_quotas.email_sends
9. Create usage_event (type: email_sent)
```

### Example 3: Quota Enforcement
```
1. Before workflow execution
2. Query usage_quotas WHERE quota_key = 'executions'
3. Check: quota_used < quota_limit
4. If exceeded → Return 429 Too Many Requests
5. If allowed → Proceed and increment quota_used
```

---

## Technology Decisions

### PostgreSQL (vs. MySQL/MongoDB)
**Chosen for:**
- Native JSONB support with indexing (superior to MongoDB for structured + flexible data)
- Advanced features: Row-Level Security, table partitioning, full-text search
- Robust transaction support (critical for billing)
- Best Prisma integration

### UUIDs (vs. Auto-Increment IDs)
**Chosen for:**
- Distributed system compatibility (future horizontal scaling)
- No ID enumeration attacks on public endpoints
- Merge-safe (avoid ID conflicts when cloning/importing data)
- URL safety (public form links use slugs, not IDs)

### JSONB (vs. Separate Tables)
**Chosen for:**
- Schema flexibility without migrations for new node types
- React Flow state serialization (nodes/edges have dynamic properties)
- Query power (GIN indexes enable complex JSON queries)
- Trade-off: Slightly slower than normalized columns, but worth it for agility

### Table Partitioning (vs. Single Large Table)
**Chosen for:**
- Write performance on high-volume `execution_logs`
- Query performance (partition pruning)
- Maintenance efficiency (drop old partitions vs. DELETE)
- Cost optimization (archive cold partitions to S3)

### Application-Level Encryption (vs. Database-Level or Vault)
**Chosen for:**
- Balance of security and operational simplicity (v1)
- No external service dependencies (HashiCorp Vault)
- Prisma middleware handles encryption transparently
- Acceptable trade-off for early-stage product

---

## Scalability Targets

### Current Architecture Supports:
- **Workspaces:** 100,000+ concurrent tenants
- **Workflows:** 500,000+ active workflows
- **Leads:** 10,000,000+ contacts (with proper indexing)
- **Executions:** 1,000,000+ per day (with partitioning)
- **Concurrent Workers:** 50-100 BullMQ workers

### When to Scale:
- **Read Replicas:** When dashboard queries slow down (>500ms)
- **Connection Pooling:** PgBouncer at 1,000+ concurrent connections
- **Sharding:** Beyond 50M leads or 10M executions/day (shard by `workspace_id`)

---

## Maintenance Strategy

### Daily
- Automated partition creation for next month
- Monitor slow queries (pg_stat_statements)

### Weekly
- `VACUUM ANALYZE` on high-write tables
- Review unused indexes (pg_stat_user_indexes)

### Monthly
- Drop partitions older than retention period (90 days)
- Reindex fragmented indexes
- Review and optimize top 10 slowest queries

### Quarterly
- Rotate encryption keys (OAuth credentials)
- Audit RLS policies for correctness
- Database performance review

---

## Security Considerations

### Multi-Tenancy Isolation
- **Database Level:** Row-Level Security policies on all tenant tables
- **Application Level:** Middleware validates workspace_id on every request
- **Index Level:** Partial indexes exclude other tenants' data

### OAuth Security
- **Encryption:** Access tokens encrypted at rest via Prisma
- **Scope Minimization:** Only request `gmail.send` (not read access)
- **Token Refresh:** Automatic refresh before expiry
- **Audit Logging:** Track token usage in application logs

### Public Endpoints
- **Rate Limiting:** 100 requests/minute per IP on /api/public/*
- **Input Validation:** Zod schemas on all inputs
- **CSRF Protection:** For form submissions
- **Email Verification:** Require verification before sending emails

---

## Next Steps

1. **Review & Approve:** Review this document and provide feedback
2. **Prisma Schema:** Generate Prisma schema from approved design
3. **Migrations:** Create initial migration files
4. **Seed Data:** Populate subscription plans and templates
5. **RLS Policies:** Implement Row-Level Security
6. **Testing:** Integration tests for critical flows

---

## Questions for Review

Please consider the following before approving:

1. **Workspace Model:** Is single-owner-per-workspace acceptable for v1, or do you need multi-user workspaces immediately?
2. **Lead Limits:** Should we hard-cap leads per workspace, or allow overage with pricing?
3. **Execution Retention:** How long should we keep execution logs? (Suggested: 90 days)
4. **Email Deliverability:** Should we track email opens/clicks (requires tracking pixels)?
5. **Webhook Security:** Do we need mutual TLS for webhook endpoints, or is HMAC sufficient?

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Author:** Database Architecture Team
