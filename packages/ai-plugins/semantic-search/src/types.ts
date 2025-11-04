/**
 * Types pour Semantic Search Plugin
 */

import type { VectorStore } from '@cartae/vector-store';
import type { EmbeddingsGenerator } from '@cartae/embeddings-generator';
import type { CartaeItem } from '@cartae/ai-types';

/**
 * Configuration du plugin Semantic Search
 */
export interface SemanticSearchConfig {
  /** Vector Store pour stockage des embeddings */
  vectorStore: VectorStore;
  /** Embeddings Generator pour créer les embeddings */
  embeddingsGenerator: EmbeddingsGenerator;
  /** Seuil minimal de similarité (0-1, défaut: 0.3) */
  threshold?: number;
  /** Nombre max de résultats (défaut: 10) */
  topK?: number;
  /** Activer l'expansion de requête (défaut: true) */
  expandQuery?: boolean;
  /** Activer le re-ranking des résultats (défaut: true) */
  rerank?: boolean;
}

/**
 * Résultat de recherche sémantique
 */
export interface SemanticSearchResult {
  /** Item trouvé */
  item: CartaeItem;
  /** Score de similarité (0-1) */
  score: number;
  /** Raison du match (explication) */
  reason?: string;
}

/**
 * Options pour une requête de recherche
 */
export interface SearchOptions {
  /** Nombre de résultats (défaut: topK du config) */
  limit?: number;
  /** Seuil minimum de similarité (défaut: config threshold) */
  threshold?: number;
  /** Items à considérer (défaut: tous dans le vector store) */
  items?: CartaeItem[];
  /** Contexte optionnel pour améliorer les résultats */
  context?: CartaeItem[];
}

/**
 * Résultat d'indexation
 */
export interface IndexResult {
  /** Nombre d'items indexés */
  indexed: number;
  /** Nombre d'erreurs */
  errors: number;
  /** Messages d'erreur */
  errorMessages: string[];
  /** Durée en ms */
  durationMs: number;
}
