# FlowTrack Table Definitions

This document provides detailed specifications for all database tables in the FlowTrack system.

**Conventions:**
- All primary keys are UUIDs
- All tables have `created_at` (immutable) and `updated_at` (auto-updated) unless noted
- All mutable tables have `deleted_at` for soft delete
- `JSONB` fields use GIN indexes where queried
- Foreign keys use `ON DELETE` actions appropriate to data lifecycle

---

## Module 1: Identity & Access Management

### Table: `users`

**Purpose:** Core user identity supporting both Clerk and native authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Internal user ID |
| `clerk_user_id` | VARCHAR(255) | NULL, UNIQUE | Clerk's external user ID (optional) |
| `email` | CITEXT | NOT NULL, UNIQUE | Case-insensitive email |
| `first_name` | VARCHAR(100) | NULL | User's first name |
| `last_name` | VARCHAR(100) | NULL | User's last name |
| `avatar_url` | TEXT | NULL | Profile image URL |
| `auth_provider` | VARCHAR(20) | NOT NULL, DEFAULT 'local' | Auth provider (clerk, local) |
| `password_hash` | VARCHAR(255) | NULL | Argon2id password hash (native auth only) |
| `password_changed_at` | TIMESTAMP | NULL | Last password change timestamp |
| `email_verification_token` | VARCHAR(255) | NULL, UNIQUE | Email verification token (native auth) |
| `email_verification_expiry` | TIMESTAMP | NULL | Token expiry timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account status |
| `email_verified_at` | TIMESTAMP | NULL | Email verification timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
```

**Constraints:**
```sql
CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
CONSTRAINT users_auth_provider_check CHECK (auth_provider IN ('clerk', 'local'))
```

**Business Rules:**
- Dual authentication mode: Supports both Clerk and native email/password
- Clerk users: `clerk_user_id` required, `password_hash` NULL, `email_verified_at` set on creation
- Native users: `password_hash` required, `email_verification_token` used until verified
- Email validation via regex
- Password stored as Argon2id hash (memoryCost: 65536, timeCost: 3, parallelism: 4)
- Email verification required for native signups
- Soft delete preserves historical data

---

### Table: `workspaces`

**Purpose:** Multi-tenant workspace container for all user data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Workspace ID |
| `name` | VARCHAR(100) | NOT NULL | Display name |
| `slug` | VARCHAR(50) | NOT NULL, UNIQUE | URL-safe identifier (e.g., /p/{slug}) |
| `intake_email_id` | VARCHAR(50) | NOT NULL, UNIQUE | Email intake ID (intake@{id}.flowtrack.com) |
| `owner_user_id` | UUID | NOT NULL, FK → users.id | Workspace owner |
| `timezone` | VARCHAR(50) | DEFAULT 'UTC' | Workspace timezone |
| `settings` | JSONB | DEFAULT '{}'::jsonb | Workspace-level settings |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Workspace status |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_intake_email ON workspaces(intake_email_id);
```

**Constraints:**
```sql
CONSTRAINT workspaces_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
```

**Business Rules:**
- Slug must be lowercase alphanumeric + hyphens
- One owner per workspace (v1)
- Cannot delete workspace if owner still exists (must transfer first)

---

### Table: `workspace_members`

**Purpose:** Team membership for multi-user workspaces (future feature).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Membership ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `user_id` | UUID | NOT NULL, FK → users.id | Member user |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'member' | Access role |
| `permissions` | JSONB | DEFAULT '{}'::jsonb | Custom permissions |
| `invited_by_user_id` | UUID | FK → users.id | Inviter |
| `invited_at` | TIMESTAMP | NULL | Invitation timestamp |
| `joined_at` | TIMESTAMP | NULL | Join timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active membership |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id) WHERE deleted_at IS NULL;
```

**Constraints:**
```sql
CONSTRAINT workspace_members_unique_user_workspace UNIQUE(workspace_id, user_id)
CONSTRAINT workspace_members_valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Business Rules:**
- Roles: owner, admin, member, viewer
- One user can only be member once per workspace
- Deleting workspace removes all members

---

### Table: `oauth_credentials`

