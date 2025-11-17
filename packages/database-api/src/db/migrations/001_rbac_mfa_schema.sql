/**
 * Migration 001: RBAC + MFA Schema
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Creates:
 * - roles (6 default roles with permissions matrix)
 * - permissions (granular resource:action permissions)
 * - role_permissions (many-to-many)
 * - user_roles (many-to-many users ↔ roles)
 * - audit_logs (compliance logging with diffs)
 * - sessions (MFA session management)
 *
 * Updates:
 * - users table (MFA fields, SSO fields)
 */

-- ========== Enable Required Extensions ==========

-- pgcrypto for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== Create Users Table (if not exists) ==========

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== Update Users Table (MFA + SSO) ==========

-- Add MFA columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes JSONB;

-- Add SSO columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_external_id VARCHAR(255);

-- Add status/tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Update timestamps if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_sso ON users(sso_provider, sso_external_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- ========== Roles Table ==========

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,  -- System roles cannot be deleted/modified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create 6 default roles
INSERT INTO roles (name, description, is_system) VALUES
  ('super_admin', 'Full system access (manage users, settings, billing)', TRUE),
  ('admin', 'Administration access (manage users, no system config)', TRUE),
  ('manager', 'Manage items + exports + reports (no user management)', TRUE),
  ('editor', 'Create/modify items (no exports)', TRUE),
  ('viewer', 'Read-only access (no modifications)', TRUE),
  ('analyst', 'Read + exports/reports (no item modifications)', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ========== Permissions Table ==========

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(50) NOT NULL,  -- items, users, settings, reports, exports, billing
  action VARCHAR(20) NOT NULL,    -- create, read, update, delete, export, manage
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Insert default permissions
INSERT INTO permissions (resource, action, description) VALUES
  -- Items permissions
  ('items', 'create', 'Create new items'),
  ('items', 'read', 'View items'),
  ('items', 'update', 'Modify items'),
  ('items', 'delete', 'Delete items'),
  ('items', 'export', 'Export items (CSV/JSON)'),

  -- Users permissions
  ('users', 'create', 'Create users'),
  ('users', 'read', 'View users'),
  ('users', 'update', 'Modify users'),
  ('users', 'delete', 'Delete users'),
  ('users', 'manage', 'Manage roles/permissions'),

  -- Settings permissions
  ('settings', 'read', 'View system settings'),
  ('settings', 'update', 'Modify system settings'),

  -- Reports permissions
  ('reports', 'create', 'Create reports'),
  ('reports', 'read', 'View reports'),

  -- Billing permissions
  ('billing', 'read', 'View billing info'),
  ('billing', 'manage', 'Manage billing/subscription')
ON CONFLICT (resource, action) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- ========== Role Permissions (Many-to-Many) ==========

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ========== Assign Permissions to Roles (Permission Matrix) ==========

-- Helper function to assign permission
CREATE OR REPLACE FUNCTION assign_permission(role_name VARCHAR, res VARCHAR, act VARCHAR)
RETURNS VOID AS $$
BEGIN
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.name = role_name AND p.resource = res AND p.action = act
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Super Admin: ALL permissions
DO $$
DECLARE
  perm RECORD;
BEGIN
  FOR perm IN SELECT resource, action FROM permissions LOOP
    PERFORM assign_permission('super_admin', perm.resource, perm.action);
  END LOOP;
END $$;

-- Admin: items.*, users.*, settings.read, reports.*
SELECT assign_permission('admin', 'items', 'create');
SELECT assign_permission('admin', 'items', 'read');
SELECT assign_permission('admin', 'items', 'update');
SELECT assign_permission('admin', 'items', 'delete');
SELECT assign_permission('admin', 'items', 'export');
SELECT assign_permission('admin', 'users', 'create');
SELECT assign_permission('admin', 'users', 'read');
SELECT assign_permission('admin', 'users', 'update');
SELECT assign_permission('admin', 'users', 'delete');
SELECT assign_permission('admin', 'users', 'manage');
SELECT assign_permission('admin', 'settings', 'read');
SELECT assign_permission('admin', 'reports', 'create');
SELECT assign_permission('admin', 'reports', 'read');

-- Manager: items.*, reports.*, items.export
SELECT assign_permission('manager', 'items', 'create');
SELECT assign_permission('manager', 'items', 'read');
SELECT assign_permission('manager', 'items', 'update');
SELECT assign_permission('manager', 'items', 'delete');
SELECT assign_permission('manager', 'items', 'export');
SELECT assign_permission('manager', 'reports', 'create');
SELECT assign_permission('manager', 'reports', 'read');

-- Editor: items.create/read/update
SELECT assign_permission('editor', 'items', 'create');
SELECT assign_permission('editor', 'items', 'read');
SELECT assign_permission('editor', 'items', 'update');

-- Viewer: items.read, reports.read
SELECT assign_permission('viewer', 'items', 'read');
SELECT assign_permission('viewer', 'reports', 'read');

-- Analyst: items.read, reports.*, items.export
SELECT assign_permission('analyst', 'items', 'read');
SELECT assign_permission('analyst', 'items', 'export');
SELECT assign_permission('analyst', 'reports', 'create');
SELECT assign_permission('analyst', 'reports', 'read');

-- Drop helper function
DROP FUNCTION assign_permission;

-- ========== User Roles (Many-to-Many) ==========

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),  -- Who assigned this role
  PRIMARY KEY (user_id, role_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- ========== Audit Logs (Compliance) ==========

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Who
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),  -- Denormalized (preserved if user deleted)

  -- What
  resource VARCHAR(50) NOT NULL,  -- items, users, settings
  action VARCHAR(20) NOT NULL,    -- create, update, delete, access_denied
  resource_id UUID,               -- ID of modified resource

  -- Changes (JSON diff)
  old_values JSONB,  -- State before modification
  new_values JSONB,  -- State after modification

  -- Context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast searches
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ========== Sessions (MFA Session Management) ==========

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,  -- SHA-256 hash of JWT token

  -- MFA tracking
  mfa_verified BOOLEAN DEFAULT FALSE,
  mfa_verified_at TIMESTAMPTZ,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ========== Auto-Update Timestamps ==========

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== Helper Views (Performance) ==========

-- View: User with roles and permissions
CREATE OR REPLACE VIEW user_permissions AS
SELECT
  u.id AS user_id,
  u.email,
  ARRAY_AGG(DISTINCT r.name) AS roles,
  ARRAY_AGG(DISTINCT (p.resource || ':' || p.action)) AS permissions
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY u.id, u.email;

-- ========== Cleanup Old Sessions (Function) ==========

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========== Migration Complete ==========

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 001: RBAC + MFA Schema completed successfully';
  RAISE NOTICE '   - Created 6 roles (super_admin, admin, manager, editor, viewer, analyst)';
  RAISE NOTICE '   - Created 17 permissions (items, users, settings, reports, billing)';
  RAISE NOTICE '   - Assigned permission matrix to roles';
  RAISE NOTICE '   - Created audit_logs table for compliance';
  RAISE NOTICE '   - Created sessions table for MFA';
  RAISE NOTICE '   - Added MFA/SSO fields to users table';
END $$;
