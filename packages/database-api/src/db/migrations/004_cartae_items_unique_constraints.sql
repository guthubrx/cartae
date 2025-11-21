/**
 * Migration 004: Cartae Items Unique Constraints
 * Bugfix - Ajoute les contraintes UNIQUE manquantes pour ON CONFLICT
 *
 * Problème:
 * - Les routes planner.ts, office365.ts, teams.ts utilisent ON CONFLICT
 * - Mais il n'y a pas d'index UNIQUE correspondant
 * - Erreur: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
 *
 * Solution:
 * - Créer des index UNIQUE partiels par connecteur
 * - Format: (source->>'sourceId', user_id) WHERE source->>'connector' = 'xxx'
 */

-- ========== Index UNIQUE pour Planner ==========

-- Éviter les doublons pour tâches Planner
CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_planner_unique
ON cartae_items ((source->>'sourceId'), user_id)
WHERE (source->>'connector') = 'planner';

COMMENT ON INDEX idx_cartae_items_planner_unique IS
'Unique constraint pour éviter doublons tâches Planner (support ON CONFLICT)';

-- ========== Index UNIQUE pour Office365 Mail ==========

-- Éviter les doublons pour emails Office365
CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_office365_mail_unique
ON cartae_items ((source->>'sourceId'), user_id)
WHERE (source->>'connector') = 'office365-mail-simple';

COMMENT ON INDEX idx_cartae_items_office365_mail_unique IS
'Unique constraint pour éviter doublons emails Office365 (support ON CONFLICT)';

-- ========== Index UNIQUE pour Teams (optionnel - pas encore utilisé) ==========

-- Éviter les doublons pour chats Teams (si ON CONFLICT ajouté plus tard)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cartae_items_teams_unique
ON cartae_items ((source->>'sourceId'), user_id)
WHERE (source->>'connector') = 'teams';

COMMENT ON INDEX idx_cartae_items_teams_unique IS
'Unique constraint pour éviter doublons chats Teams (support ON CONFLICT)';

-- ========== Vérification ==========

-- Lister les index créés
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004: Unique constraints créés';
  RAISE NOTICE '   - idx_cartae_items_planner_unique (planner)';
  RAISE NOTICE '   - idx_cartae_items_office365_mail_unique (office365)';
  RAISE NOTICE '   - idx_cartae_items_teams_unique (teams)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques cartae_items :';
END $$;

SELECT
  (source->>'connector') AS connector,
  COUNT(*) AS total_items,
  COUNT(DISTINCT (source->>'sourceId', user_id)) AS unique_items
FROM cartae_items
WHERE source->>'connector' IN ('planner', 'office365-mail-simple', 'teams')
GROUP BY source->>'connector'
ORDER BY total_items DESC;

-- ========== Migration Complete ==========