**Purpose:** Store encrypted OAuth tokens for third-party integrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Credential ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Owning workspace |
| `provider_type` | VARCHAR(50) | NOT NULL | Provider identifier |
| `provider_user_id` | VARCHAR(255) | NULL | External user ID |
| `provider_email` | CITEXT | NULL | Connected account email |
| `access_token` | TEXT | NOT NULL | Encrypted access token |
| `refresh_token` | TEXT | NULL | Encrypted refresh token |
| `token_type` | VARCHAR(20) | DEFAULT 'Bearer' | OAuth token type |
| `expires_at` | TIMESTAMP | NULL | Token expiration time |
| `scope` | TEXT | NULL | Granted OAuth scopes |
| `metadata` | JSONB | DEFAULT '{}'::jsonb | Provider-specific data |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Credential status |
| `last_used_at` | TIMESTAMP | NULL | Last usage timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_oauth_credentials_workspace ON oauth_credentials(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_oauth_credentials_provider ON oauth_credentials(provider_type, provider_email) WHERE deleted_at IS NULL;
CREATE INDEX idx_oauth_credentials_expiry ON oauth_credentials(expires_at) WHERE is_active = true;
```

**Constraints:**
```sql
CONSTRAINT oauth_credentials_unique_workspace_provider UNIQUE(workspace_id, provider_type)
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
```

**Business Rules:**
- Provider types: GOOGLE_EMAIL, OUTLOOK_EMAIL, CALENDLY
- One credential per provider per workspace
- Tokens encrypted at application layer (Prisma middleware)
- Automatic refresh before expiry

---

### Table: `password_reset_tokens`

**Purpose:** Manage password reset tokens for native authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Token ID |
| `user_id` | UUID | NOT NULL, FK → users.id | User requesting reset |
| `token` | VARCHAR(255) | NOT NULL, UNIQUE | Cryptographically random token |
| `expires_at` | TIMESTAMP | NOT NULL | Token expiry (1 hour from creation) |
| `is_used` | BOOLEAN | NOT NULL, DEFAULT false | Whether token was used |
| `used_at` | TIMESTAMP | NULL | When token was used |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

**Indexes:**
```sql
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user_expiry ON password_reset_tokens(user_id, expires_at);
CREATE INDEX idx_password_reset_created ON password_reset_tokens(created_at);
```

**Constraints:**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Business Rules:**
- Tokens generated using `crypto.randomBytes(32).toString('hex')`
- 1-hour expiry from creation
- Single-use only (is_used flag)
- All tokens invalidated on password change
- User can have multiple pending tokens (newest takes precedence)
- Expired tokens should be cleaned up periodically

---

### Table: `refresh_tokens`

**Purpose:** Store refresh tokens for JWT authentication with rotation support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Token ID |
| `user_id` | UUID | NOT NULL, FK → users.id | Token owner |
| `token` | TEXT | NOT NULL, UNIQUE | Hashed refresh token |
| `expires_at` | TIMESTAMP | NOT NULL | Token expiry (7 days) |
| `is_revoked` | BOOLEAN | NOT NULL, DEFAULT false | Revocation status |
| `revoked_at` | TIMESTAMP | NULL | Revocation timestamp |
| `user_agent` | TEXT | NULL | Client user agent |
| `ip_address` | VARCHAR(45) | NULL | Client IP address (IPv4/IPv6) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

**Indexes:**
```sql
CREATE INDEX idx_refresh_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id, is_revoked);
CREATE INDEX idx_refresh_expiry ON refresh_tokens(expires_at);
```

**Constraints:**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Business Rules:**
- Tokens stored hashed (SHA-256)
- 7-day expiry from creation
- Rotation on each use (old token revoked, new token issued)
- Tracking device/IP for security
- User can revoke all tokens ("logout all devices")
- Expired/revoked tokens cleaned up periodically
- Token reuse detection for security breach alerting

---

### Table: `login_attempts`

**Purpose:** Track login attempts for rate limiting and security monitoring.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Attempt ID |
| `email` | CITEXT | NOT NULL | Email attempted |
| `ip_address` | VARCHAR(45) | NOT NULL | Source IP address |
| `user_agent` | TEXT | NULL | Client user agent |
| `was_successful` | BOOLEAN | NOT NULL, DEFAULT false | Success status |
| `failure_reason` | VARCHAR(100) | NULL | Failure reason code |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Attempt timestamp |

**Indexes:**
```sql
CREATE INDEX idx_login_attempts_email ON login_attempts(email, created_at DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);
```

**Business Rules:**
- Immutable (no updates or deletes for audit trail)
- Failure reasons: INVALID_PASSWORD, USER_NOT_FOUND, ACCOUNT_LOCKED, EMAIL_NOT_VERIFIED
- Rate limiting: Max 5 failed attempts per 15 minutes per email/IP
- Retention: 90 days (then purge)
- Successful attempts also logged for security monitoring

---

## Module 2: Workflow Orchestration

### Table: `workflows`

**Purpose:** Top-level automation workflow container.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Workflow ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Owning workspace |
| `name` | VARCHAR(150) | NOT NULL | Workflow display name |
| `description` | TEXT | NULL | Workflow description |
| `template_id` | VARCHAR(100) | NULL | Template source ID |
| `template_version` | INTEGER | NULL | Template version |
| `booking_url` | TEXT | NULL | Calendly/booking link |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | Workflow status |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | Workflow version |
| `settings` | JSONB | DEFAULT '{}'::jsonb | Workflow settings |
| `total_executions` | INTEGER | NOT NULL, DEFAULT 0 | Total runs (denormalized) |
| `successful_executions` | INTEGER | NOT NULL, DEFAULT 0 | Successful runs |
| `failed_executions` | INTEGER | NOT NULL, DEFAULT 0 | Failed runs |
| `last_executed_at` | TIMESTAMP | NULL | Last execution time |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_status ON workflows(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_template ON workflows(template_id, template_version);
```

