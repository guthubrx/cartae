/**
 * Migration 004 Rollback: Cartae Items Unique Constraints
 *
 * Supprime les index UNIQUE partiels créés pour ON CONFLICT
 */

-- Supprimer les index UNIQUE
DROP INDEX IF EXISTS idx_cartae_items_planner_unique;
DROP INDEX IF EXISTS idx_cartae_items_office365_mail_unique;
DROP INDEX IF EXISTS idx_cartae_items_teams_unique;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004 rollback: Index UNIQUE supprimés';
END $$;
