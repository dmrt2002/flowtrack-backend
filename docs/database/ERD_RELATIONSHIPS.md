# FlowTrack Entity-Relationship Diagram

## Visual ERD (Text-Based)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IDENTITY & ACCESS MANAGEMENT (IAM)                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    users     │
│──────────────│
│ id (PK)      │──────┐
│ clerk_user_id│      │
│ email        │      │ owns (1:1)
│ first_name   │      │
│ last_name    │      │
└──────────────┘      │
                      ▼
              ┌──────────────┐
              │  workspaces  │───────────┐
              │──────────────│           │
              │ id (PK)      │           │ has many
              │ slug         │           │
              │ intake_email │           │
              │ owner_user_id│           │
              └──────────────┘           │
                      │                  │
                      │ has many         │
                      │                  │
        ┌─────────────┼──────────────────┼────────────────┐
        │             │                  │                │
        ▼             ▼                  ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│workspace_    │ │oauth_        │ │  workflows   │ │    leads     │
│  members     │ │ credentials  │ │──────────────│ │──────────────│
│──────────────│ │──────────────│ │ id (PK)      │ │ id (PK)      │
│ id (PK)      │ │ id (PK)      │ │ workspace_id │ │ workspace_id │
│ workspace_id │ │ workspace_id │ │ name         │ │ workflow_id  │
│ user_id      │ │ provider_type│ │ status       │ │ email        │
│ role         │ │ access_token │ └──────────────┘ │ status       │
└──────────────┘ │ refresh_token│         │        └──────────────┘
                 └──────────────┘         │
                                          │ has many
                                          │
        ┌─────────────────────────────────┼────────────────────┐
        │                                 │                    │
        ▼                                 ▼                    ▼
┌──────────────┐                 ┌──────────────┐    ┌──────────────┐
│workflow_     │                 │workflow_     │    │ form_fields  │
│   nodes      │                 │   edges      │    │──────────────│
│──────────────│                 │──────────────│    │ id (PK)      │
│ id (PK)      │───source───────>│ id (PK)      │    │ workflow_id  │
│ workflow_id  │                 │ workflow_id  │    │ field_key    │
│ react_flow_  │<───target───────│ source_node  │    │ label        │
│   node_id    │                 │ target_node  │    │ field_type   │
│ node_type    │                 │ condition    │    │ options      │
│ config (JSON)│                 └──────────────┘    └──────────────┘
└──────────────┘                                            │
                                                            │ references
                                                            ▼
                                                    ┌──────────────┐
                                                    │lead_field_   │
                                                    │    data      │
                                                    │──────────────│
                                                    │ id (PK)      │
                                                    │ lead_id      │
                                                    │ form_field_id│
                                                    │ value        │
                                                    └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXECUTION ENGINE                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  workflows   │
│──────────────│
│ id (PK)      │──────┐
└──────────────┘      │ triggers
                      │
                      ▼
              ┌──────────────┐
              │workflow_     │
              │ executions   │──────┐
              │──────────────│      │ belongs to
              │ id (PK)      │      │
              │ workflow_id  │      │
              │ lead_id      │──────┼────────> leads
              │ status       │      │
              │ idempotency_ │      │
              │   key        │      │
              │ trigger_data │      │ has many
              │ output_data  │      │
              └──────────────┘      │
                      │             │
                      │ has many    │
                      ▼             │
              ┌──────────────┐      │
              │execution_    │      │
              │   steps      │      │
              │──────────────│      │
              │ id (PK)      │      │
              │ execution_id │      │
              │ workflow_    │      │
              │   node_id    │──────┼────────> workflow_nodes
              │ step_number  │      │
              │ status       │      │
              │ input_data   │      │
              │ output_data  │      │
              └──────────────┘      │
                      │             │
                      │ generates   │
                      ▼             ▼
              ┌──────────────────────────┐
              │   execution_logs         │
              │  (PARTITIONED BY DATE)   │
              │──────────────────────────│
              │ id (PK)                  │
              │ execution_id             │
              │ execution_step_id        │
              │ workspace_id             │
              │ log_level                │
              │ message                  │
              │ created_at (PARTITION)   │
              └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEADS & ACTIVITY TRACKING                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    leads     │
