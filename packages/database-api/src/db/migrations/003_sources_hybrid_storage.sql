/**
 * Migration 003: Sources Hybrid Storage
 * Session 129 - Persistance Hybride IndexedDB + PostgreSQL
 *
 * Creates:
 * - sources (unified source definitions with RLS)
 * - sync_history (synchronization tracking per source)
 * - sync_queue (offline operations queue)
 * - Indexes for performance (composite, partial, JSONB)
 * - RLS policies (user isolation)
 * - Triggers (updated_at, audit)
 * - Functions (conflict resolution, optimistic locking)
 *
 * Based on UnifiedSource interface (Session 128)
 */

-- ========== Enable Required Extensions ==========

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- UUID generation

-- ========== Table: sources ==========

/**
 * Sources table - Unified source definitions
 * Stores datasource configurations (Office365, Gmail, etc.)
 * RLS enabled for multi-tenant isolation
 */
CREATE TABLE IF NOT EXISTS sources (
  -- Identity (Primary Key + Business Identity)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  connector_type VARCHAR(50) NOT NULL,  -- office365-mail, gmail, mock, etc.

  -- Ownership & Isolation
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status Management
  status VARCHAR(20) NOT NULL DEFAULT 'idle',  -- idle, syncing, error, disabled

  -- Configuration (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}',  -- SourceConfigData (credentials, endpoints, filters)
  field_mappings JSONB DEFAULT '[]',   -- FieldMapping[] (Session 128)

  -- Sync Configuration
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_interval INTEGER DEFAULT 300000,  -- 5 minutes in milliseconds
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,

  -- Statistics
  items_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,  -- Size in bytes
  last_sync_duration INTEGER,   -- Duration in milliseconds

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',  -- Extensible metadata

  -- Versioning & Integrity
  schema_version VARCHAR(20) DEFAULT '1.0.0',
  checksum VARCHAR(64),  -- SHA-256 checksum for integrity
  version INTEGER DEFAULT 1 NOT NULL,  -- Optimistic locking

  -- Constraints
  CONSTRAINT sources_status_check CHECK (status IN ('idle', 'syncing', 'error', 'disabled')),
  CONSTRAINT sources_sync_interval_check CHECK (sync_interval >= 60000),  -- Min 1 minute
  CONSTRAINT sources_version_check CHECK (version > 0)
);

-- ========== Table: sync_history ==========

/**
 * Sync History - Tracks all synchronization operations
 * Audit trail for debugging and compliance
 */
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,  -- Calculated: finished_at - started_at

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'running',  -- running, success, error, cancelled

  -- Results
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,

  -- Error Tracking
  error_message TEXT,
  error_stack TEXT,
  error_code VARCHAR(50),

  -- Conflict Resolution
  conflicts_resolved INTEGER DEFAULT 0,
  conflicts_manual INTEGER DEFAULT 0,

  -- Metadata
  triggered_by VARCHAR(50),  -- 'auto', 'manual', 'system'
  sync_type VARCHAR(50),     -- 'full', 'incremental', 'delta'
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT sync_history_status_check CHECK (status IN ('running', 'success', 'error', 'cancelled')),
  CONSTRAINT sync_history_timing_check CHECK (finished_at IS NULL OR finished_at >= started_at)
);

-- ========== Table: sync_queue ==========

/**
 * Sync Queue - Offline operations queue
 * Stores pending operations when offline (create/update/delete sources)
 */
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation
  operation VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete'
  entity_type VARCHAR(50) NOT NULL DEFAULT 'source',
  entity_id UUID,  -- NULL for 'create' operations

  -- Payload
  payload JSONB NOT NULL,  -- Full entity data or delta

  -- Queue Management
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, success, error
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Error Tracking
  last_error TEXT,

  -- User Context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT sync_queue_operation_check CHECK (operation IN ('create', 'update', 'delete')),
  CONSTRAINT sync_queue_status_check CHECK (status IN ('pending', 'processing', 'success', 'error')),
  CONSTRAINT sync_queue_retry_check CHECK (retry_count <= max_retries)
);

-- ========== Indexes: sources ==========

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_sources_user_id ON sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_connector_type ON sources(connector_type);
CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);

-- Composite index for common queries (user + status + connector)
CREATE INDEX IF NOT EXISTS idx_sources_user_status ON sources(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sources_user_connector ON sources(user_id, connector_type);

-- Sync scheduling index (auto_sync sources with next_sync_at in the past)
CREATE INDEX IF NOT EXISTS idx_sources_next_sync
  ON sources(next_sync_at)
  WHERE auto_sync = TRUE AND status = 'idle';

-- Error tracking (sources with recent errors)
CREATE INDEX IF NOT EXISTS idx_sources_errors
  ON sources(last_sync_at DESC)
  WHERE last_sync_error IS NOT NULL;

-- JSONB indexes (GIN for containment queries)
CREATE INDEX IF NOT EXISTS idx_sources_config_gin ON sources USING GIN(config);
CREATE INDEX IF NOT EXISTS idx_sources_metadata_gin ON sources USING GIN(metadata);

-- Full-text search on name (if needed)
-- CREATE INDEX IF NOT EXISTS idx_sources_name_trgm ON sources USING GIN(name gin_trgm_ops);

-- ========== Indexes: sync_history ==========

-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_sync_history_source_id ON sync_history(source_id);

-- Temporal queries (recent syncs)
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);