**Constraints:**
```sql
CONSTRAINT workflows_valid_status CHECK (status IN ('draft', 'active', 'paused', 'archived'))
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
```

**Business Rules:**
- Status: draft (editing), active (running), paused, archived
- Execution counts denormalized for performance
- Version tracking for workflow changes

---

### Table: `workflow_nodes`

**Purpose:** Individual nodes in the workflow graph (React Flow nodes).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Node database ID |
| `workflow_id` | UUID | NOT NULL, FK → workflows.id | Parent workflow |
| `react_flow_node_id` | VARCHAR(100) | NOT NULL | React Flow node ID |
| `node_type` | VARCHAR(50) | NOT NULL | Node type identifier |
| `node_category` | VARCHAR(20) | NOT NULL | Category: trigger/action/logic |
| `position_x` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 | Canvas X position |
| `position_y` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 | Canvas Y position |
| `config` | JSONB | NOT NULL, DEFAULT '{}'::jsonb | Node configuration |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT true | Node enabled status |
| `execution_order` | INTEGER | NULL | Execution order hint |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_nodes_type ON workflow_nodes(node_type);
CREATE INDEX idx_workflow_nodes_category ON workflow_nodes(node_category);
CREATE INDEX idx_workflow_nodes_config ON workflow_nodes USING gin(config);
```

**Constraints:**
```sql
CONSTRAINT workflow_nodes_unique_react_flow_id UNIQUE(workflow_id, react_flow_node_id)
CONSTRAINT workflow_nodes_valid_category CHECK (node_category IN ('trigger', 'action', 'logic', 'utility'))
FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
```

**Business Rules:**
- Node types: TRIGGER_FORM, ACTION_SEND_EMAIL, LOGIC_DELAY, etc.
- Config stores node-specific settings (email body, delay duration, etc.)
- React Flow node ID must be unique within workflow

**Example Config:**
```json
// ACTION_SEND_EMAIL
{
  "emailSubject": "Welcome to FlowTrack",
  "emailBody": "Hi {{lead.name}}, thanks for signing up!",
  "fromName": "FlowTrack Team"
}

// LOGIC_DELAY
{
  "delayDays": 3,
  "delayHours": 0
}

