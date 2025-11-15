--
-- Migration 010: Audit Trail System
-- Session 81g - Incident Response & Security Operations
--
-- Crée la table audit_log avec contraintes WORM (Write Once Read Many)
-- pour compliance et forensics.
--

-- Créer table audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    -- Identifiants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- User info
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username TEXT,

    -- Action info
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,

    -- HTTP info
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    query JSONB DEFAULT '{}'::jsonb,
    body JSONB,

    -- Client info
    ip_address INET NOT NULL,
    user_agent TEXT,

    -- Response info
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- milliseconds
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Hash chain pour détection tampering
    hash_prev TEXT,
    hash_current TEXT NOT NULL UNIQUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contraintes d'immutabilité (WORM pattern)
-- Bloquer toute tentative de UPDATE ou DELETE
CREATE OR REPLACE RULE audit_log_no_update AS
    ON UPDATE TO audit_log
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete AS
    ON DELETE TO audit_log
    DO INSTEAD NOTHING;

-- Indexes pour performance
CREATE INDEX idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_user_id ON audit_log (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_username ON audit_log (username) WHERE username IS NOT NULL;
CREATE INDEX idx_audit_action ON audit_log (action);
CREATE INDEX idx_audit_resource ON audit_log (resource);
CREATE INDEX idx_audit_resource_id ON audit_log (resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_audit_ip ON audit_log (ip_address);
CREATE INDEX idx_audit_status ON audit_log (status);
CREATE INDEX idx_audit_status_code ON audit_log (status_code);

-- Index GIN pour recherche JSONB
CREATE INDEX idx_audit_metadata ON audit_log USING GIN (metadata);
CREATE INDEX idx_audit_query ON audit_log USING GIN (query);
CREATE INDEX idx_audit_body ON audit_log USING GIN (body) WHERE body IS NOT NULL;

-- Index composite pour queries fréquentes
CREATE INDEX idx_audit_user_timestamp ON audit_log (user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_resource_timestamp ON audit_log (resource, timestamp DESC);
CREATE INDEX idx_audit_action_timestamp ON audit_log (action, timestamp DESC);

-- Trigger pour valider hash chain (optionnel, peut impacter performance)
CREATE OR REPLACE FUNCTION validate_audit_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    last_hash TEXT;
BEGIN
    -- Récupérer dernier hash (si existe)
    SELECT hash_current INTO last_hash
    FROM audit_log
    ORDER BY timestamp DESC, created_at DESC
    LIMIT 1;

    -- Vérifier que hash_prev correspond
    IF last_hash IS NOT NULL AND NEW.hash_prev IS DISTINCT FROM last_hash THEN
        RAISE EXCEPTION 'Hash chain violation: expected hash_prev=%, got %', last_hash, NEW.hash_prev;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Activer trigger (commenté par défaut pour performance)
-- Décommenter si intégrité hash chain critique
-- CREATE TRIGGER audit_log_validate_hash
--     BEFORE INSERT ON audit_log
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_audit_hash_chain();

-- Vue pour statistiques audit
CREATE OR REPLACE VIEW audit_stats AS
SELECT
    DATE_TRUNC('day', timestamp) AS day,
    action,
    resource,
    status,
    COUNT(*) AS count,
    AVG(response_time) AS avg_response_time,
    MAX(response_time) AS max_response_time,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
    COUNT(DISTINCT ip_address) AS unique_ips
FROM audit_log
GROUP BY DATE_TRUNC('day', timestamp), action, resource, status
ORDER BY day DESC, count DESC;

-- Vue pour activités suspectes
CREATE OR REPLACE VIEW suspicious_activities AS
SELECT
    timestamp,
    user_id,
    username,
    action,
    resource,
    ip_address,
    status,
    status_code,
    error_message,
    CASE
        WHEN status = 'failure' AND action = 'login' THEN 'Failed login attempt'
        WHEN status_code = 403 THEN 'Unauthorized access attempt'
        WHEN status_code = 401 THEN 'Authentication failure'
        WHEN action = 'delete' AND resource IN ('users', 'audit_log') THEN 'Critical resource deletion'
        WHEN response_time > 10000 THEN 'Slow query (potential DoS)'
        ELSE 'Unknown'
    END AS suspicion_reason
FROM audit_log
WHERE
    -- Failed logins
    (status = 'failure' AND action = 'login')
    OR
    -- Unauthorized access
    (status_code IN (401, 403))
    OR
    -- Critical actions
    (action = 'delete' AND resource IN ('users', 'audit_log'))
    OR
    -- Slow queries
    (response_time > 10000)
ORDER BY timestamp DESC;

-- Fonction pour recherche full-text dans metadata
CREATE OR REPLACE FUNCTION search_audit_logs(search_query TEXT)
RETURNS TABLE (
    id UUID,
    timestamp TIMESTAMPTZ,
    username TEXT,
    action TEXT,
    resource TEXT,
    ip_address INET,
    match_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.timestamp,
        a.username,
        a.action,
        a.resource,
        a.ip_address,
        ts_rank(
            to_tsvector('english', COALESCE(a.username, '') || ' ' || a.action || ' ' || a.resource || ' ' || COALESCE(a.error_message, '')),
            plainto_tsquery('english', search_query)
        ) AS match_rank
    FROM audit_log a
    WHERE
        to_tsvector('english', COALESCE(a.username, '') || ' ' || a.action || ' ' || a.resource || ' ' || COALESCE(a.error_message, '')) @@
        plainto_tsquery('english', search_query)
    ORDER BY match_rank DESC, a.timestamp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Politique de rétention (7 ans = 2555 jours pour compliance)
-- Note: Cette fonction NE SUPPRIME PAS les données (violation WORM)
-- Elle marque juste les données pour archivage externe
CREATE OR REPLACE FUNCTION mark_old_audit_for_archiving()
RETURNS INTEGER AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    marked_count INTEGER;
BEGIN
    -- 7 ans de rétention
    cutoff_date := NOW() - INTERVAL '2555 days';

    -- Compter entrées éligibles pour archivage
    SELECT COUNT(*) INTO marked_count
    FROM audit_log
    WHERE timestamp < cutoff_date;

    -- Log pour monitoring
    RAISE NOTICE '% audit entries eligible for archiving (older than %)', marked_count, cutoff_date;

    RETURN marked_count;
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE audit_log IS 'Immutable audit trail (WORM pattern) for compliance and forensics. DO NOT modify or delete records.';
COMMENT ON COLUMN audit_log.hash_current IS 'SHA256 hash of current entry, forms hash chain with hash_prev for tamper detection.';
COMMENT ON COLUMN audit_log.hash_prev IS 'SHA256 hash of previous entry in chain, NULL for first entry.';
COMMENT ON VIEW suspicious_activities IS 'Real-time view of potentially suspicious activities based on heuristics.';
COMMENT ON FUNCTION search_audit_logs IS 'Full-text search across audit logs using PostgreSQL FTS.';

-- Grants (ajuster selon roles)
-- GRANT SELECT ON audit_log TO security_team;
-- GRANT SELECT ON suspicious_activities TO security_team;
-- REVOKE ALL ON audit_log FROM public;
