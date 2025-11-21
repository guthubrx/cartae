/**
 * Migration 003 Rollback: Sources Hybrid Storage
 * Session 129 - Persistance Hybride IndexedDB + PostgreSQL
 *
 * Reverses all changes from 003_sources_hybrid_storage.sql
 */

-- ========== Drop Functions ==========

DROP FUNCTION IF EXISTS process_sync_queue_item(UUID);
DROP FUNCTION IF EXISTS resolve_source_conflict(UUID, INTEGER, JSONB);
DROP FUNCTION IF EXISTS calculate_sync_duration();
DROP FUNCTION IF EXISTS update_sources_updated_at();

-- ========== Drop Tables (CASCADE to drop dependent objects) ==========

DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS sync_history CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

-- ========== Migration Rollback Complete ==========
-- Session 129: Sources Hybrid Storage removed ✅