│──────────────│
│ id (PK)      │──────┐
│ workflow_id  │      │ has many
│ workspace_id │      │
│ email        │      │
│ status       │      │
└──────────────┘      │
                      ▼
              ┌──────────────┐
              │ lead_events  │
              │──────────────│
              │ id (PK)      │
              │ lead_id      │
              │ event_type   │
              │ metadata     │
              │ triggered_by │
              │   _user_id   │
              │ triggered_by │
              │   _workflow_ │
              │   execution  │
              └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      BILLING & SUBSCRIPTIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│subscription_ │
│    plans     │
│──────────────│
│ id (PK)      │──────┐
│ name         │      │ used by
│ slug         │      │
│ quotas (JSON)│      │
│ features     │      │
└──────────────┘      │
                      ▼
              ┌──────────────┐
              │subscriptions │───────┐
              │──────────────│       │ for
              │ id (PK)      │       │
              │ workspace_id │<──────┘
              │ subscription_│
              │   plan_id    │
              │ stripe_sub_id│
              │ status       │
              │ current_     │
              │   period_*   │
              └──────────────┘

┌──────────────┐
│  workspaces  │
│──────────────│
│ id (PK)      │──────┬──────────────┐
└──────────────┘      │              │ has many
                      │              │
                      ▼              ▼
              ┌──────────────┐ ┌──────────────┐
              │usage_quotas  │ │usage_events  │
              │──────────────│ │──────────────│
              │ id (PK)      │ │ id (PK)      │
              │ workspace_id │ │ workspace_id │
              │ quota_key    │ │ event_type   │
              │ quota_limit  │ │ event_       │
              │ quota_used   │ │   category   │
              │ period_start │ │ quantity     │
              │ period_end   │ │ is_billable  │
              └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBHOOKS & INTEGRATIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  workspaces  │
│──────────────│
│ id (PK)      │──────┐
└──────────────┘      │ has many
                      │
                      ▼
              ┌──────────────┐
              │webhook_      │
              │ endpoints    │──────┐
              │──────────────│      │ tracks
              │ id (PK)      │      │
              │ workspace_id │      │
              │ url          │      │
              │ subscribed_  │      │
              │   events[]   │      │
              │ secret_key   │      │
              └──────────────┘      │
                      │             │ has many
                      │             │
                      ▼             ▼
              ┌──────────────────────────┐
              │ webhook_deliveries       │
              │──────────────────────────│
              │ id (PK)                  │
              │ webhook_endpoint_id      │
              │ event_type               │
              │ payload (JSON)           │
              │ status                   │
              │ http_status_code         │
              │ attempt_number           │
              └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      ANALYTICS & REPORTING                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  workspaces  │
│──────────────│
│ id (PK)      │──────┐
└──────────────┘      │ has stats
                      │
                      ▼
              ┌──────────────┐
              │workspace_    │
              │ daily_stats  │
              │──────────────│
              │ id (PK)      │
              │ workspace_id │
              │ stat_date    │
              │ leads_created│
              │ leads_won    │
              │ total_       │
              │   executions │
              │ emails_sent  │
              └──────────────┘
