# FlowTrack Indexing & Performance Optimization

This document details the comprehensive indexing strategy, query optimization patterns, and performance tuning for the FlowTrack database.

---

## Index Strategy Overview

### Indexing Principles

1. **Multi-Tenancy First:** Every tenant-scoped query includes `workspace_id` in composite indexes
2. **Partial Indexes:** Use `WHERE` clauses to exclude soft-deleted or inactive records
3. **Covering Indexes:** Include commonly selected columns to avoid table lookups
4. **JSONB Optimization:** GIN indexes on frequently queried JSON fields
5. **Index Size Management:** Balance query performance against index maintenance cost

### Index Types Used

| Index Type | Usage | Example |
|------------|-------|---------|
| **B-Tree** | Default for equality, range queries | `CREATE INDEX idx_leads_email ON leads(email)` |
| **Partial** | Filter specific subsets | `WHERE deleted_at IS NULL` |
| **Composite** | Multi-column queries | `(workspace_id, status, created_at)` |
| **GIN** | JSONB, array, full-text search | `USING gin(config)` |
| **Unique** | Constraint enforcement | `UNIQUE(workflow_id, email)` |

---

## Critical Query Patterns & Indexes

### Pattern 1: Dashboard Pipeline View

**Query:**
```sql
SELECT id, email, name, company_name, status, created_at
FROM leads
WHERE workspace_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**Indexes:**
```sql
CREATE INDEX idx_leads_workspace
ON leads(workspace_id)
WHERE deleted_at IS NULL;

CREATE INDEX idx_leads_created
ON leads(created_at DESC);
```

**Optimization:**
- Composite index handles both filter and sort
- Partial index excludes deleted records
- Expected rows: 1K-10K per workspace
- Query time: <50ms

---

### Pattern 2: Workflow Execution Queue Processing

**Query:**
```sql
SELECT *
FROM workflow_executions
WHERE status = 'queued'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**Indexes:**
```sql
CREATE INDEX idx_workflow_executions_status
ON workflow_executions(status)
WHERE status IN ('queued', 'running');
```

**Optimization:**
- Partial index on hot statuses only
- `FOR UPDATE SKIP LOCKED` prevents lock contention
- BullMQ workers use this pattern for job processing
- Query time: <10ms (even with 100K pending jobs)

---

### Pattern 3: Graph Traversal (Find Next Nodes)

**Query:**
```sql
SELECT wn.*
FROM workflow_edges we
JOIN workflow_nodes wn ON wn.react_flow_node_id = we.target_node_id
WHERE we.source_node_id = ?
  AND we.workflow_id = ?
  AND we.is_enabled = true;
```

**Indexes:**
```sql
CREATE INDEX idx_workflow_edges_source
ON workflow_edges(source_node_id);

CREATE INDEX idx_workflow_nodes_workflow
ON workflow_nodes(workflow_id)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_workflow_nodes_react_flow_id
ON workflow_nodes(workflow_id, react_flow_node_id);
```

**Optimization:**
- Source index enables fast edge lookup
- Unique index on react_flow_node_id for join
- Expected nodes per edge: 1-5
- Query time: <5ms

---

### Pattern 4: Lead Custom Fields Hydration

**Query:**
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

**Indexes:**
```sql
CREATE INDEX idx_lead_field_data_lead
ON lead_field_data(lead_id);

CREATE INDEX idx_form_fields_workflow
ON form_fields(workflow_id, display_order)
WHERE deleted_at IS NULL;
```

**Optimization:**
- Index on lead_id covers the JOIN
- Expected fields per lead: 3-10
- Query time: <20ms
- Consider materialized view for high-frequency reads

---

### Pattern 5: Quota Check Before Execution

**Query:**
```sql
SELECT quota_limit, quota_used, (quota_limit - quota_used) AS remaining
FROM usage_quotas
WHERE workspace_id = ?
  AND quota_key = 'executions'
  AND period_start <= CURRENT_DATE
  AND period_end >= CURRENT_DATE;
```

**Indexes:**
```sql
CREATE INDEX idx_usage_quotas_workspace
ON usage_quotas(workspace_id, quota_key);

CREATE UNIQUE INDEX idx_usage_quotas_unique
ON usage_quotas(workspace_id, quota_key, period_start);
```

