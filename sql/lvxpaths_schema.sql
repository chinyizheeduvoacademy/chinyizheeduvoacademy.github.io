-- ============================================================
-- LvxPaths — ClickHouse Schema (matches LvxCloud pattern)
-- ============================================================
-- Engine: ReplacingMergeTree / MergeTree (same engine family as
-- lvxcloud.services) so we can reuse the same ClickHouse Cloud instance
-- (GCP asia-southeast1) under a separate `lvxpaths` database.
--
-- Deploy: clickhouse-client --host <CH_URL> --user <CH_USER>
--         --password <CH_PASSWORD> --queries-file sql/lvxpaths_schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS lvxpaths;

-- ------------------------------------------------------------
-- Table 1: anonymous learning events (the core telemetry stream)
-- ------------------------------------------------------------
-- Mirrors lvxcloud.services shape: ORDER BY (event_type, occurred_at)
-- for fast range scans on the most common queries.
CREATE TABLE IF NOT EXISTS lvxpaths.events (
    event_id       String,                                  -- UUIDv4
    event_type     Enum8(
                       'item_complete'   = 1,
                       'item_incomplete' = 2,
                       'lesson_viewed'   = 3,
                       'curator_query'   = 4,
                       'path_viewed'     = 5
                   ),
    item_id        LowCardinality(String) DEFAULT '',       -- catalog item id (if applicable)
    path_id        LowCardinality(String) DEFAULT '',       -- catalog path id (if applicable)
    session_id     String,                                  -- anonymous per-browser UUID (no PII)
    session_country LowCardinality(String) DEFAULT '',      -- CF-IPCountry header (no PII)
    occurred_at    DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (event_type, occurred_at, item_id)
SETTINGS index_granularity = 8192;

-- ------------------------------------------------------------
-- Table 2: AI curator queries (for tuning prompt quality)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lvxpaths.curator_queries (
    query_id        String,                                 -- UUIDv4
    session_id      String,
    query_text      String,                                  -- user's natural-language query
    matched_items   Array(String),                           -- returned item ids
    matched_paths   Array(String),                           -- returned path ids
    response_ms     UInt32,                                  -- LLM response time
    occurred_at    DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (occurred_at, session_id);

-- ------------------------------------------------------------
-- Materialized view 1: daily item completion rollup
-- ------------------------------------------------------------
-- This is what powers the "Live stats" widget on the home page
-- (top-completed items this week, completion velocity, etc.).
CREATE MATERIALIZED VIEW IF NOT EXISTS lvxpaths.item_completion_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (item_id, day)
AS
SELECT
    item_id,
    toStartOfDay(occurred_at) AS day,
    countIf(event_type = 1) AS completions,
    countIf(event_type = 2) AS incompletes
FROM lvxpaths.events
WHERE event_type IN (1, 2) AND item_id != ''
GROUP BY item_id, toStartOfDay(occurred_at);

-- ------------------------------------------------------------
-- Materialized view 2: daily active learners
-- ------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS lvxpaths.active_learners_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, session_country)
AS
SELECT
    toStartOfDay(occurred_at) AS day,
    session_country,
    uniqExact(session_id) AS unique_sessions
FROM lvxpaths.events
GROUP BY toStartOfDay(occurred_at), session_country;

-- ------------------------------------------------------------
-- Sample queries (for the /api/stats endpoint)
-- ------------------------------------------------------------
-- Total learners all-time:
--   SELECT uniqExact(session_id) FROM lvxpaths.events;
--
-- Total completions all-time:
--   SELECT countIf(event_type = 1) FROM lvxpaths.events;
--
-- Top 5 most-completed items this week:
--   SELECT item_id, sum(completions) AS c
--   FROM lvxpaths.item_completion_daily
--   WHERE day >= now() - INTERVAL 7 DAY
--   GROUP BY item_id ORDER BY c DESC LIMIT 5;
--
-- Active learners last 24h by country:
--   SELECT session_country, sum(unique_sessions) AS learners
--   FROM lvxpaths.active_learners_daily
--   WHERE day >= now() - INTERVAL 1 DAY
--   GROUP BY session_country ORDER BY learners DESC LIMIT 10;

-- ------------------------------------------------------------
-- Table 3: lab sessions (the lab orchestration telemetry)
-- ------------------------------------------------------------
-- One row per lab launch. ReplacingMergeTree so re-launches for the
-- same session+item dedupe (the latest started_at wins).
CREATE TABLE IF NOT EXISTS lvxpaths.lab_sessions (
    session_id        String,                                  -- anonymous session UUID (same hash as /api/track)
    item_id           LowCardinality(String),                  -- which catalog item's lab
    fly_machine_id    String DEFAULT '',                       -- fly.io machine ID (empty in sandbox)
    fly_app_name      String DEFAULT '',                       -- fly.io app name
    lab_url           String,                                  -- the URL the student accesses
    started_at        DateTime DEFAULT now(),
    expires_at        DateTime,                                -- started_at + timeout_minutes
    stopped_at        Nullable(DateTime),                      -- when actually stopped (null if running)
    duration_seconds  UInt32 DEFAULT 0,                       -- computed on stop
    status            Enum8(
                          'starting' = 1,
                          'running'   = 2,
                          'stopped'  = 3,   -- stopped by user (counts as "completed")
                          'expired'  = 4,   -- auto-stopped by cleanup cron
                          'failed'   = 5
                      ) DEFAULT 1
) ENGINE = ReplacingMergeTree(started_at)
PARTITION BY toYYYYMM(started_at)
ORDER BY (session_id, item_id, started_at);

-- ------------------------------------------------------------
-- Materialized view 3: daily lab completions per item
-- ------------------------------------------------------------
-- A "completion" = status = 3 (user stopped it, vs expired at timeout).
-- Powers the "top labs this week" stat on the home page.
CREATE MATERIALIZED VIEW IF NOT EXISTS lvxpaths.lab_completions_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (item_id, day)
AS
SELECT
    item_id,
    toStartOfDay(started_at) AS day,
    countIf(status = 3) AS labs_completed,
    countIf(status = 4) AS labs_expired
FROM lvxpaths.lab_sessions
GROUP BY item_id, toStartOfDay(started_at);

-- Sample lab queries:
--   -- Currently running labs (for the cleanup cron):
--   SELECT session_id, item_id, fly_machine_id, expires_at
--   FROM lvxpaths.lab_sessions
--   WHERE status IN (1, 2) AND expires_at < now();
--
--   -- Top 5 labs launched this week:
--   SELECT item_id, count() AS launches
--   FROM lvxpaths.lab_sessions
--   WHERE started_at >= now() - INTERVAL 7 DAY
--   GROUP BY item_id ORDER BY launches DESC LIMIT 5;
--
--   -- Average lab session duration:
--   SELECT item_id, avg(duration_seconds) AS avg_s
--   FROM lvxpaths.lab_sessions
--   WHERE status IN (3, 4) AND duration_seconds > 0
--   GROUP BY item_id ORDER BY avg_s DESC;
