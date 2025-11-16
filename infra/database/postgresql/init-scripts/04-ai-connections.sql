-- ============================================================================
-- 04-ai-connections.sql - Schema pour connexions sémantiques IA
-- ============================================================================
-- Ce script crée:
-- - Table connections pour stocker les connexions détectées par IA
-- - Index pour recherche rapide des connexions d'un item
-- - Fonction pour récupérer le graph de connexions
-- ============================================================================

-- ============================================================================
-- TABLE: connections
-- ============================================================================
-- Stocke les connexions sémantiques détectées entre items
-- Une connexion est créée par l'IA en analysant similarité vectorielle + autres critères
-- ============================================================================

CREATE TABLE IF NOT EXISTS connections (
  -- ========== Identifiants ==========
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ========== Items connectés ==========
  source_id UUID NOT NULL, -- ID de l'item source
  target_id UUID NOT NULL, -- ID de l'item cible

  -- ========== Métadonnées connexion ==========
  connection_type VARCHAR(50) NOT NULL DEFAULT 'semantic', -- Type: semantic, temporal, manual

  -- ========== Scores ==========
  overall_score FLOAT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
  vector_similarity FLOAT CHECK (vector_similarity >= 0 AND vector_similarity <= 1),
  temporal_similarity FLOAT CHECK (temporal_similarity >= 0 AND temporal_similarity <= 1),
  sentiment_alignment FLOAT CHECK (sentiment_alignment >= 0 AND sentiment_alignment <= 1),
  priority_alignment FLOAT CHECK (priority_alignment >= 0 AND priority_alignment <= 1),
  shared_participants FLOAT CHECK (shared_participants >= 0 AND shared_participants <= 1),
  shared_tags FLOAT CHECK (shared_tags >= 0 AND shared_tags <= 1),

  -- ========== Métadonnées ==========
  reason TEXT, -- Raison humainement lisible
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1), -- Confiance de l'IA
  created_by VARCHAR(20) NOT NULL DEFAULT 'ai' CHECK (created_by IN ('ai', 'user', 'system')),

  -- ========== Bidirectionalité ==========
  bidirectional BOOLEAN NOT NULL DEFAULT true,

  -- ========== Timestamps ==========
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- ========== Contraintes ==========
  -- Pas de self-connexion
  CHECK (source_id != target_id),

  -- Pas de doublon (source, target) unique
  UNIQUE (source_id, target_id)
);

-- ============================================================================
-- INDEX: Performance optimization
-- ============================================================================

-- Index sur source_id pour récupérer rapidement les connexions d'un item
CREATE INDEX IF NOT EXISTS idx_connections_source_id
  ON connections (source_id);

-- Index sur target_id pour recherche inverse
CREATE INDEX IF NOT EXISTS idx_connections_target_id
  ON connections (target_id);

-- Index composite pour recherche bidirectionnelle
CREATE INDEX IF NOT EXISTS idx_connections_bidirectional
  ON connections (source_id, target_id)
  WHERE bidirectional = true;

-- Index sur overall_score pour filtrer par qualité
CREATE INDEX IF NOT EXISTS idx_connections_score
  ON connections (overall_score DESC);

-- Index sur created_at pour tri chronologique
CREATE INDEX IF NOT EXISTS idx_connections_created_at
  ON connections (created_at DESC);

-- Index sur connection_type pour filtrer par type
CREATE INDEX IF NOT EXISTS idx_connections_type
  ON connections (connection_type);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER trigger_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTION: Récupérer toutes les connexions d'un item (bidirectionnelles)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_item_connections(
  item_id UUID,
  min_score FLOAT DEFAULT 0.0,
  result_limit INT DEFAULT 50
)
RETURNS TABLE(
  connection_id UUID,
  connected_item_id UUID,
  direction VARCHAR(10), -- 'outgoing' ou 'incoming'
  overall_score FLOAT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  -- Connexions sortantes (source = item_id)
  SELECT
    c.id AS connection_id,
    c.target_id AS connected_item_id,
    'outgoing'::VARCHAR(10) AS direction,
    c.overall_score,
    c.reason,
    c.created_at
  FROM connections c
  WHERE c.source_id = item_id
    AND c.overall_score >= min_score

  UNION ALL

  -- Connexions entrantes (target = item_id) si bidirectionnelles
  SELECT
    c.id AS connection_id,
    c.source_id AS connected_item_id,
    'incoming'::VARCHAR(10) AS direction,
    c.overall_score,
    c.reason,
    c.created_at
  FROM connections c
  WHERE c.target_id = item_id
    AND c.bidirectional = true
    AND c.overall_score >= min_score

  ORDER BY overall_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FONCTION: Récupérer le graphe de connexions (pour viz)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_connections_graph(
  center_item_id UUID,
  depth INT DEFAULT 1,
  min_score FLOAT DEFAULT 0.6
)
RETURNS TABLE(
  source_id UUID,
  target_id UUID,
  overall_score FLOAT,
  reason TEXT,
  level INT -- Niveau de profondeur (1 = direct, 2 = connexion de connexion, etc.)
) AS $$
BEGIN
  -- Récupère les connexions jusqu'à une certaine profondeur
  -- Pour visualisation graph (nodes + edges)

  -- Pour l'instant, juste niveau 1 (direct connections)
  -- TODO: Implémenter récursion pour niveaux > 1

  RETURN QUERY
  SELECT
    c.source_id,
    c.target_id,
    c.overall_score,
    c.reason,
    1 AS level
  FROM connections c
  WHERE (c.source_id = center_item_id OR (c.target_id = center_item_id AND c.bidirectional = true))
    AND c.overall_score >= min_score
  ORDER BY c.overall_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FONCTION: Statistiques connexions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_connections_stats()
RETURNS TABLE(
  total_connections BIGINT,
  avg_score FLOAT,
  connections_by_type JSONB,
  top_connected_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_connections,
    AVG(overall_score)::FLOAT AS avg_score,

    -- Répartition par type
    jsonb_object_agg(
      connection_type,
      count
    ) AS connections_by_type,

    -- Top 10 items les plus connectés
    (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          source_id AS item_id,
          COUNT(*) AS connection_count
        FROM connections
        GROUP BY source_id
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) t
    ) AS top_connected_items

  FROM (
    SELECT
      connection_type,
      COUNT(*) AS count
    FROM connections
    GROUP BY connection_type
  ) type_counts;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATISTIQUES: Afficher infos sur la table créée
-- ============================================================================

SELECT
  'connections' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('connections')) AS total_size
FROM connections;

-- Afficher les indexes créés
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'connections'
ORDER BY indexname;