**Optimization:**
- Composite index covers WHERE clause
- Unique index prevents duplicate quota periods
- Expected rows: 1
- Query time: <5ms (critical path, must be fast)

---

### Pattern 6: Execution Logs for Debugging

**Query:**
```sql
SELECT *
FROM execution_logs
WHERE execution_id = ?
  AND created_at BETWEEN ? AND ?
ORDER BY created_at DESC
LIMIT 100;
```

**Indexes (on partitions):**
```sql
CREATE INDEX idx_execution_logs_execution
ON execution_logs(execution_id, created_at DESC);
```

**Optimization:**
- Partitioned by `created_at` (monthly)
- Index includes both filter and sort columns
- Partition pruning reduces scan size by 95%+
- Expected rows: 100-10K per execution
- Query time: <100ms (with partitioning)

---

### Pattern 7: Workspace Analytics (Last 30 Days)

**Query:**
```sql
SELECT
  stat_date,
  leads_created,
  total_executions,
  emails_sent
FROM workspace_daily_stats
WHERE workspace_id = ?
  AND stat_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY stat_date DESC;
```

**Indexes:**
```sql
CREATE INDEX idx_workspace_daily_stats_workspace
ON workspace_daily_stats(workspace_id, stat_date DESC);
```

**Optimization:**
- Pre-aggregated data (no expensive JOINs)
- Composite index covers filter and sort
- Expected rows: 30
- Query time: <10ms

---

## JSONB Indexing Strategy

### When to Index JSONB Fields

**Index if:**
- Field is queried frequently (>100 queries/minute)
- Query filters or searches within JSON structure
- Join or aggregation uses JSON paths

**Don't index if:**
- Field is only read/written (no filtering)
- Cardinality is very low
- Write volume is very high (index maintenance cost)

### GIN Indexes on JSONB

**Example 1: Node Config Search**
```sql
CREATE INDEX idx_workflow_nodes_config
ON workflow_nodes USING gin(config);

-- Enables queries like:
SELECT * FROM workflow_nodes
WHERE config @> '{"emailSubject": "Welcome"}';
```

**Example 2: Edge Condition Queries**
```sql
CREATE INDEX idx_workflow_edges_condition
ON workflow_edges USING gin(condition);

-- Enables queries like:
SELECT * FROM workflow_edges
WHERE condition->>'field' = 'budget';
```

**Example 3: Specific JSON Path Index**
```sql
CREATE INDEX idx_workflow_nodes_email_subject
ON workflow_nodes((config->>'emailSubject'))
WHERE node_type = 'ACTION_SEND_EMAIL';

-- More efficient for specific queries
SELECT * FROM workflow_nodes
WHERE node_type = 'ACTION_SEND_EMAIL'
  AND config->>'emailSubject' LIKE '%Demo%';
```

### JSONB Query Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `->` | Get JSON object field | `config->'emailSubject'` |
| `->>` | Get JSON object field as text | `config->>'emailSubject'` |
| `@>` | Contains | `config @> '{"isActive": true}'` |
| `?` | Key exists | `config ? 'emailBody'` |
| `?&` | All keys exist | `config ?& array['subject', 'body']` |

---

## Partition Strategy: execution_logs

### Partitioning Rationale

**Why Partition:**
- High write volume (10K-1M logs/day)
- Time-based queries (95% of queries filter by date)
- Easy data retention (drop old partitions)
- Improved vacuum performance (per partition)

### Partition Scheme

**Partition Key:** `created_at` (monthly partitions)

```sql
CREATE TABLE execution_logs (
  id UUID DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  -- ... other columns
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

**Partition Creation:**
```sql
-- January 2025
CREATE TABLE execution_logs_2025_01 PARTITION OF execution_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- February 2025
CREATE TABLE execution_logs_2025_02 PARTITION OF execution_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Automated Partition Management

**Option 1: pg_partman Extension**
```sql
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
  p_parent_table := 'public.execution_logs',
  p_control := 'created_at',
  p_interval := '1 month',
  p_retention := '3 months',
  p_retention_keep_table := false
);
```