// LOGIC_CONDITION
{
  "field": "budget",
  "operator": ">=",
  "value": 5000,
  "trueHandle": "qualified",
  "falseHandle": "rejected"
}
```

---

### Table: `workflow_edges`

**Purpose:** Connections between workflow nodes (directed graph edges).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Edge database ID |
| `workflow_id` | UUID | NOT NULL, FK → workflows.id | Parent workflow |
| `react_flow_edge_id` | VARCHAR(100) | NOT NULL | React Flow edge ID |
| `source_node_id` | VARCHAR(100) | NOT NULL | Source node (react_flow_node_id) |
| `target_node_id` | VARCHAR(100) | NOT NULL | Target node (react_flow_node_id) |
| `source_handle` | VARCHAR(50) | NULL | Source handle ID |
| `target_handle` | VARCHAR(50) | NULL | Target handle ID |
| `edge_type` | VARCHAR(20) | DEFAULT 'default' | Edge type |
| `label` | VARCHAR(100) | NULL | Display label |
| `condition` | JSONB | NULL | Conditional routing logic |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT true | Edge enabled status |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_workflow_edges_workflow ON workflow_edges(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_edges_source ON workflow_edges(source_node_id);
CREATE INDEX idx_workflow_edges_target ON workflow_edges(target_node_id);
CREATE INDEX idx_workflow_edges_condition ON workflow_edges USING gin(condition);
```

**Constraints:**
```sql
CONSTRAINT workflow_edges_unique_connection UNIQUE(workflow_id, source_node_id, target_node_id, source_handle, target_handle)
CONSTRAINT workflow_edges_no_self_loop CHECK (source_node_id != target_node_id)
FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
```

**Business Rules:**
- Source/target reference react_flow_node_id (not database PK)
- Handles support multi-path branching
- Condition field enables if/then routing
- No self-loops allowed

---

### Table: `form_fields`

**Purpose:** Public intake form field definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Field ID |
| `workflow_id` | UUID | NOT NULL, FK → workflows.id | Parent workflow |
| `field_key` | VARCHAR(50) | NOT NULL | Internal field key |
| `label` | VARCHAR(150) | NOT NULL | Display label |
| `field_type` | VARCHAR(20) | NOT NULL | Field type |
| `options` | JSONB | NULL | Options for DROPDOWN |
| `placeholder` | VARCHAR(255) | NULL | Placeholder text |
| `help_text` | TEXT | NULL | Help text |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT true | Required field |
| `validation_rules` | JSONB | NULL | Validation rules |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Field active status |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_form_fields_workflow ON form_fields(workflow_id, display_order) WHERE deleted_at IS NULL;
```

**Constraints:**
```sql
CONSTRAINT form_fields_unique_key_per_workflow UNIQUE(workflow_id, field_key)
CONSTRAINT form_fields_valid_type CHECK (field_type IN ('TEXT', 'EMAIL', 'TEXTAREA', 'DROPDOWN', 'NUMBER', 'DATE', 'CHECKBOX'))
FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
```

**Business Rules:**
- Field types: TEXT, EMAIL, TEXTAREA, DROPDOWN, NUMBER, DATE, CHECKBOX
- Validation rules stored in JSONB for flexibility
- Display order determines form layout

---

## Module 3: Leads & Data Management

### Table: `leads`

**Purpose:** Contact/prospect records captured through workflows.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Lead ID |
| `workflow_id` | UUID | NOT NULL, FK → workflows.id | Source workflow |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Owning workspace |
| `email` | CITEXT | NOT NULL | Case-insensitive email |
| `name` | VARCHAR(150) | NULL | Lead name |
| `company_name` | VARCHAR(150) | NULL | Company name |
| `phone` | VARCHAR(50) | NULL | Phone number |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'NEW' | Pipeline status |
| `source` | VARCHAR(50) | NOT NULL | Lead source |
| `source_metadata` | JSONB | NULL | Source details |
| `assigned_to_user_id` | UUID | FK → users.id | Assigned user |
| `score` | INTEGER | DEFAULT 0 | Lead score |
| `tags` | TEXT[] | NULL | Tag array |
| `last_activity_at` | TIMESTAMP | NULL | Last activity |
| `last_email_sent_at` | TIMESTAMP | NULL | Last email sent |
| `last_email_opened_at` | TIMESTAMP | NULL | Last email opened |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_leads_workflow ON leads(workflow_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_workspace ON leads(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON leads(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned ON leads(assigned_to_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_tags ON leads USING gin(tags);
```

**Constraints:**
```sql
CONSTRAINT leads_unique_email_per_workflow UNIQUE(workflow_id, email)
CONSTRAINT leads_workspace_isolation CHECK (workspace_id IS NOT NULL)
FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
```

