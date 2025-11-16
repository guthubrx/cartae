/**
 * Rollback Migration 001: RBAC + MFA Schema
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Removes all tables/columns created in 001_rbac_mfa_schema.sql
 */

-- ========== Drop Views ==========

DROP VIEW IF EXISTS user_permissions;

-- ========== Drop Functions ==========

DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========== Drop Tables (Reverse Order) ==========

DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ========== Revert Users Table Changes ==========

ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret;
ALTER TABLE users DROP COLUMN IF EXISTS backup_codes;
ALTER TABLE users DROP COLUMN IF EXISTS sso_provider;
ALTER TABLE users DROP COLUMN IF EXISTS sso_external_id;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS last_login;

-- Don't drop created_at/updated_at if they existed before migration

-- ========== Drop Indexes ==========

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_sso;
DROP INDEX IF EXISTS idx_users_active;

-- ========== Rollback Complete ==========

DO $$
BEGIN
  RAISE NOTICE '✅ Rollback Migration 001: RBAC + MFA Schema completed successfully';
  RAISE NOTICE '   - Removed all RBAC tables (roles, permissions, role_permissions, user_roles)';
  RAISE NOTICE '   - Removed audit_logs table';
  RAISE NOTICE '   - Removed sessions table';
  RAISE NOTICE '   - Removed MFA/SSO columns from users table';
END $$;