**Option 2: Cron Job**
```bash
#!/bin/bash
# Run monthly via cron
NEXT_MONTH=$(date -d "next month" +%Y-%m-01)
MONTH_AFTER=$(date -d "+2 months" +%Y-%m-01)

psql -d flowtrack_prod -c "
CREATE TABLE IF NOT EXISTS execution_logs_$(date -d "next month" +%Y_%m)
PARTITION OF execution_logs
FOR VALUES FROM ('$NEXT_MONTH') TO ('$MONTH_AFTER');
"
```

### Partition Retention Policy

**Strategy:** Keep last 90 days, drop older partitions

```sql
-- Drop partitions older than 90 days (run monthly)
DO $$
DECLARE
  partition_name TEXT;
BEGIN
  FOR partition_name IN
    SELECT tablename
    FROM pg_tables
    WHERE tablename LIKE 'execution_logs_%'
      AND tablename < 'execution_logs_' || to_char(CURRENT_DATE - INTERVAL '90 days', 'YYYY_MM')
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || partition_name;
    RAISE NOTICE 'Dropped partition: %', partition_name;
  END LOOP;
END $$;
```

---

## Query Optimization Techniques

### 1. Avoid SELECT *

**Bad:**
```sql
SELECT * FROM leads WHERE workspace_id = ?;
```

**Good:**
```sql
SELECT id, email, name, status, created_at
FROM leads
WHERE workspace_id = ?;
```

**Benefit:** Reduces I/O by 60-80%, enables covering indexes

---

### 2. Use LIMIT on Unbounded Queries

**Bad:**
```sql
SELECT * FROM execution_logs WHERE workspace_id = ?;
```

**Good:**
```sql
SELECT * FROM execution_logs
WHERE workspace_id = ?
ORDER BY created_at DESC
LIMIT 100;
```

**Benefit:** Prevents OOM, enables early termination

---

### 3. Covering Indexes for Hot Queries

**Query:**
```sql
SELECT id, status, created_at
FROM workflow_executions
WHERE workspace_id = ? AND status = 'running';
```

**Index:**
```sql
CREATE INDEX idx_workflow_executions_covering
ON workflow_executions(workspace_id, status)
INCLUDE (id, created_at)
WHERE status IN ('queued', 'running');
```

**Benefit:** Index-only scan (no table access)

---

### 4. Batch Updates for Quota Increments

**Bad (N queries):**
```sql
-- For each execution
UPDATE usage_quotas
SET quota_used = quota_used + 1
WHERE workspace_id = ? AND quota_key = 'executions';
```

**Good (1 query):**
```sql
-- Batch update every 100 executions
UPDATE usage_quotas
SET quota_used = quota_used + 100
WHERE workspace_id = ? AND quota_key = 'executions';
```

**Benefit:** 100x reduction in write I/O

---

### 5. EXISTS vs. COUNT for Existence Checks

**Bad:**
```sql
SELECT COUNT(*) > 0 FROM workflow_executions WHERE idempotency_key = ?;
```

**Good:**
```sql
SELECT EXISTS(
  SELECT 1 FROM workflow_executions WHERE idempotency_key = ? LIMIT 1
);
```

**Benefit:** Stops at first match, 10x faster

---

### 6. Materialized Views for Complex Aggregations

**Problem:** Dashboard summary is slow (1-2 seconds)

```sql
-- Slow query
SELECT
  w.id,
  w.name,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT we.id) AS total_executions,
  AVG(we.duration_ms) AS avg_duration
FROM workflows w
LEFT JOIN leads l ON l.workflow_id = w.id
LEFT JOIN workflow_executions we ON we.workflow_id = w.id
WHERE w.workspace_id = ?
GROUP BY w.id;
```

**Solution:** Materialized view refreshed hourly

```sql
CREATE MATERIALIZED VIEW mv_workflow_summary AS
SELECT
  w.id AS workflow_id,
  w.workspace_id,
  w.name,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT we.id) AS total_executions,
  AVG(we.duration_ms) AS avg_duration,
  NOW() AS refreshed_at
FROM workflows w
LEFT JOIN leads l ON l.workflow_id = w.id AND l.deleted_at IS NULL
LEFT JOIN workflow_executions we ON we.workflow_id = w.id
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.workspace_id, w.name;

CREATE UNIQUE INDEX idx_mv_workflow_summary_id
ON mv_workflow_summary(workflow_id);

CREATE INDEX idx_mv_workflow_summary_workspace
ON mv_workflow_summary(workspace_id);

-- Refresh every hour via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_workflow_summary;
```

