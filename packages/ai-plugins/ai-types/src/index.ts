/**
 * Shared types for Cartae AI plugins
 *
 * Ce fichier centralise les types partagés entre les plugins AI
 * pour éviter les dépendances circulaires et les imports relatifs.
 */

// Réexporter CartaeItem depuis @cartae/core pour éviter duplication
import type { CartaeItem as CoreCartaeItem } from '@cartae/core';
export type { CartaeItem } from '@cartae/core';

// Alias pour utilisation dans ce fichier
type CartaeItem = CoreCartaeItem;

/**
 * Plugin - Interface de base pour tous les plugins
 */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  initialize?(): Promise<void>;
  destroy?(): Promise<void>;
}

/**
 * Types d'algorithmes de similarité supportés
 */
export type SimilarityAlgorithm =
  | 'cosine'        // Similarité cosinus sur TF-IDF
  | 'keyword'       // Matching sur mots-clés communs
  | 'context'       // Analyse contexte sémantique
  | 'combined';     // Combinaison pondérée des 3 algorithmes

/**
 * Configuration du plugin Semantic Connections
 */
export interface SemanticConnectionsConfig {
  algorithm?: SimilarityAlgorithm;
  threshold?: number;
  maxConnections?: number;
  weights?: {
    cosine?: number;
    keyword?: number;
    context?: number;
  };
  fields?: Array<'title' | 'content' | 'tags' | 'metadata'>;
}

/**
 * Connexion sémantique entre 2 items
 */
export interface SemanticConnection {
  fromId: string;
  toId: string;
  score: number;
  algorithm: SimilarityAlgorithm;
  reasons: string[];
  computedAt: Date;
  confidence: number;
}

/**
 * Graphe de connexions sémantiques
 */
export interface SemanticGraph {
  connections: Map<string, SemanticConnection[]>;
  totalConnections: number;
  lastUpdated: Date;
  config: SemanticConnectionsConfig;
}

/**
 * Résultat d'analyse de connexions pour un item
 */
export interface ConnectionAnalysis {
  item: CartaeItem;
  connections: SemanticConnection[];
  stats: {
    totalFound: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    computeTimeMs: number;
  };
  analyzedAt: Date;
}

/**
 * Interface pour les algorithmes de similarité
 */
export interface SimilarityAlgorithmImplementation {
  name: SimilarityAlgorithm;
  compute(item1: CartaeItem, item2: CartaeItem): number;
  explain(item1: CartaeItem, item2: CartaeItem, score: number): string[];
}

/**
 * Interface du plugin AI
 *
 * Hérite de Plugin pour garantir id, name, version
 */
export interface AIPlugin extends Plugin {
  type: 'analyzer' | 'classifier' | 'predictor' | 'generator';
  analyze(item: CartaeItem): Promise<CartaeItem>;
  findConnections(item: CartaeItem, allItems: CartaeItem[]): Promise<string[]>;
  generateInsights?(items: CartaeItem[]): Promise<Insight[]>;
  configure?(config: unknown): void;
}

/**
 * Insight généré par l'AI
 */
export interface Insight {
  type: 'connection' | 'cluster' | 'trend' | 'anomaly' | 'suggestion';
  title: string;
  description: string;
  relatedItems: string[];
  priority: number;
  confidence: number;
  data?: Record<string, unknown>;
}

/**
 * Configuration LLM Service
 */
export interface LLMConfig {
  primary: ProviderConfig;
  fallbacks?: ProviderConfig[];
  enableCache?: boolean;
  cacheTTL?: number;
}

/**
 * Configuration d'un provider LLM
 */
export interface ProviderConfig {
  provider: 'mock' | 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  defaultModel?: string;
  rateLimit?: number;
  baseURL?: string;
  [key: string]: unknown;
}

/**
 * Résultat d'une complétion LLM
 */
export interface LLMCompletionResult {
  content: string;
  tokens?: {
    input: number;
    output: number;
  };
  model?: string;
  finishReason?: string;
}

/**
 * Options pour une requête LLM
 */
export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  [key: string]: unknown;
}
