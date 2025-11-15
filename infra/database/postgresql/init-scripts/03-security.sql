-- ============================================================================
-- 03-security.sql - Security Layer Schema (Session 80)
-- ============================================================================
-- Ce script crée:
-- - Table users (authentification)
-- - Table role_permissions (RBAC matrix)
-- - Table audit_logs (logging opérations sensibles)
-- - Table jwt_blacklist (tokens révoqués)
-- - Table plugin_permissions (isolation plugins)
-- - Table user_plugin_permissions (permissions granted par user)
-- - Functions & Triggers pour audit automatique
-- ============================================================================

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Stocke les utilisateurs Cartae avec authentification
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  -- ========== Identifiants ==========
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ========== Authentification ==========
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hash

  -- ========== RBAC Role ==========
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN (
    'admin',       -- Tous pouvoirs (user management, vault admin, plugin management)
    'power_user',  -- Pouvoirs étendus (plugin install, vault read/write, advanced features)
    'user',        -- Utilisateur standard (read/write data, basic features)
    'guest'        -- Lecture seule (read-only, no modifications)
  )),

  -- ========== Timestamps ==========
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,

  -- ========== Status ==========
  active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false
);

-- Index pour recherche rapide par email (login)
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

-- Index pour recherche par role (admin queries)
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);

-- Index pour tri par dernière connexion
CREATE INDEX IF NOT EXISTS idx_users_last_login
  ON users (last_login DESC NULLS LAST);

-- ============================================================================
-- TABLE: role_permissions
-- ============================================================================
-- Matrice RBAC: définit les permissions de chaque role
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,

  -- Permissions granulaires (50+ permissions):
  -- Database: database.read, database.write, database.delete
  -- Vault: vault.read, vault.write, vault.admin, vault.secrets.*
  -- Plugins: plugin.install, plugin.uninstall, plugin.configure, plugin.view
  -- Users: user.create, user.delete, user.assign_role, user.view
  -- System: system.settings, system.backup, system.logs

  PRIMARY KEY (role, permission)
);

-- Index pour lookup rapide "user has permission?"
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
  ON role_permissions (permission);

-- ============================================================================
-- TABLE: audit_logs
-- ============================================================================
-- Log toutes les opérations sensibles pour compliance & sécurité
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  -- ========== Identifiants ==========
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ========== User & Action ==========
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Peut être NULL si user supprimé
  action VARCHAR(100) NOT NULL, -- Ex: "login", "vault.read_secret", "user.assign_role"

  -- ========== Resource ==========
  resource_type VARCHAR(50), -- Ex: "secret", "user", "plugin"
  resource_id VARCHAR(255),  -- Ex: "secret/database/postgres", "user-123", "plugin-gmail"

  -- ========== Context ==========
  ip_address INET, -- Adresse IP de la requête
  user_agent TEXT, -- User-Agent HTTP
  metadata JSONB DEFAULT '{}', -- Contexte additionnel (old_value, new_value, etc.)

  -- ========== Result ==========
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT, -- Si success=false, détail de l'erreur

  -- ========== Timestamp ==========
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index composite pour filtres fréquents (user + date)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs (user_id, created_at DESC);

-- Index sur action pour recherche par type d'action
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action);

-- Index sur resource pour recherche "qui a accédé à ce secret?"
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs (resource_type, resource_id);

-- Index sur created_at pour purge automatique (retention 90 jours)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- ============================================================================
-- TABLE: jwt_blacklist
-- ============================================================================
-- Stocke les JWT tokens révoqués (logout, compromised tokens)
-- ============================================================================