**Business Rules:**
- Email unique per workflow (prevent duplicate submissions)
- Status represents Kanban column (NEW, QUALIFIED, BOOKED, WON, etc.)
- Source types: FORM, EMAIL_FORWARD, API, MANUAL, IMPORT
- Multi-tenancy enforced via workspace_id

---

### Table: `lead_field_data`

**Purpose:** Store custom form field responses (EAV pattern).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Data ID |
| `lead_id` | UUID | NOT NULL, FK → leads.id | Parent lead |
| `form_field_id` | UUID | NOT NULL, FK → form_fields.id | Field definition |
| `value` | TEXT | NOT NULL | Field value (stored as text) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_lead_field_data_lead ON lead_field_data(lead_id);
CREATE INDEX idx_lead_field_data_field ON lead_field_data(form_field_id);
```

**Constraints:**
```sql
CONSTRAINT lead_field_data_unique_lead_field UNIQUE(lead_id, form_field_id)
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
FOREIGN KEY (form_field_id) REFERENCES form_fields(id) ON DELETE CASCADE
```

**Business Rules:**
- EAV (Entity-Attribute-Value) pattern for dynamic fields
- One value per field per lead
- Type coercion handled at application layer

---

### Table: `lead_events`

**Purpose:** Immutable audit trail of all lead activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Event ID |
| `lead_id` | UUID | NOT NULL, FK → leads.id | Parent lead |
| `event_type` | VARCHAR(50) | NOT NULL | Event type |
| `event_category` | VARCHAR(20) | NOT NULL, DEFAULT 'activity' | Event category |
| `description` | TEXT | NULL | Human-readable description |
| `metadata` | JSONB | NULL | Event-specific data |
| `triggered_by_user_id` | UUID | FK → users.id | User who triggered (if manual) |
| `triggered_by_workflow_execution_id` | UUID | NULL | Execution ID (if automated) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event timestamp |

**Indexes:**
```sql
CREATE INDEX idx_lead_events_lead ON lead_events(lead_id, created_at DESC);
CREATE INDEX idx_lead_events_type ON lead_events(event_type);
CREATE INDEX idx_lead_events_created ON lead_events(created_at DESC);
```

**Constraints:**
```sql
CONSTRAINT lead_events_valid_category CHECK (event_category IN ('activity', 'system', 'communication', 'automation'))
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
FOREIGN KEY (triggered_by_user_id) REFERENCES users(id) ON DELETE SET NULL
```

**Business Rules:**
- Immutable (no updates or deletes)
- Event types: FORM_SUBMITTED, EMAIL_SENT, STATUS_CHANGED, etc.
- Attribution tracks manual vs automated actions
- No `updated_at` field (append-only)

---

## Module 4: Execution Engine

### Table: `workflow_executions`

**Purpose:** Top-level workflow run tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Execution ID |
| `workflow_id` | UUID | NOT NULL, FK → workflows.id | Executed workflow |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `lead_id` | UUID | FK → leads.id | Associated lead (optional) |
| `execution_number` | BIGSERIAL | Auto-increment | Human-readable run number |
| `idempotency_key` | VARCHAR(255) | NULL | Duplicate prevention key |
| `trigger_type` | VARCHAR(50) | NOT NULL | Trigger type |
| `trigger_node_id` | UUID | FK → workflow_nodes.id | Trigger node |
| `trigger_data` | JSONB | NULL | Input payload |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'running' | Execution status |
| `started_at` | TIMESTAMP | NULL | Start time |
| `completed_at` | TIMESTAMP | NULL | Completion time |
| `duration_ms` | INTEGER | NULL | Duration in milliseconds |
| `error_message` | TEXT | NULL | Error message |
| `error_details` | JSONB | NULL | Error details |
| `retry_count` | INTEGER | DEFAULT 0 | Retry attempts |
| `max_retries` | INTEGER | DEFAULT 3 | Max retry limit |
| `lock_acquired_at` | TIMESTAMP | NULL | Concurrency lock time |
| `lock_released_at` | TIMESTAMP | NULL | Lock release time |
| `output_data` | JSONB | NULL | Execution results |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id, status, created_at DESC);
CREATE INDEX idx_workflow_executions_workspace ON workflow_executions(workspace_id, created_at DESC);
CREATE INDEX idx_workflow_executions_lead ON workflow_executions(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status) WHERE status IN ('queued', 'running');
CREATE INDEX idx_workflow_executions_idempotency ON workflow_executions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_workflow_executions_created ON workflow_executions(created_at DESC);
```