-- Composite for source history queries
CREATE INDEX IF NOT EXISTS idx_sync_history_source_started
  ON sync_history(source_id, started_at DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);

-- Error tracking
CREATE INDEX IF NOT EXISTS idx_sync_history_errors
  ON sync_history(started_at DESC)
  WHERE status = 'error';

-- ========== Indexes: sync_queue ==========

-- Queue processing index (pending operations ordered by creation)
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
  ON sync_queue(created_at)
  WHERE status = 'pending';

-- Retry scheduling index
CREATE INDEX IF NOT EXISTS idx_sync_queue_retry
  ON sync_queue(next_retry_at)
  WHERE status = 'error' AND retry_count < max_retries;

-- User-specific queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);

-- Entity lookup
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

-- ========== Row Level Security (RLS) ==========

-- Enable RLS on sources
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sources
CREATE POLICY sources_user_isolation
  ON sources
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Users can insert sources (user_id must match)
CREATE POLICY sources_user_insert
  ON sources
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id')::UUID);

-- Enable RLS on sync_history
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see sync history for their own sources
CREATE POLICY sync_history_user_isolation
  ON sync_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sources
      WHERE sources.id = sync_history.source_id
        AND sources.user_id = current_setting('app.current_user_id')::UUID
    )
  );

-- Enable RLS on sync_queue
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own queue items
CREATE POLICY sync_queue_user_isolation
  ON sync_queue
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- ========== Triggers ==========

-- Trigger: Auto-update updated_at on sources
CREATE OR REPLACE FUNCTION update_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_sources_updated_at();

-- Trigger: Calculate duration_ms on sync_history finish
CREATE OR REPLACE FUNCTION calculate_sync_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at))::INTEGER * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_history_duration
  BEFORE UPDATE ON sync_history
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sync_duration();

-- ========== Functions: Conflict Resolution ==========

/**
 * Function: resolve_source_conflict
 * Implements last-write-wins conflict resolution with version check
 *
 * @param p_source_id UUID - Source ID to update
 * @param p_expected_version INTEGER - Expected version (optimistic locking)
 * @param p_updates JSONB - Fields to update
 * @returns JSONB - { success: boolean, current_version: integer, conflict: boolean }
 */
