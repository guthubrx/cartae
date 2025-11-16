-- ============================================================================
-- 05-ai-summaries.sql - Schema pour résumés IA
-- ============================================================================
-- Ce script crée:
-- - Table summaries pour stocker les résumés générés par IA
-- - Index pour recherche rapide des résumés d'un item/thread
-- - Fonction pour récupérer résumés hiérarchiques (item + thread)
-- ============================================================================

-- ============================================================================
-- TABLE: summaries
-- ============================================================================
-- Stocke les résumés IA des items (emails, threads, documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS summaries (
  -- ========== Identifiants ==========
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ========== Item résumé ==========
  item_id UUID NOT NULL, -- ID de l'item résumé

  -- ========== Type de résumé ==========
  summary_type VARCHAR(50) NOT NULL CHECK (summary_type IN (
    'extractive',   -- Résumé extractif (phrases clés)
    'abstractive',  -- Résumé génératif (LLM)
    'thread',       -- Résumé de thread email complet
    'bullet_points' -- Liste à puces
  )),

  -- ========== Contenu résumé ==========
  summary_text TEXT NOT NULL, -- Résumé textuel
  summary_length VARCHAR(20) CHECK (summary_length IN ('short', 'medium', 'long')),

  -- ========== Métadonnées ==========
  key_points JSONB, -- Points clés (array de strings)
  topics JSONB, -- Topics détectés (array de strings)
  action_items JSONB, -- Actions extraites (array de strings)

  -- ========== Provenance IA ==========
  model_used VARCHAR(100), -- Modèle utilisé (ex: "gpt-4", "extractive-v1")
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  generation_method VARCHAR(50), -- 'llm', 'extractive', 'hybrid'

  -- ========== Métadonnées thread (si type = 'thread') ==========
  thread_id VARCHAR(255), -- ID du thread source
  thread_item_count INT, -- Nombre d'items dans le thread

  -- ========== Timestamps ==========
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- ========== Contraintes ==========
  -- Un seul résumé par (item_id, summary_type)
  UNIQUE (item_id, summary_type)
);

-- ============================================================================
-- INDEX: Performance optimization
-- ============================================================================

-- Index sur item_id pour récupérer rapidement le résumé d'un item
CREATE INDEX IF NOT EXISTS idx_summaries_item_id
  ON summaries (item_id);

-- Index sur summary_type pour filtrer par type
CREATE INDEX IF NOT EXISTS idx_summaries_type
  ON summaries (summary_type);

-- Index sur thread_id pour résumés de threads
CREATE INDEX IF NOT EXISTS idx_summaries_thread_id
  ON summaries (thread_id)
  WHERE thread_id IS NOT NULL;

-- Index sur created_at pour tri chronologique
CREATE INDEX IF NOT EXISTS idx_summaries_created_at
  ON summaries (created_at DESC);

-- Index GIN sur key_points pour recherche full-text dans points clés
CREATE INDEX IF NOT EXISTS idx_summaries_key_points
  ON summaries
  USING GIN (key_points);

-- Index GIN sur topics pour recherche de topics
CREATE INDEX IF NOT EXISTS idx_summaries_topics
  ON summaries
  USING GIN (topics);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER trigger_summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTION: Récupérer tous les résumés d'un item
-- ============================================================================

CREATE OR REPLACE FUNCTION get_item_summaries(
  item_id_param UUID
)
RETURNS TABLE(
  summary_id UUID,
  summary_type VARCHAR(50),
  summary_text TEXT,
  key_points JSONB,
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS summary_id,
    s.summary_type,
    s.summary_text,
    s.key_points,
    s.confidence,
    s.created_at
  FROM summaries s
  WHERE s.item_id = item_id_param
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FONCTION: Récupérer résumé de thread complet
-- ============================================================================

CREATE OR REPLACE FUNCTION get_thread_summary(
  thread_id_param VARCHAR(255)
)
RETURNS TABLE(
  summary_id UUID,
  summary_text TEXT,
  key_points JSONB,
  action_items JSONB,
  thread_item_count INT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS summary_id,
    s.summary_text,
    s.key_points,
    s.action_items,
    s.thread_item_count,
    s.created_at
  FROM summaries s
  WHERE s.thread_id = thread_id_param
    AND s.summary_type = 'thread'
  ORDER BY s.created_at DESC
  LIMIT 1; -- Le plus récent
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FONCTION: Statistiques résumés
-- ============================================================================

CREATE OR REPLACE FUNCTION get_summaries_stats()
RETURNS TABLE(
  total_summaries BIGINT,
  summaries_by_type JSONB,
  avg_confidence FLOAT,
  models_used JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_summaries,

    -- Répartition par type
    (
      SELECT jsonb_object_agg(summary_type, count)
      FROM (
        SELECT summary_type, COUNT(*) AS count
        FROM summaries
        GROUP BY summary_type
      ) type_counts
    ) AS summaries_by_type,

    AVG(confidence)::FLOAT AS avg_confidence,

    -- Modèles utilisés
    (
      SELECT jsonb_object_agg(model_used, count)
      FROM (
        SELECT model_used, COUNT(*) AS count
        FROM summaries
        WHERE model_used IS NOT NULL
        GROUP BY model_used
      ) model_counts
    ) AS models_used

  FROM summaries;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATISTIQUES: Afficher infos sur la table créée
-- ============================================================================

SELECT
  'summaries' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('summaries')) AS total_size
FROM summaries;

-- Afficher les indexes créés
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'summaries'
ORDER BY indexname;