```

---

## Relationship Descriptions

### 1. Users ↔ Workspaces (1:1 Owner)
**Relationship:** One user owns one workspace (v1 simplification)

**Business Rule:**
- Each workspace has exactly one owner (`workspaces.owner_user_id`)
- A user can only own one workspace in v1
- Future: Expand to many-to-many via `workspace_members`

**Constraint:**
```sql
UNIQUE(workspaces.owner_user_id)
```

**Cascade Behavior:**
- Deleting a user is RESTRICTED if they own a workspace
- User must transfer ownership or delete workspace first

---

### 2. Workspaces ↔ Workspace Members (1:N)
**Relationship:** One workspace can have multiple members

**Business Rule:**
- Members can have roles: `owner`, `admin`, `member`, `viewer`
- Permissions stored in JSONB for flexibility
- Tracks invitation and join timestamps

**Constraint:**
```sql
UNIQUE(workspace_id, user_id) -- Can't add same user twice
```

**Cascade Behavior:**
- Deleting workspace CASCADE deletes all members
- Deleting user CASCADE deletes their memberships

---

### 3. Workspaces ↔ OAuth Credentials (1:N)
**Relationship:** One workspace has multiple OAuth connections

**Business Rule:**
- One credential per provider type per workspace
- Supported providers: `GOOGLE_EMAIL`, `OUTLOOK_EMAIL`, `CALENDLY`
- Tokens encrypted at application layer

**Constraint:**
```sql
UNIQUE(workspace_id, provider_type) -- Can't connect same provider twice
```

**Cascade Behavior:**
- Deleting workspace CASCADE deletes all credentials
- Tokens are permanently lost (cannot be recovered)

---

### 4. Workspaces ↔ Workflows (1:N)
**Relationship:** One workspace can create multiple workflows

**Business Rule:**
- Each workflow belongs to exactly one workspace
- Workflows can be `draft`, `active`, `paused`, or `archived`
- Templates can be cloned (via `template_id`)

**Multi-Tenancy:**
- All workflow queries MUST filter by `workspace_id`
- RLS policy enforces workspace isolation

**Cascade Behavior:**
- Deleting workspace CASCADE deletes all workflows
- Deleting workflow CASCADE deletes nodes, edges, executions

---

### 5. Workflows ↔ Workflow Nodes (1:N)
**Relationship:** One workflow has multiple nodes

**Business Rule:**
- Each node has a unique `react_flow_node_id` within the workflow
- Node types: triggers, actions, logic, utilities
- Configuration stored in JSONB `config` field

**Example:**
```json
{
  "react_flow_node_id": "node_abc123",
  "node_type": "ACTION_SEND_EMAIL",
  "config": {
    "emailSubject": "Thanks for booking!",
    "emailBody": "Hi {{lead.name}}, ..."
  }
}
```

**Cascade Behavior:**
- Deleting workflow CASCADE deletes all nodes
- Deleting node DOES NOT delete edges (orphaned edges handled separately)

---

### 6. Workflows ↔ Workflow Edges (1:N)
**Relationship:** One workflow has multiple edges (connections)

**Business Rule:**
- Edges connect nodes via `source_node_id` → `target_node_id`
- References `react_flow_node_id` (not the database PK)
- Supports multiple handles for branching (e.g., success/failure paths)
- Conditional logic stored in JSONB `condition`

**Graph Integrity:**
- No self-loops allowed (`source_node_id != target_node_id`)
- Orphaned edges (pointing to deleted nodes) must be cleaned up

**Example:**
```json
{
  "source_node_id": "condition_check_budget",
  "target_node_id": "send_high_value_email",
  "source_handle": "condition_true",
  "condition": {"field": "budget", "operator": ">=", "value": 5000}
}
```

**Cascade Behavior:**
- Deleting workflow CASCADE deletes all edges

---

### 7. Workflow Nodes ↔ Workflow Edges (N:M via Graph)
**Relationship:** Nodes are connected by edges (directed graph)

**Graph Queries:**
```sql
-- Find all outgoing edges from a node
SELECT * FROM workflow_edges WHERE source_node_id = 'node_abc';

-- Find all incoming edges to a node
SELECT * FROM workflow_edges WHERE target_node_id = 'node_xyz';

-- Find next nodes in execution path
SELECT wn.*
FROM workflow_nodes wn
JOIN workflow_edges we ON we.target_node_id = wn.react_flow_node_id
WHERE we.source_node_id = 'current_node'
  AND we.is_enabled = true;
