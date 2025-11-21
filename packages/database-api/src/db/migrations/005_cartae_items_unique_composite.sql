/**
 * Migration 005: Cartae Items Unique Composite Index
 * Correction Migration 004 - Index composite au lieu d'index partiels
 *
 * Problème:
 * - PostgreSQL ne supporte PAS WHERE dans ON CONFLICT pour index partiels
 * - Migration 004 créait des index partiels inutilisables
 *
 * Solution:
 * - 1 seul index UNIQUE composite: (connector, sourceId, user_id)
 * - Pas de WHERE - clé composite suffit pour unicité
 */

-- ========== Supprimer index partiels Migration 004 ==========

DROP INDEX IF EXISTS idx_cartae_items_planner_unique;
DROP INDEX IF EXISTS idx_cartae_items_office365_mail_unique;
DROP INDEX IF EXISTS idx_cartae_items_teams_unique;

-- ========== Créer index UNIQUE composite ==========

CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_connector_source_user_unique
ON cartae_items (
  (source->>'connector'),
  (source->>'sourceId'),
  user_id
);

COMMENT ON INDEX idx_cartae_items_connector_source_user_unique IS
'Unique constraint composite (connector + sourceId + user_id) pour ON CONFLICT';

-- ========== Vérification ==========

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 005: Index UNIQUE composite créé';
  RAISE NOTICE '   - idx_cartae_items_connector_source_user_unique';
  RAISE NOTICE '   - Clé: (connector, sourceId, user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques cartae_items :';
END $$;

SELECT
  (source->>'connector') AS connector,
  COUNT(*) AS total_items,
  COUNT(DISTINCT ((source->>'connector'), (source->>'sourceId'), user_id)) AS unique_items
FROM cartae_items
WHERE source->>'connector' IN ('planner', 'office365-mail-simple', 'teams')
GROUP BY source->>'connector'
ORDER BY total_items DESC;

-- ========== Migration Complete ==========