CREATE OR REPLACE FUNCTION resolve_source_conflict(
  p_source_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB
) RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
  v_current_updated_at TIMESTAMPTZ;
  v_new_updated_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Get current version and updated_at
  SELECT version, updated_at INTO v_current_version, v_current_updated_at
  FROM sources
  WHERE id = p_source_id;

  -- Check if source exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'source_not_found',
      'conflict', false
    );
  END IF;

  -- Extract updated_at from updates (if present)
  v_new_updated_at = (p_updates->>'updated_at')::TIMESTAMPTZ;

  -- Optimistic locking check
  IF v_current_version != p_expected_version THEN
    -- Version mismatch - conflict detected
    -- Apply last-write-wins: compare updated_at timestamps
    IF v_new_updated_at IS NOT NULL AND v_new_updated_at > v_current_updated_at THEN
      -- New update is more recent - accept it (increment version)
      UPDATE sources
      SET
        name = COALESCE((p_updates->>'name')::VARCHAR, name),
        status = COALESCE((p_updates->>'status')::VARCHAR, status),
        config = COALESCE((p_updates->'config')::JSONB, config),
        field_mappings = COALESCE((p_updates->'field_mappings')::JSONB, field_mappings),
        auto_sync = COALESCE((p_updates->>'auto_sync')::BOOLEAN, auto_sync),
        sync_interval = COALESCE((p_updates->>'sync_interval')::INTEGER, sync_interval),
        metadata = COALESCE((p_updates->'metadata')::JSONB, metadata),
        version = version + 1,
        updated_at = v_new_updated_at
      WHERE id = p_source_id;

      RETURN jsonb_build_object(
        'success', true,
        'current_version', v_current_version + 1,
        'conflict', true,
        'resolution', 'last_write_wins_accepted'
      );
    ELSE
      -- Current version is more recent - reject update
      RETURN jsonb_build_object(
        'success', false,
        'current_version', v_current_version,
        'conflict', true,
        'resolution', 'last_write_wins_rejected',
        'error', 'stale_update'
      );
    END IF;
  ELSE
    -- No conflict - simple update with version increment
    UPDATE sources
    SET
      name = COALESCE((p_updates->>'name')::VARCHAR, name),
      status = COALESCE((p_updates->>'status')::VARCHAR, status),
      config = COALESCE((p_updates->'config')::JSONB, config),
      field_mappings = COALESCE((p_updates->'field_mappings')::JSONB, field_mappings),
      auto_sync = COALESCE((p_updates->>'auto_sync')::BOOLEAN, auto_sync),
      sync_interval = COALESCE((p_updates->>'sync_interval')::INTEGER, sync_interval),
      metadata = COALESCE((p_updates->'metadata')::JSONB, metadata),
      version = version + 1,
      updated_at = NOW()
    WHERE id = p_source_id;

    RETURN jsonb_build_object(
      'success', true,
      'current_version', v_current_version + 1,
      'conflict', false
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========== Functions: Sync Queue Processing ==========

/**
 * Function: process_sync_queue_item
 * Process one item from sync queue
 *
 * @param p_queue_id UUID - Queue item ID
 * @returns JSONB - { success: boolean, operation: string, entity_id: uuid }
 */
CREATE OR REPLACE FUNCTION process_sync_queue_item(
  p_queue_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_queue_item RECORD;
  v_result JSONB;
  v_new_source_id UUID;
BEGIN
  -- Get queue item with row lock
  SELECT * INTO v_queue_item
  FROM sync_queue
  WHERE id = p_queue_id AND status = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'queue_item_not_found_or_locked'
    );
  END IF;

  -- Mark as processing
  UPDATE sync_queue
  SET status = 'processing', processed_at = NOW()
  WHERE id = p_queue_id;

  -- Execute operation
  BEGIN
    CASE v_queue_item.operation
      WHEN 'create' THEN
        -- Insert new source
        INSERT INTO sources (
          name, connector_type, user_id, status, config, field_mappings,
          auto_sync, sync_interval, created_by, metadata
        ) VALUES (
          v_queue_item.payload->>'name',
          v_queue_item.payload->>'connectorType',
          v_queue_item.user_id,
          COALESCE(v_queue_item.payload->>'status', 'idle'),
          COALESCE((v_queue_item.payload->'config')::JSONB, '{}'::JSONB),
          COALESCE((v_queue_item.payload->'fieldMappings')::JSONB, '[]'::JSONB),
          COALESCE((v_queue_item.payload->>'autoSync')::BOOLEAN, TRUE),
          COALESCE((v_queue_item.payload->>'syncInterval')::INTEGER, 300000),
          v_queue_item.user_id,
          COALESCE((v_queue_item.payload->'metadata')::JSONB, '{}'::JSONB)
        ) RETURNING id INTO v_new_source_id;

        v_result = jsonb_build_object(
          'success', true,
          'operation', 'create',
          'entity_id', v_new_source_id
        );

      WHEN 'update' THEN
        -- Update existing source (with optimistic locking)
        v_result = resolve_source_conflict(
          v_queue_item.entity_id,
          COALESCE((v_queue_item.payload->>'version')::INTEGER, 1),
          v_queue_item.payload
        );

      WHEN 'delete' THEN
        -- Delete source
        DELETE FROM sources WHERE id = v_queue_item.entity_id;
        v_result = jsonb_build_object(
          'success', true,
          'operation', 'delete',
          'entity_id', v_queue_item.entity_id
        );

      ELSE
        RAISE EXCEPTION 'Unknown operation: %', v_queue_item.operation;
    END CASE;

    -- Mark as success
    UPDATE sync_queue
    SET status = 'success'
    WHERE id = p_queue_id;

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Mark as error and increment retry count
    UPDATE sync_queue
    SET
      status = 'error',
      retry_count = retry_count + 1,
      last_error = SQLERRM,
      next_retry_at = NOW() + (retry_count * INTERVAL '1 minute')  -- Exponential backoff
    WHERE id = p_queue_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- ========== Comments (Documentation) ==========

COMMENT ON TABLE sources IS 'Unified source definitions (Session 129 - Hybrid Storage)';
COMMENT ON COLUMN sources.connector_type IS 'Connector type identifier (office365-mail, gmail, mock)';
COMMENT ON COLUMN sources.config IS 'Source-specific configuration (JSONB)';
COMMENT ON COLUMN sources.field_mappings IS 'Field transformation mappings (FieldMapping[] from Session 128)';
COMMENT ON COLUMN sources.version IS 'Optimistic locking version (incremented on each update)';
COMMENT ON COLUMN sources.checksum IS 'SHA-256 checksum for data integrity verification';

COMMENT ON TABLE sync_history IS 'Synchronization audit trail';
COMMENT ON COLUMN sync_history.duration_ms IS 'Calculated automatically via trigger';

COMMENT ON TABLE sync_queue IS 'Offline operations queue for hybrid sync';

COMMENT ON FUNCTION resolve_source_conflict IS 'Last-write-wins conflict resolution with optimistic locking';
COMMENT ON FUNCTION process_sync_queue_item IS 'Process one queue item (create/update/delete source)';

-- ========== Migration Complete ==========
-- Session 129: Sources Hybrid Storage ✅
