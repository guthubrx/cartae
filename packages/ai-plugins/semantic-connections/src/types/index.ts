/**
 * Types for Semantic Connections AI Plugin
 *
 * Ce plugin implémente la détection de connexions sémantiques entre
 * CartaeItems en utilisant plusieurs algorithmes de similarité.
 */

import type { Plugin } from '@cartae/plugin-system';
import type { CartaeItem } from '@cartae/core';

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
  /**
   * Algorithme principal à utiliser
   * @default 'combined'
   */
  algorithm?: SimilarityAlgorithm;

  /**
   * Seuil minimal de similarité (0-1)
   * Seules les connexions >= seuil sont retournées
   * @default 0.3
   */
  threshold?: number;

  /**
   * Nombre maximum de connexions à retourner par item
   * @default 10
   */
  maxConnections?: number;

  /**
   * Pondération pour l'algorithme 'combined'
   */
  weights?: {
    cosine?: number;    // @default 0.4
    keyword?: number;   // @default 0.3
    context?: number;   // @default 0.3
  };

  /**
   * Champs à analyser pour la similarité
   * @default ['title', 'content', 'tags']
   */
  fields?: Array<'title' | 'content' | 'tags' | 'metadata'>;
}

/**
 * Connexion sémantique entre 2 items
 */
export interface SemanticConnection {
  /**
   * ID de l'item source
   */
  fromId: string;

  /**
   * ID de l'item cible
   */
  toId: string;

  /**
   * Score de similarité (0-1)
   * 0 = aucune similarité, 1 = identique
   */
  score: number;

  /**
   * Algorithme ayant calculé cette connexion
   */
  algorithm: SimilarityAlgorithm;

  /**
   * Raisons de la connexion (pour explicabilité)
   * @example ["3 tags communs: #urgent #client #budget", "Contenu similaire (78%)"]
   */
  reasons: string[];

  /**
   * Timestamp de calcul
   */
  computedAt: Date;

  /**
   * Niveau de confiance (0-1)
   * Basé sur la robustesse de l'algorithme
   */
  confidence: number;
}

/**
 * Graphe de connexions sémantiques
 * Structure de données pour stocker et requêter les connexions
 */
export interface SemanticGraph {
  /**
   * Map: itemId → connexions sortantes
   */
  connections: Map<string, SemanticConnection[]>;

  /**
   * Nombre total de connexions dans le graphe
   */
  totalConnections: number;

  /**
   * Date de dernière mise à jour du graphe
   */
  lastUpdated: Date;

  /**
   * Configuration utilisée pour calculer ce graphe
   */
  config: SemanticConnectionsConfig;
}

/**
 * Résultat d'analyse de connexions pour un item
 */
export interface ConnectionAnalysis {
  /**
   * Item analysé
   */
  item: CartaeItem;

  /**
   * Connexions trouvées
   */
  connections: SemanticConnection[];

  /**
   * Statistiques
   */
  stats: {
    /**
     * Nombre de connexions trouvées
     */
    totalFound: number;

    /**
     * Score moyen des connexions
     */
    averageScore: number;

    /**
     * Score maximum trouvé
     */
    maxScore: number;

    /**
     * Score minimum trouvé
     */
    minScore: number;

    /**
     * Temps de calcul en ms
     */
    computeTimeMs: number;
  };

  /**
   * Timestamp de l'analyse
   */
  analyzedAt: Date;
}

/**
 * Interface pour les algorithmes de similarité
 */
export interface SimilarityAlgorithmImplementation {
  /**
   * Nom de l'algorithme
   */
  name: SimilarityAlgorithm;

  /**
   * Calcule la similarité entre 2 items
   * @param item1 Premier item
   * @param item2 Second item
   * @returns Score de similarité (0-1)
   */
  compute(item1: CartaeItem, item2: CartaeItem): number;

  /**
   * Explique pourquoi 2 items sont similaires
   * @param item1 Premier item
   * @param item2 Second item
   * @param score Score de similarité calculé
   * @returns Liste de raisons
   */
  explain(item1: CartaeItem, item2: CartaeItem, score: number): string[];
}

/**
 * Interface du plugin AI (extension de Plugin)
 *
 * Cette interface étend Plugin avec des méthodes spécifiques
 * aux plugins d'intelligence artificielle.
 */
export interface AIPlugin extends Plugin {
  /**
   * Type du plugin AI
   */
  type: 'analyzer' | 'classifier' | 'predictor' | 'generator';

  /**
   * Analyse un item et enrichit ses métadonnées AI
   *
   * @param item Item à analyser
   * @returns Métadonnées AI enrichies
   */
  analyze(item: CartaeItem): Promise<CartaeItem>;

  /**
   * Trouve les connexions sémantiques entre un item et une collection
   *
   * @param item Item source
   * @param allItems Collection d'items à comparer
   * @returns IDs des items connectés
   */
  findConnections(item: CartaeItem, allItems: CartaeItem[]): Promise<string[]>;

  /**
   * Génère des insights sur une collection d'items
   *
   * @param items Collection d'items
   * @returns Insights générés
   */
  generateInsights?(items: CartaeItem[]): Promise<Insight[]>;

  /**
   * Configure le plugin
   *
   * @param config Configuration spécifique au plugin
   */
  configure?(config: unknown): void;
}

/**
 * Insight généré par l'AI
 */
export interface Insight {
  /**
   * Type d'insight
   */
  type: 'connection' | 'cluster' | 'trend' | 'anomaly' | 'suggestion';

  /**
   * Titre de l'insight
   */
  title: string;

  /**
   * Description détaillée
   */
  description: string;

  /**
   * Items concernés
   */
  relatedItems: string[];

  /**
   * Score de priorité (0-10)
   */
  priority: number;

  /**
   * Niveau de confiance (0-1)
   */
  confidence: number;

  /**
   * Données supplémentaires
   */
  data?: Record<string, unknown>;
}
