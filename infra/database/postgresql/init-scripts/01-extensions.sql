-- ============================================================================
-- 01-extensions.sql - Extensions PostgreSQL pour Cartae Database
-- ============================================================================
-- Ce script installe les extensions nécessaires pour:
-- - Recherche vectorielle (pgvector) avec indexes HNSW
-- - UUID v4 generation
-- - Full-text search
-- ============================================================================

-- Extension pour générer des UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour la recherche vectorielle (embeddings AI)
-- pgvector permet de stocker et rechercher des vecteurs avec HNSW index
-- HNSW = Hierarchical Navigable Small World (algorithme de recherche approx. rapide)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Extension pour full-text search amélioré
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Extension pour fonctions supplémentaires
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Vérification des extensions installées
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm', 'btree_gin');