**Constraints:**
```sql
CONSTRAINT workflow_executions_valid_status CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'paused'))
CONSTRAINT workflow_executions_unique_idempotency UNIQUE(workflow_id, idempotency_key)
FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
FOREIGN KEY (trigger_node_id) REFERENCES workflow_nodes(id) ON DELETE SET NULL
```

**Business Rules:**
- Status: queued → running → completed/failed
- Idempotency key prevents duplicate form submissions
- Lock timestamps prevent concurrent processing
- Trigger types: FORM_SUBMIT, WEBHOOK, MANUAL, SCHEDULED

---

### Table: `execution_steps`

**Purpose:** Individual node executions within a workflow run.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Step ID |
| `execution_id` | UUID | NOT NULL, FK → workflow_executions.id | Parent execution |
| `workflow_node_id` | UUID | NOT NULL, FK → workflow_nodes.id | Executed node |
| `step_number` | INTEGER | NOT NULL | Sequential step number |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Step status |
| `started_at` | TIMESTAMP | NULL | Start time |
| `completed_at` | TIMESTAMP | NULL | Completion time |
| `duration_ms` | INTEGER | NULL | Duration in milliseconds |
| `input_data` | JSONB | NULL | Input data |
| `output_data` | JSONB | NULL | Output data |
| `error_message` | TEXT | NULL | Error message |
| `error_details` | JSONB | NULL | Error details |
| `retry_count` | INTEGER | DEFAULT 0 | Retry attempts |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_execution_steps_execution ON execution_steps(execution_id, step_number);
CREATE INDEX idx_execution_steps_node ON execution_steps(workflow_node_id);
CREATE INDEX idx_execution_steps_status ON execution_steps(status) WHERE status = 'running';
```

**Constraints:**
```sql
CONSTRAINT execution_steps_valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped'))
FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
FOREIGN KEY (workflow_node_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE
```

**Business Rules:**
- One step per node execution
- Steps ordered by step_number
- Input/output stored for debugging

---

### Table: `execution_logs` (PARTITIONED)

**Purpose:** High-volume detailed logging for workflow executions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | DEFAULT uuid_generate_v4() | Log ID |
| `execution_id` | UUID | NOT NULL | Parent execution |
| `execution_step_id` | UUID | NULL | Parent step (optional) |
| `workspace_id` | UUID | NOT NULL | Workspace (for partitioning) |
| `log_level` | VARCHAR(10) | NOT NULL | Log level |
| `log_category` | VARCHAR(50) | NULL | Log category |
| `message` | TEXT | NOT NULL | Log message |
| `details` | JSONB | NULL | Structured log data |
| `node_type` | VARCHAR(50) | NULL | Node type (for filtering) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Log timestamp (partition key) |

**Primary Key:**
```sql
PRIMARY KEY (id, created_at) -- Composite for partitioning
```

**Partitioning:**
```sql
PARTITION BY RANGE (created_at)

-- Monthly partitions
CREATE TABLE execution_logs_2025_01 PARTITION OF execution_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**Indexes (on each partition):**
```sql
CREATE INDEX idx_execution_logs_execution ON execution_logs(execution_id, created_at DESC);
CREATE INDEX idx_execution_logs_workspace ON execution_logs(workspace_id, created_at DESC);
CREATE INDEX idx_execution_logs_level ON execution_logs(log_level) WHERE log_level IN ('ERROR', 'WARN');
CREATE INDEX idx_execution_logs_category ON execution_logs(log_category);
```

**Constraints:**
```sql
CONSTRAINT execution_logs_valid_level CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR'))
```

**Business Rules:**
- Partitioned monthly for performance
- No foreign keys (performance optimization)
- Log levels: DEBUG, INFO, WARN, ERROR
- Retention: 90 days (drop old partitions)

---

## Module 5: Billing & Usage Tracking

### Table: `subscription_plans`

**Purpose:** Define product tiers and pricing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Plan ID |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Plan name |
| `slug` | VARCHAR(50) | NOT NULL, UNIQUE | URL-safe identifier |
| `description` | TEXT | NULL | Plan description |
| `price_monthly_cents` | INTEGER | NULL | Monthly price (cents) |
| `price_yearly_cents` | INTEGER | NULL | Yearly price (cents) |
| `currency` | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| `quotas` | JSONB | NOT NULL | Quota limits |
| `features` | JSONB | NULL | Feature flags |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Plan active |
| `is_visible` | BOOLEAN | NOT NULL, DEFAULT true | Publicly visible |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, display_order);
```

**Business Rules:**
- Quotas example: `{"workflows": 5, "leads": 1000, "executions_per_month": 1000}`
- Features example: `["custom_branding", "priority_support"]`
- Free tier has NULL pricing

---

### Table: `subscriptions`

**Purpose:** Workspace subscription tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Subscription ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `subscription_plan_id` | UUID | NOT NULL, FK → subscription_plans.id | Active plan |
| `stripe_subscription_id` | VARCHAR(255) | UNIQUE | Stripe subscription ID |
| `stripe_customer_id` | VARCHAR(255) | NULL | Stripe customer ID |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' | Subscription status |
| `billing_cycle` | VARCHAR(10) | NOT NULL | Billing cycle |
| `trial_start_date` | DATE | NULL | Trial start |
| `trial_end_date` | DATE | NULL | Trial end |
| `current_period_start` | DATE | NOT NULL | Period start |
| `current_period_end` | DATE | NOT NULL | Period end |
| `cancel_at_period_end` | BOOLEAN | DEFAULT false | Cancel flag |
| `cancelled_at` | TIMESTAMP | NULL | Cancellation time |
| `metadata` | JSONB | NULL | Additional metadata |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
```

