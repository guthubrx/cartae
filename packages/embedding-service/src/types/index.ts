/**
 * Types pour EmbeddingService
 * Options de configuration et statistiques de cache
 */

export interface EmbeddingOptions {
  /** Modèle d'embedding à utiliser */
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
  /** Clé de cache personnalisée (optionnel) */
  cacheKey?: string;
}

export interface EmbeddingStats {
  /** Nombre de hits (cache) */
  hits: number;
  /** Nombre de misses (appels API) */
  misses: number;
  /** Taux de hit (hit rate) entre 0 et 1 */
  hitRate: number;
  /** Taille actuelle du cache */
  cacheSize: number;
}

export interface EmbeddingResponse {
  /** Vecteur d'embedding généré */
  embedding: number[];
  /** Modèle utilisé */
  model: string;
  /** Dimension du vecteur */
  dimension: number;
  /** Indique si le résultat vient du cache */
  cached: boolean;
}
