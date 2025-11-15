-- ============================================================================
-- 02-schema.sql - Schema principal Cartae Database
-- ============================================================================
-- Ce script crée:
-- - Table cartae_items avec tous les champs CartaeItem
-- - Champs vectoriels pour embeddings (dimension 1536 pour OpenAI)
-- - Index HNSW pour recherche vectorielle ultra-rapide (100k+ items)
-- - Index full-text pour recherche textuelle
-- - Index sur tags, type, source pour filtres rapides
-- ============================================================================

-- ============================================================================
-- TABLE: cartae_items
-- ============================================================================
-- Stocke tous les items Cartae (emails, tasks, docs, messages, events, notes)
-- Format universel compatible avec le type TypeScript CartaeItem
-- ============================================================================

CREATE TABLE IF NOT EXISTS cartae_items (
  -- ========== Identifiants ==========
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ========== Champs principaux ==========
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'email', 'task', 'document', 'message', 'event', 'note', 'contact', 'file'
  )),
  title VARCHAR(500) NOT NULL,
  content TEXT,

  -- ========== JSON-LD fields (W3C compatibility) ==========
  context JSONB, -- @context field
  json_type JSONB, -- @type field

  -- ========== Métadonnées enrichies ==========
  -- Stocke tout: author, participants, priority, status, dates, AI insights, etc.
  metadata JSONB NOT NULL DEFAULT '{}',

  -- ========== Relations avec autres items ==========
  relationships JSONB DEFAULT '[]', -- Array de CartaeRelationship

  -- ========== Tags & Catégories ==========
  tags TEXT[] NOT NULL DEFAULT '{}', -- Array PostgreSQL pour filtres rapides
  categories TEXT[] DEFAULT '{}',

  -- ========== Source info ==========
  -- Stocke: connector, originalId, url, lastSync, metadata
  source JSONB NOT NULL,

  -- ========== Timestamps ==========
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- ========== Flags ==========
  archived BOOLEAN NOT NULL DEFAULT false,
  favorite BOOLEAN NOT NULL DEFAULT false,

  -- ========== Champs vectoriels pour AI (recherche sémantique) ==========
  -- Dimension 1536 = OpenAI text-embedding-3-small/ada-002
  -- HNSW index permet recherche KNN ultra-rapide sur 100k+ items
  embedding VECTOR(1536), -- Peut être NULL si pas encore enrichi par AI
  embedding_model VARCHAR(100), -- Ex: "text-embedding-3-small", "text-embedding-ada-002"
  embedding_updated_at TIMESTAMP WITH TIME ZONE,

  -- ========== Champs full-text search ==========
  -- TSVECTOR = format optimisé pour recherche textuelle PostgreSQL
  title_tsv TSVECTOR, -- Auto-généré par trigger
  content_tsv TSVECTOR -- Auto-généré par trigger
);

-- ============================================================================
-- INDEX: Performance optimization pour 100k+ items
-- ============================================================================

-- Index HNSW pour recherche vectorielle ultra-rapide
-- HNSW = Hierarchical Navigable Small World
-- m = 16 (connections par layer), ef_construction = 64 (précision build)
-- Permet de chercher les K items les plus similaires en < 10ms sur 100k items
CREATE INDEX IF NOT EXISTS idx_cartae_items_embedding_hnsw
  ON cartae_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index full-text search sur title
CREATE INDEX IF NOT EXISTS idx_cartae_items_title_tsv
  ON cartae_items
  USING GIN (title_tsv);

-- Index full-text search sur content
CREATE INDEX IF NOT EXISTS idx_cartae_items_content_tsv
  ON cartae_items
  USING GIN (content_tsv);

-- Index composite pour filtres fréquents (type + archived + created_at)
CREATE INDEX IF NOT EXISTS idx_cartae_items_type_archived_created
  ON cartae_items (type, archived, created_at DESC);

-- Index GIN sur tags pour recherche rapide "contains tag"
CREATE INDEX IF NOT EXISTS idx_cartae_items_tags
  ON cartae_items
  USING GIN (tags);

-- Index sur source.connector (extrait JSONB)
CREATE INDEX IF NOT EXISTS idx_cartae_items_source_connector
  ON cartae_items
  ((source->>'connector'));

-- Index sur favorite pour filtres rapides
CREATE INDEX IF NOT EXISTS idx_cartae_items_favorite
  ON cartae_items (favorite)
  WHERE favorite = true;

-- Index sur updated_at pour tri chronologique inverse
CREATE INDEX IF NOT EXISTS idx_cartae_items_updated_at
  ON cartae_items (updated_at DESC);

-- Index JSONB GIN sur metadata pour recherches dans les champs custom
CREATE INDEX IF NOT EXISTS idx_cartae_items_metadata
  ON cartae_items
  USING GIN (metadata);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cartae_items_updated_at
  BEFORE UPDATE ON cartae_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Auto-generate TSVECTOR for full-text search
-- ============================================================================

CREATE OR REPLACE FUNCTION update_cartae_items_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  -- Génère TSVECTOR depuis title (langue anglaise par défaut)
  NEW.title_tsv := to_tsvector('english', COALESCE(NEW.title, ''));

  -- Génère TSVECTOR depuis content (troncature à 1MB pour perfs)
  NEW.content_tsv := to_tsvector('english', COALESCE(LEFT(NEW.content, 1000000), ''));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cartae_items_tsvector
  BEFORE INSERT OR UPDATE OF title, content ON cartae_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cartae_items_tsvector();

-- ============================================================================
-- FONCTION: Recherche hybride (full-text + vectorielle)
-- ============================================================================
-- Combine recherche textuelle (PostgreSQL FTS) et sémantique (HNSW)
-- Retourne résultats fusionnés avec score composite
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  text_weight FLOAT DEFAULT 0.5,
  vector_weight FLOAT DEFAULT 0.5,
  result_limit INT DEFAULT 20
)
RETURNS TABLE(
  item_id UUID,
  item_title VARCHAR(500),
  item_type VARCHAR(50),
  text_score FLOAT,
  vector_score FLOAT,
  combined_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH text_results AS (
    -- Full-text search avec ranking
    SELECT
      id,
      title,
      type,
      ts_rank(title_tsv, plainto_tsquery('english', query_text)) +
      ts_rank(content_tsv, plainto_tsquery('english', query_text)) AS rank
    FROM cartae_items
    WHERE
      title_tsv @@ plainto_tsquery('english', query_text) OR
      content_tsv @@ plainto_tsquery('english', query_text)
  ),
  vector_results AS (
    -- Vector similarity search (cosine distance)
    SELECT
      id,
      title,
      type,
      1 - (embedding <=> query_embedding) AS similarity
    FROM cartae_items
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT result_limit * 2
  )
  -- Fusion des résultats avec score pondéré
  SELECT
    COALESCE(t.id, v.id) AS item_id,
    COALESCE(t.title, v.title) AS item_title,
    COALESCE(t.type, v.type) AS item_type,
    COALESCE(t.rank, 0)::FLOAT AS text_score,
    COALESCE(v.similarity, 0)::FLOAT AS vector_score,
    (COALESCE(t.rank, 0) * text_weight + COALESCE(v.similarity, 0) * vector_weight) AS combined_score
  FROM text_results t
  FULL OUTER JOIN vector_results v ON t.id = v.id
  ORDER BY combined_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATISTIQUES: Afficher infos sur la table créée
-- ============================================================================

SELECT
  'cartae_items' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('cartae_items')) AS total_size
FROM cartae_items;

-- Afficher les indexes créés
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'cartae_items'
ORDER BY indexname;