**Constraints:**
```sql
CONSTRAINT subscriptions_valid_status CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired'))
CONSTRAINT subscriptions_valid_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
```

---

### Table: `usage_quotas`

**Purpose:** Current billing period usage tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Quota ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `quota_key` | VARCHAR(50) | NOT NULL | Quota type |
| `quota_limit` | INTEGER | NOT NULL | Maximum allowed |
| `quota_used` | INTEGER | NOT NULL, DEFAULT 0 | Current usage |
| `period_start` | DATE | NOT NULL | Period start |
| `period_end` | DATE | NOT NULL | Period end |
| `last_reset_at` | TIMESTAMP | NULL | Last reset time |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_usage_quotas_workspace ON usage_quotas(workspace_id, quota_key);
CREATE INDEX idx_usage_quotas_period ON usage_quotas(period_start, period_end);
```

**Constraints:**
```sql
CONSTRAINT usage_quotas_unique_workspace_key_period UNIQUE(workspace_id, quota_key, period_start)
CONSTRAINT usage_quotas_usage_within_limit CHECK (quota_used <= quota_limit * 1.2) -- 20% overage buffer
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
```

**Business Rules:**
- Quota keys: workflows, leads, executions, email_sends
- Reset on billing period rollover
- 20% overage allowed before hard block

---

### Table: `usage_events`

**Purpose:** Detailed usage event log for billing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Event ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `event_type` | VARCHAR(50) | NOT NULL | Event type |
| `event_category` | VARCHAR(20) | NOT NULL | Event category |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Units consumed |
| `related_resource_id` | UUID | NULL | Related resource |
| `related_resource_type` | VARCHAR(50) | NULL | Resource type |
| `is_billable` | BOOLEAN | NOT NULL, DEFAULT true | Billable flag |
| `billed_at` | TIMESTAMP | NULL | Billing timestamp |
| `metadata` | JSONB | NULL | Event metadata |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event time |

**Indexes:**
```sql
CREATE INDEX idx_usage_events_workspace ON usage_events(workspace_id, created_at DESC);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_billable ON usage_events(is_billable, billed_at) WHERE is_billable = true;
CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);
```

**Constraints:**
```sql
CONSTRAINT usage_events_valid_category CHECK (event_category IN ('compute', 'communication', 'storage', 'api'))
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
```

---

## Module 6: Webhooks & Integrations

### Table: `webhook_endpoints`

**Purpose:** Outgoing webhook configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Endpoint ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `url` | TEXT | NOT NULL | Webhook URL |
| `description` | VARCHAR(255) | NULL | Description |
| `secret_key` | VARCHAR(255) | NULL | HMAC secret |
| `auth_header_name` | VARCHAR(100) | NULL | Auth header name |
| `auth_header_value` | TEXT | NULL | Auth header value (encrypted) |
| `subscribed_events` | TEXT[] | NOT NULL | Event subscriptions |
| `max_retries` | INTEGER | DEFAULT 3 | Max retry attempts |
| `retry_delay_seconds` | INTEGER | DEFAULT 60 | Retry delay |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `last_triggered_at` | TIMESTAMP | NULL | Last trigger time |
| `deleted_at` | TIMESTAMP | NULL | Soft delete |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_webhook_endpoints_workspace ON webhook_endpoints(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;
```