**Benefit:** Query time from 1500ms → 10ms

---

## Connection Pooling Strategy

### PgBouncer Configuration

**Why PgBouncer:**
- PostgreSQL has ~100-200 max connections
- NestJS + BullMQ workers can spawn 500+ connections
- PgBouncer multiplexes connections efficiently

**Recommended Config:**
```ini
[databases]
flowtrack_prod = host=localhost dbname=flowtrack_prod

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3
```

**Connection String:**
```
postgresql://user:pass@pgbouncer:6432/flowtrack_prod
```

---

## Vacuum & Maintenance Strategy

### Autovacuum Tuning

**Default Settings (too conservative for high-write tables):**
```sql
ALTER TABLE workflow_executions SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum at 5% dead tuples (vs. default 20%)
  autovacuum_analyze_scale_factor = 0.02, -- Analyze at 2% changes
  autovacuum_vacuum_cost_limit = 2000     -- Faster vacuum
);

ALTER TABLE execution_logs_2025_01 SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_cost_limit = 5000     -- Very aggressive for partitions
);
```

### Manual Maintenance Schedule

**Weekly (via cron):**
```sql
-- Vacuum high-write tables
VACUUM ANALYZE workflow_executions;
VACUUM ANALYZE usage_quotas;
VACUUM ANALYZE usage_events;

-- Reindex fragmented indexes
REINDEX TABLE CONCURRENTLY workflow_executions;
```

**Monthly:**
```sql
-- Deep vacuum (reclaim disk space)
VACUUM FULL usage_events; -- Only if table is >50% bloat

-- Refresh statistics
ANALYZE;
```

---

## Monitoring & Alerting

### Critical Metrics to Track

**1. Slow Queries (pg_stat_statements)**
```sql
SELECT
  query,
  calls,
  total_exec_time / 1000 AS total_seconds,
  mean_exec_time AS avg_ms,
  stddev_exec_time AS stddev_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

**Alert:** Any query with avg_ms > 500ms

---

**2. Index Usage (pg_stat_user_indexes)**
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pk_%';
```

**Alert:** Unused indexes (idx_scan = 0 after 30 days) → DROP

---

**3. Table Bloat (pg_stat_user_tables)**
```sql
SELECT
  schemaname,
  tablename,
  n_live_tup,
  n_dead_tup,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS bloat_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY bloat_pct DESC;
```

**Alert:** bloat_pct > 20% → Manual VACUUM

---

**4. Connection Pool Utilization**
```sql
SELECT
  datname,
  numbackends,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  ROUND(blks_hit * 100.0 / NULLIF(blks_hit + blks_read, 0), 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'flowtrack_prod';
```

**Alert:** cache_hit_ratio < 95% → Increase `shared_buffers`

---

**5. Partition Growth**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'execution_logs_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Alert:** Partition > 10GB → Consider more granular partitioning

---

## Performance Benchmarks

### Expected Query Performance

| Query Type | Target | Acceptable | Critical |
|------------|--------|------------|----------|
| Primary Key Lookup | <5ms | <10ms | >20ms |
| Dashboard Pipeline | <50ms | <100ms | >200ms |
| Workflow Execution | <10ms | <20ms | >50ms |
| Lead Search | <30ms | <50ms | >100ms |
| Analytics (30 days) | <100ms | <200ms | >500ms |
| Execution Logs | <100ms | <200ms | >500ms |

### Throughput Targets

| Operation | Target TPS | Notes |
|-----------|------------|-------|
| Lead Creation | 100/sec | With form submission |
| Workflow Execution Start | 500/sec | Queue jobs |
| Email Send Action | 50/sec | External API rate limit |
| Quota Check | 1000/sec | Hot path |
| Log Write | 5000/sec | Partitioned table |

---

## Scaling Checklist

### At 10K Workspaces
- ✅ Current indexes sufficient
- ✅ PgBouncer connection pooling
- ✅ Autovacuum tuning

### At 50K Workspaces
- ✅ Read replicas for analytics queries
- ✅ Separate database for execution_logs
- ✅ Redis caching for quota checks

### At 100K+ Workspaces
- ✅ Horizontal sharding by workspace_id
- ✅ TimescaleDB for time-series data
- ✅ Dedicated analytics database (ClickHouse)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
