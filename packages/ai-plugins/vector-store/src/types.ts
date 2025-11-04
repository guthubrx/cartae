/**
 * Types for Vector Store
 */

/**
 * Vecteur avec métadonnées
 */
export interface Vector {
  /** ID unique du vecteur */
  id: string;
  /** Valeurs du vecteur (embedding) */
  values: number[];
  /** Métadonnées associées au vecteur */
  metadata?: Record<string, unknown>;
}

/**
 * Résultat de recherche vectorielle
 */
export interface SearchResult {
  /** ID du vecteur trouvé */
  id: string;
  /** Score de similarité (0-1) */
  score: number;
  /** Métadonnées du vecteur */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration du Vector Store
 */
export interface VectorStoreConfig {
  /** Provider utilisé (mock, chromadb, etc.) */
  provider: 'mock' | 'chromadb' | 'pinecone' | 'weaviate';
  /** Dimension des vecteurs */
  dimension?: number;
  /** Options spécifiques au provider */
  [key: string]: unknown;
}

/**
 * Résultats agrégés d'une opération
 */
export interface BatchResult {
  /** Nombre de vecteurs traités */
  count: number;
  /** Nombre de succès */
  success: number;
  /** Nombre d'erreurs */
  failed: number;
  /** Messages d'erreur */
  errors: string[];
}