```

---

### 8. Workflows ↔ Form Fields (1:N)
**Relationship:** One workflow has one public intake form with multiple fields

**Business Rule:**
- Fields define the public form structure
- Each field has a unique `field_key` within the workflow
- Supports types: TEXT, EMAIL, DROPDOWN, NUMBER, DATE, CHECKBOX
- Validation rules stored in JSONB

**Example:**
```json
{
  "field_key": "budget",
  "label": "Project Budget",
  "field_type": "DROPDOWN",
  "options": ["$500", "$5000", "$10000+"],
  "is_required": true
}
```

**Cascade Behavior:**
- Deleting workflow CASCADE deletes all form fields
- Deleting field RESTRICTS if lead_field_data references it

---

### 9. Workspaces ↔ Leads (1:N)
**Relationship:** One workspace has multiple leads

**Business Rule:**
- Leads are contacts/prospects in the pipeline
- Belong to both a workspace AND a workflow
- Email must be unique per workflow
- Status represents Kanban column (NEW, QUALIFIED, BOOKED, WON, etc.)

**Multi-Tenancy:**
- All lead queries MUST filter by `workspace_id`
- Check constraint enforces `workspace_id IS NOT NULL`

**Cascade Behavior:**
- Deleting workspace CASCADE deletes all leads
- Deleting workflow CASCADE deletes all leads

---

### 10. Workflows ↔ Leads (1:N)
**Relationship:** One workflow can generate multiple leads

**Business Rule:**
- Each lead is associated with the workflow that captured them
- Email is unique per workflow (can't submit same form twice)

**Constraint:**
```sql
UNIQUE(workflow_id, email)
```

---

### 11. Leads ↔ Lead Field Data (1:N)
**Relationship:** One lead has multiple custom field values

**Business Rule:**
- Stores responses to custom form fields
- Each lead can have one value per form field
- Values stored as text (typed at application layer)

**EAV Pattern:**
- Entity: `lead_id`
- Attribute: `form_field_id`
- Value: `value` (TEXT)

**Constraint:**
```sql
UNIQUE(lead_id, form_field_id) -- One value per field per lead
```

**Cascade Behavior:**
- Deleting lead CASCADE deletes all field data
- Deleting form field CASCADE deletes all values for that field

---

### 12. Leads ↔ Lead Events (1:N)
**Relationship:** One lead has multiple activity events

**Business Rule:**
- Complete audit trail of all lead activities
- Event types: FORM_SUBMITTED, EMAIL_SENT, STATUS_CHANGED, etc.
- Metadata stored in JSONB for flexibility
- Attribution: Can be triggered by user OR workflow execution

**Immutable:**
- Events are never updated or deleted (audit trail)
- No `updated_at` timestamp
- No soft delete

**Example:**
```json
{
  "event_type": "EMAIL_SENT",
  "description": "Sent welcome email",
  "metadata": {
    "email_subject": "Welcome!",
    "sent_at": "2025-01-21T10:30:00Z",
    "template_id": "welcome_v1"
  }
}
```

---

### 13. Workflows ↔ Workflow Executions (1:N)
**Relationship:** One workflow can be executed multiple times

**Business Rule:**
- Each execution represents a single workflow run
- Triggered by: form submission, webhook, manual action, scheduled job
- Idempotency key prevents duplicates
- Status lifecycle: queued → running → completed/failed

**Concurrency:**
- Row-level locking prevents duplicate processing
- `lock_acquired_at` tracks which worker owns the execution

**Constraint:**
```sql
UNIQUE(workflow_id, idempotency_key) WHERE idempotency_key IS NOT NULL
```

**Cascade Behavior:**
- Deleting workflow CASCADE deletes all executions

---

### 14. Workflow Executions ↔ Execution Steps (1:N)
**Relationship:** One execution has multiple steps (one per node executed)

**Business Rule:**
- Each step represents execution of a single workflow node
- Steps are ordered by `step_number`
- Input/output data stored in JSONB
- Retry tracking at step level

**Cascade Behavior:**
- Deleting execution CASCADE deletes all steps

---

### 15. Workflow Executions ↔ Execution Logs (1:N)
**Relationship:** One execution generates multiple log entries

**Business Rule:**
- High-volume writes (1000s of logs per execution)
- Partitioned by `created_at` for performance
- Log levels: DEBUG, INFO, WARN, ERROR
- Can be execution-level OR step-level

**Partitioning:**
- Monthly partitions: `execution_logs_2025_01`, `execution_logs_2025_02`, etc.
- Retention policy: Drop partitions older than 90 days

**Query Pattern:**
```sql
-- Get all logs for an execution (partition pruning if date range known)
SELECT * FROM execution_logs
WHERE execution_id = ?
ORDER BY created_at DESC;
```

---

### 16. Workspaces ↔ Subscriptions (1:N)
**Relationship:** One workspace has one active subscription (can have historical)

**Business Rule:**
- Current subscription determines quotas and features
- Stripe integration via `stripe_subscription_id`
- Status: trial, active, past_due, cancelled, expired
- Billing cycle: monthly or yearly

**Active Subscription Query:**
```sql
SELECT * FROM subscriptions
WHERE workspace_id = ? AND status = 'active'
ORDER BY created_at DESC
LIMIT 1;
```

**Cascade Behavior:**
- Deleting workspace CASCADE deletes subscriptions
- Deleting subscription plan is RESTRICTED if active subscriptions exist

---

### 17. Subscription Plans ↔ Subscriptions (1:N)
**Relationship:** One plan can be used by multiple workspaces

**Business Rule:**
- Plans define quotas and pricing
- Plans are immutable (create new version instead of updating)
- Quotas stored in JSONB: `{"workflows": 5, "leads": 1000, ...}`

**Cascade Behavior:**
- Deleting plan is RESTRICTED if any subscriptions reference it

---

### 18. Workspaces ↔ Usage Quotas (1:N)
**Relationship:** One workspace has multiple quota trackers

**Business Rule:**
- One row per quota type per billing period
- Quota types: workflows, leads, executions, email_sends
- Reset on period_end date
- Allow 20% overage buffer before hard blocking

**Update Pattern:**
```sql
-- Atomic increment on workflow execution
UPDATE usage_quotas
SET quota_used = quota_used + 1
WHERE workspace_id = ? AND quota_key = 'executions'
  AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE;