CREATE TABLE IF NOT EXISTS jwt_blacklist (
  -- JWT ID (jti claim)
  token_jti VARCHAR(255) PRIMARY KEY,

  -- Expiration du token (pour auto-cleanup)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- User qui possédait ce token
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Raison de révocation
  reason VARCHAR(100), -- Ex: "logout", "password_changed", "compromised"

  -- Timestamp
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index sur expires_at pour cleanup automatique
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires
  ON jwt_blacklist (expires_at);

-- ============================================================================
-- TABLE: plugin_permissions
-- ============================================================================
-- Définit les permissions requises par chaque plugin (manifest)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_permissions (
  plugin_id VARCHAR(100) NOT NULL, -- Ex: "@cartae/gmail-plugin"
  permission VARCHAR(100) NOT NULL, -- Ex: "storage.email.read", "network.gmail.com"

  -- Type de permission
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'storage',  -- Accès storage (ex: storage.email.read)
    'network',  -- Accès réseau (ex: network.gmail.com)
    'vault',    -- Accès Vault (ex: vault.secrets.gmail.*)
    'system'    -- Accès système (ex: system.notifications)
  )),

  -- Raison de la permission (pour UI)
  description TEXT,

  PRIMARY KEY (plugin_id, permission)
);

-- Index sur plugin pour lookup rapide
CREATE INDEX IF NOT EXISTS idx_plugin_permissions_plugin
  ON plugin_permissions (plugin_id);

-- ============================================================================
-- TABLE: user_plugin_permissions
-- ============================================================================
-- Permissions granted par user pour chaque plugin (user consent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_plugin_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_id VARCHAR(100) NOT NULL,
  permission VARCHAR(100) NOT NULL,

  -- Status
  granted BOOLEAN NOT NULL DEFAULT true,

  -- Audit trail
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin qui a grant (ou user lui-même)
  revoked_at TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY (user_id, plugin_id, permission),

  -- Foreign key vers plugin_permissions
  FOREIGN KEY (plugin_id, permission)
    REFERENCES plugin_permissions (plugin_id, permission)
    ON DELETE CASCADE
);

-- Index composite pour lookup rapide "user can access permission?"
CREATE INDEX IF NOT EXISTS idx_user_plugin_permissions_lookup
  ON user_plugin_permissions (user_id, plugin_id, permission)
  WHERE granted = true;

-- ============================================================================
-- TABLE: plugin_quotas
-- ============================================================================
-- Quotas enforcement pour chaque plugin par user
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_quotas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_id VARCHAR(100) NOT NULL,

  -- Quotas
  storage_mb DECIMAL(10,2) NOT NULL DEFAULT 0, -- Storage utilisé en MB
  api_calls_hour INTEGER NOT NULL DEFAULT 0,   -- API calls dernière heure

  -- Limites (depuis manifest plugin)
  max_storage_mb DECIMAL(10,2) NOT NULL DEFAULT 100,
  max_api_calls_hour INTEGER NOT NULL DEFAULT 100,

  -- Timestamps
  last_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, plugin_id)
);

-- Index pour cleanup quotas (reset toutes les heures)
CREATE INDEX IF NOT EXISTS idx_plugin_quotas_last_reset
  ON plugin_quotas (last_reset);

-- ============================================================================
-- TRIGGER: Auto-update users.updated_at
-- ============================================================================

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Log audit automatique pour users table
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_users_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log création user
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      NEW.id,
      'user.created',
      'user',
      NEW.id::TEXT,
      jsonb_build_object('email', NEW.email, 'role', NEW.role)
    );
    RETURN NEW;
  END IF;

  -- Log modification role
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      NEW.id,
      'user.role_changed',
      'user',
      NEW.id::TEXT,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  END IF;

  -- Log désactivation user
  IF TG_OP = 'UPDATE' AND OLD.active = true AND NEW.active = false THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      NEW.id,
      'user.deactivated',
      'user',
      NEW.id::TEXT,
      jsonb_build_object('email', NEW.email)
    );
  END IF;

  -- Log suppression user
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      OLD.id,
      'user.deleted',
      'user',
      OLD.id::TEXT,
      jsonb_build_object('email', OLD.email, 'role', OLD.role)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION audit_users_changes();

