/**
 * Migration 005 Rollback: Cartae Items Unique Composite Index
 */

-- Supprimer index composite
DROP INDEX IF EXISTS idx_cartae_items_connector_source_user_unique;

-- Recréer les index partiels de Migration 004
CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_planner_unique
ON cartae_items ((source->>'sourceId'), user_id)
WHERE (source->>'connector') = 'planner';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_office365_mail_unique
ON cartae_items ((source->>'sourceId'), user_id)
WHERE (source->>'connector') = 'office365-mail-simple';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_teams_unique
ON cartae_items ((source->>'sourceId'), user_id)
WHERE (source->>'connector') = 'teams';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 005 rollback: Index composite supprimé, index partiels restaurés';
END $$;
