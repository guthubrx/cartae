/**
 * Migration 002: Tenant Isolation (Data Isolation per User)
 * Session 88 - Phase 8A
 *
 * Permet à chaque utilisateur d'avoir son propre environnement de données isolé.
 *
 * Creates:
 * - Ajoute user_id à toutes les tables de données
 * - Indexes pour performance des requêtes filtrées par user_id
 * - Row-Level Security policies (optionnel, pour couche de sécurité supplémentaire)
 *
 * Updates:
 * - cartae_items table (add user_id + index)
 * - semantic_embeddings table (add user_id + index)
 * - connections table (already has user_id, add index)
 * - summaries table (already has user_id, add index)
 */

-- ========== Add user_id to cartae_items ==========

-- Add user_id column to cartae_items (nullable initially for existing data)
ALTER TABLE cartae_items
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for fast filtering by user_id
CREATE INDEX IF NOT EXISTS idx_cartae_items_user_id ON cartae_items(user_id);

-- Create composite index for common query pattern (user_id + created_at)
CREATE INDEX IF NOT EXISTS idx_cartae_items_user_created
ON cartae_items(user_id, created_at DESC);

-- ========== Vérifier les autres tables (optionnel - n'existent pas encore) ==========

-- semantic_embeddings: N'existe pas encore dans cette DB (sera créée plus tard)
-- connections: N'existe pas encore dans cette DB (Session 72 pas encore fusionnée)
-- summaries: N'existe pas encore dans cette DB (Session 72 pas encore fusionnée)

-- Ces migrations seront ajoutées quand les tables seront créées

-- ========== Row-Level Security (RLS) - Optionnel mais recommandé ==========

-- Enable Row-Level Security on cartae_items
ALTER TABLE cartae_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own items
CREATE POLICY cartae_items_tenant_isolation ON cartae_items
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Users can only insert their own items
CREATE POLICY cartae_items_tenant_insert ON cartae_items
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Users can only update their own items
CREATE POLICY cartae_items_tenant_update ON cartae_items
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Users can only delete their own items
CREATE POLICY cartae_items_tenant_delete ON cartae_items
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- RLS pour semantic_embeddings, connections, summaries sera ajoutée quand les tables existeront

-- ========== Helper Function: Set Current User Context ==========

-- Cette fonction sera appelée par le middleware Express pour chaque requête
CREATE OR REPLACE FUNCTION set_current_user_id(uid UUID)
RETURNS VOID AS $$
BEGIN
  -- Set session variable pour Row-Level Security
  PERFORM set_config('app.current_user_id', uid::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== Migration Complete ==========

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 002: Tenant Isolation completed successfully';
  RAISE NOTICE '   - Added user_id to cartae_items table';
  RAISE NOTICE '   - Created indexes for user_id on cartae_items';
  RAISE NOTICE '   - Enabled Row-Level Security policies on cartae_items';
  RAISE NOTICE '   - Created set_current_user_id() helper function';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Existing data will have NULL user_id';
  RAISE NOTICE '   - Update existing items manually or assign to super_admin';
  RAISE NOTICE '   - Future inserts MUST include user_id';
  RAISE NOTICE '';
  RAISE NOTICE '📝 NOTE: semantic_embeddings, connections, summaries tables do not exist yet';
  RAISE NOTICE '   - Tenant isolation will be added when these tables are created';
END $$;
