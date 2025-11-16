/**
 * Types pour Office365 AI Connections
 * Détection automatique de connexions sémantiques entre items
 */

import type { CartaeItem, CartaeRelationship } from '@cartae/core';

/**
 * Extended metadata avec champs IA enrichis
 * (utilisé pour accès typé aux metadata.ai.*)
 */
export interface AIEnrichedMetadata {
  embedding?: number[];
  sentiment?: {
    type: string;
    score: number;
  };
  priority?: {
    level: string;
    score: number;
  };
  [key: string]: unknown;
}

/**
 * Helper type pour item avec metadata IA enrichies
 */
export type AIEnrichedItem = CartaeItem & {
  metadata?: AIEnrichedMetadata;
};

/**
 * Critères de scoring pour une connexion sémantique
 */
export interface ConnectionScoringCriteria {
  /**
   * Similarité vectorielle (cosine similarity)
   * Range: 0-1 (1 = identique, 0 = aucune similarité)
   */
  vectorSimilarity: number;

  /**
   * Similarité temporelle (proximité dans le temps)
   * Range: 0-1 (1 = même moment, 0 = très éloignés)
   */
  temporalSimilarity: number;

  /**
   * Concordance de sentiment
   * Range: 0-1 (1 = même sentiment, 0 = sentiments opposés)
   */
  sentimentAlignment: number;

  /**
   * Concordance de priorité
   * Range: 0-1 (1 = même niveau, 0 = niveaux opposés)
   */
  priorityAlignment: number;

  /**
   * Participants communs
   * Range: 0-1 (ratio de participants partagés)
   */
  sharedParticipants: number;

  /**
   * Tags communs
   * Range: 0-1 (ratio de tags partagés)
   */
  sharedTags: number;
}

/**
 * Configuration des poids pour le scoring multi-critères
 */
export interface ConnectionScoringWeights {
  /** Poids de la similarité vectorielle (par défaut: 0.4) */
  vectorSimilarity: number;

  /** Poids de la similarité temporelle (par défaut: 0.15) */
  temporalSimilarity: number;

  /** Poids de la concordance de sentiment (par défaut: 0.1) */
  sentimentAlignment: number;

  /** Poids de la concordance de priorité (par défaut: 0.1) */
  priorityAlignment: number;

  /** Poids des participants communs (par défaut: 0.15) */
  sharedParticipants: number;

  /** Poids des tags communs (par défaut: 0.1) */
  sharedTags: number;
}

/**
 * Résultat de la détection de connexion entre 2 items
 */
export interface ConnectionDetectionResult {
  /**
   * Item source
   */
  sourceItem: CartaeItem;

  /**
   * Item cible (connecté)
   */
  targetItem: CartaeItem;

  /**
   * Score global de la connexion (0-1)
   * Combinaison pondérée de tous les critères
   */
  overallScore: number;

  /**
   * Détail des critères de scoring
   */
  criteria: ConnectionScoringCriteria;

  /**
   * Raison humainement lisible de la connexion
   * @example "Même projet, participants similaires, forte similarité sémantique (0.89)"
   */
  reason: string;

  /**
   * Relation CartaeRelationship générée
   * (prête à être ajoutée à l'item source)
   */
  relationship: CartaeRelationship;
}

/**
 * Options de configuration pour la détection de connexions
 */
export interface ConnectionDetectionOptions {
  /**
   * Seuil minimum de score pour considérer une connexion valide
   * @default 0.6
   */
  minScore?: number;

  /**
   * Nombre maximum de connexions à retourner par item
   * @default 10
   */
  maxConnections?: number;

  /**
   * Poids personnalisés pour le scoring
   * Si non fourni, utilise les poids par défaut
   */
  weights?: Partial<ConnectionScoringWeights>;

  /**
   * Fenêtre temporelle pour connexions (en jours)
   * Connexions uniquement avec items dans cette fenêtre
   * @default 30 (dernier mois)
   */
  temporalWindowDays?: number;

  /**
   * Filtrer uniquement items d'un type spécifique
   * @example ['email', 'task']
   */
  itemTypes?: string[];
}

/**
 * Résultat batch de détection de connexions pour un item
 */
export interface ItemConnectionsResult {
  /**
   * Item source
   */
  item: CartaeItem;

  /**
   * Connexions détectées (triées par score décroissant)
   */
  connections: ConnectionDetectionResult[];

  /**
   * Nombre total de connexions trouvées (avant limite maxConnections)
   */
  totalFound: number;

  /**
   * Temps d'exécution de la détection (ms)
   */
  executionTime: number;
}

/**
 * Statistiques globales de détection de connexions
 */
export interface ConnectionStats {
  /**
   * Nombre total d'items analysés
   */
  itemsAnalyzed: number;

  /**
   * Nombre total de connexions détectées
   */
  connectionsDetected: number;

  /**
   * Score moyen des connexions détectées
   */
  averageScore: number;

  /**
   * Distribution des connexions par critère dominant
   * @example { vectorSimilarity: 45, temporalSimilarity: 23, ... }
   */
  dominantCriteriaDistribution: Partial<Record<keyof ConnectionScoringCriteria, number>>;

  /**
   * Temps total d'exécution (ms)
   */
  totalExecutionTime: number;
}