```

**Constraint:**
```sql
UNIQUE(workspace_id, quota_key, period_start)
```

---

### 19. Workspaces ↔ Usage Events (1:N)
**Relationship:** One workspace generates multiple usage events

**Business Rule:**
- Detailed event log for billing reconciliation
- Event categories: compute, communication, storage, api
- Billable flag for pricing logic
- Quantity field for multi-unit events

**Example:**
```json
{
  "event_type": "email_sent",
  "event_category": "communication",
  "quantity": 1,
  "related_resource_type": "workflow_execution",
  "related_resource_id": "exec_123",
  "is_billable": true
}
```

---

### 20. Workspaces ↔ Webhook Endpoints (1:N)
**Relationship:** One workspace can configure multiple webhook endpoints

**Business Rule:**
- Outgoing webhooks for third-party integrations
- Subscribe to specific events: `lead.created`, `workflow.completed`
- HMAC signature for security
- Retry configuration per endpoint

**Cascade Behavior:**
- Deleting workspace CASCADE deletes all webhook endpoints

---

### 21. Webhook Endpoints ↔ Webhook Deliveries (1:N)
**Relationship:** One endpoint has multiple delivery attempts

**Business Rule:**
- Tracks each webhook POST attempt
- Stores HTTP status, response body, timing
- Retry logic: exponential backoff up to max_attempts
- Status: pending, delivered, failed, cancelled

**Cascade Behavior:**
- Deleting endpoint CASCADE deletes all deliveries

---

### 22. Workspaces ↔ Workspace Daily Stats (1:N)
**Relationship:** One workspace has daily aggregate statistics

**Business Rule:**
- Pre-computed metrics for dashboard performance
- One row per workspace per day
- Metrics: leads created/won, executions, emails sent/opened
- Updated via scheduled jobs or triggers

**Constraint:**
```sql
UNIQUE(workspace_id, stat_date)
```

---

## Critical Join Patterns

### Pattern 1: Get Lead with Custom Fields
```sql
SELECT
  l.*,
  json_object_agg(ff.field_key, lfd.value) AS custom_fields
FROM leads l
LEFT JOIN lead_field_data lfd ON lfd.lead_id = l.id
LEFT JOIN form_fields ff ON ff.id = lfd.form_field_id
WHERE l.id = ?
GROUP BY l.id;
```

### Pattern 2: Execute Workflow (Graph Traversal)
```sql
-- Step 1: Find trigger node
SELECT * FROM workflow_nodes
WHERE workflow_id = ? AND node_type = 'TRIGGER_FORM';

-- Step 2: Find next nodes
SELECT wn.*
FROM workflow_edges we
JOIN workflow_nodes wn ON wn.react_flow_node_id = we.target_node_id
WHERE we.source_node_id = 'trigger_node_id'
  AND we.is_enabled = true;

-- Step 3: Repeat recursively (application logic)
```

### Pattern 3: Check Quota Before Execution
```sql
SELECT
  quota_limit,
  quota_used,
  (quota_limit - quota_used) AS remaining
FROM usage_quotas
WHERE workspace_id = ?
  AND quota_key = 'executions'
  AND period_start <= CURRENT_DATE
  AND period_end >= CURRENT_DATE;
```

### Pattern 4: Dashboard Pipeline Summary
```sql
SELECT
  status,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_this_week
FROM leads
WHERE workspace_id = ? AND deleted_at IS NULL
GROUP BY status;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