-- ============================================================================
-- FUNCTION: Cleanup JWT blacklist (tokens expirés)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_jwt_blacklist()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM jwt_blacklist
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Cleanup audit logs (retention 90 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Reset plugin quotas (API calls/hour)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_plugin_quotas_hourly()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE plugin_quotas
  SET
    api_calls_hour = 0,
    last_reset = NOW()
  WHERE last_reset < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FONCTION: Check user permission (RBAC helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
  has_perm BOOLEAN;
BEGIN
  -- Récupérer role du user
  SELECT role INTO user_role
  FROM users
  WHERE id = p_user_id AND active = true;

  -- Si user n'existe pas ou inactif
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check si le role a la permission
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions
    WHERE role = user_role AND permission = p_permission
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED: Permissions par défaut pour chaque role
-- ============================================================================

-- Role: admin (tous pouvoirs)
INSERT INTO role_permissions (role, permission) VALUES
  -- Database permissions
  ('admin', 'database.read'),
  ('admin', 'database.write'),
  ('admin', 'database.delete'),
  ('admin', 'database.admin'),

  -- Vault permissions
  ('admin', 'vault.read'),
  ('admin', 'vault.write'),
  ('admin', 'vault.delete'),
  ('admin', 'vault.admin'),
  ('admin', 'vault.secrets.*'),

  -- Plugin permissions
  ('admin', 'plugin.install'),
  ('admin', 'plugin.uninstall'),
  ('admin', 'plugin.configure'),
  ('admin', 'plugin.view'),
  ('admin', 'plugin.permissions.grant'),
  ('admin', 'plugin.permissions.revoke'),

  -- User management
  ('admin', 'user.create'),
  ('admin', 'user.delete'),
  ('admin', 'user.assign_role'),
  ('admin', 'user.view'),
  ('admin', 'user.deactivate'),

  -- System permissions
  ('admin', 'system.settings'),
  ('admin', 'system.backup'),
  ('admin', 'system.restore'),
  ('admin', 'system.logs'),
  ('admin', 'system.monitoring')
ON CONFLICT (role, permission) DO NOTHING;

-- Role: power_user (pouvoirs étendus)
INSERT INTO role_permissions (role, permission) VALUES
  -- Database permissions
  ('power_user', 'database.read'),
  ('power_user', 'database.write'),

  -- Vault permissions (lecture + écriture, pas admin)
  ('power_user', 'vault.read'),
  ('power_user', 'vault.write'),

  -- Plugin permissions
  ('power_user', 'plugin.install'),
  ('power_user', 'plugin.uninstall'),
  ('power_user', 'plugin.configure'),
  ('power_user', 'plugin.view'),

  -- User permissions (read-only)
  ('power_user', 'user.view'),

  -- System permissions (monitoring)
  ('power_user', 'system.logs'),
  ('power_user', 'system.monitoring')
ON CONFLICT (role, permission) DO NOTHING;

-- Role: user (utilisateur standard)
INSERT INTO role_permissions (role, permission) VALUES
  -- Database permissions (read + write)
  ('user', 'database.read'),
  ('user', 'database.write'),

  -- Vault permissions (lecture seule)
  ('user', 'vault.read'),

  -- Plugin permissions (view + configure uniquement)
  ('user', 'plugin.view'),
  ('user', 'plugin.configure')
ON CONFLICT (role, permission) DO NOTHING;

-- Role: guest (lecture seule)
INSERT INTO role_permissions (role, permission) VALUES
  -- Database permissions (read-only)
  ('guest', 'database.read'),

  -- Plugin permissions (view uniquement)
  ('guest', 'plugin.view')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================================================
-- SEED: Admin user par défaut (password: changeme123)
-- ============================================================================
-- bcrypt hash de "changeme123" (cost 10)
-- IMPORTANT: Changer ce password en production!
-- ============================================================================

INSERT INTO users (email, password_hash, role, email_verified, active)
VALUES (
  'admin@cartae.dev',
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', -- "changeme123"
  'admin',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- STATISTIQUES: Afficher infos sur les tables créées
-- ============================================================================

SELECT
  'users' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('users')) AS total_size
FROM users;

SELECT
  'role_permissions' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('role_permissions')) AS total_size
FROM role_permissions;

SELECT
  'audit_logs' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('audit_logs')) AS total_size
FROM audit_logs;

-- Afficher les permissions par role
SELECT
  role,
  COUNT(*) AS permission_count,
  array_agg(permission ORDER BY permission) AS permissions
FROM role_permissions
GROUP BY role
ORDER BY role;