---

### Table: `webhook_deliveries`

**Purpose:** Webhook delivery tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Delivery ID |
| `webhook_endpoint_id` | UUID | NOT NULL, FK → webhook_endpoints.id | Endpoint |
| `event_type` | VARCHAR(50) | NOT NULL | Event type |
| `payload` | JSONB | NOT NULL | Payload sent |
| `http_status_code` | INTEGER | NULL | HTTP status |
| `request_headers` | JSONB | NULL | Request headers |
| `response_body` | TEXT | NULL | Response body |
| `response_headers` | JSONB | NULL | Response headers |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Delivery status |
| `attempt_number` | INTEGER | DEFAULT 1 | Attempt number |
| `max_attempts` | INTEGER | DEFAULT 3 | Max attempts |
| `next_retry_at` | TIMESTAMP | NULL | Next retry time |
| `delivered_at` | TIMESTAMP | NULL | Delivery time |
| `duration_ms` | INTEGER | NULL | Request duration |
| `error_message` | TEXT | NULL | Error message |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed';
```

**Constraints:**
```sql
CONSTRAINT webhook_deliveries_valid_status CHECK (status IN ('pending', 'delivered', 'failed', 'cancelled'))
FOREIGN KEY (webhook_endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE
```

---

## Module 7: Analytics & Reporting

### Table: `workspace_daily_stats`

**Purpose:** Pre-aggregated daily metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Stats ID |
| `workspace_id` | UUID | NOT NULL, FK → workspaces.id | Workspace |
| `stat_date` | DATE | NOT NULL | Date |
| `leads_created` | INTEGER | DEFAULT 0 | Leads created |
| `leads_qualified` | INTEGER | DEFAULT 0 | Leads qualified |
| `leads_won` | INTEGER | DEFAULT 0 | Leads won |
| `total_executions` | INTEGER | DEFAULT 0 | Total executions |
| `successful_executions` | INTEGER | DEFAULT 0 | Successful runs |
| `failed_executions` | INTEGER | DEFAULT 0 | Failed runs |
| `emails_sent` | INTEGER | DEFAULT 0 | Emails sent |
| `emails_opened` | INTEGER | DEFAULT 0 | Emails opened |
| `emails_clicked` | INTEGER | DEFAULT 0 | Emails clicked |
| `avg_execution_duration_ms` | INTEGER | NULL | Avg duration |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

**Indexes:**
```sql
CREATE INDEX idx_workspace_daily_stats_workspace ON workspace_daily_stats(workspace_id, stat_date DESC);
CREATE INDEX idx_workspace_daily_stats_date ON workspace_daily_stats(stat_date DESC);
```

**Constraints:**
```sql
CONSTRAINT workspace_daily_stats_unique_workspace_date UNIQUE(workspace_id, stat_date)
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
```

---

**Document Version:** 1.1
**Last Updated:** 2025-01-22
**Total Tables:** 28

**Recent Changes (v1.1):**
- Added native authentication support alongside Clerk
- Made `clerk_user_id` optional in `users` table
- Added `auth_provider`, `password_hash`, `password_changed_at` fields to `users`
- Added `email_verification_token` and `email_verification_expiry` to `users`
- New table: `password_reset_tokens` for password reset functionality
- New table: `refresh_tokens` for JWT refresh token rotation
- New table: `login_attempts` for rate limiting and security monitoring
