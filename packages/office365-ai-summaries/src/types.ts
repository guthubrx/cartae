/**
 * Types pour Office365 AI Summaries
 * Génération automatique de résumés pour emails et threads
 */

import type { CartaeItem } from '@cartae/core';

/**
 * Type de résumé généré
 */
export type SummaryType = 'extractive' | 'abstractive' | 'thread' | 'bullet_points';

/**
 * Longueur du résumé
 */
export type SummaryLength = 'short' | 'medium' | 'long';

/**
 * Méthode de génération
 */
export type GenerationMethod = 'llm' | 'extractive' | 'hybrid';

/**
 * Résumé généré pour un item
 */
export interface ItemSummary {
  /**
   * ID unique du résumé
   */
  id: string;

  /**
   * ID de l'item résumé
   */
  itemId: string;

  /**
   * Type de résumé
   */
  type: SummaryType;

  /**
   * Texte du résumé
   */
  text: string;

  /**
   * Longueur du résumé
   */
  length: SummaryLength;

  /**
   * Points clés extraits
   */
  keyPoints?: string[];

  /**
   * Topics détectés
   */
  topics?: string[];

  /**
   * Actions extraites
   */
  actionItems?: string[];

  /**
   * Modèle utilisé (si LLM)
   * @example "gpt-4", "claude-3-sonnet", "extractive-v1"
   */
  modelUsed?: string;

  /**
   * Confiance du résumé (0-1)
   */
  confidence?: number;

  /**
   * Méthode de génération
   */
  generationMethod: GenerationMethod;

  /**
   * Date de création
   */
  createdAt: Date;

  /**
   * Date de mise à jour
   */
  updatedAt: Date;
}

/**
 * Résumé de thread email complet
 */
export interface ThreadSummary extends ItemSummary {
  /**
   * ID du thread
   */
  threadId: string;

  /**
   * Nombre d'items dans le thread
   */
  threadItemCount: number;

  /**
   * Participants du thread
   */
  participants?: string[];

  /**
   * Date de début du thread
   */
  threadStartDate?: Date;

  /**
   * Date de fin du thread
   */
  threadEndDate?: Date;
}

/**
 * Options pour génération de résumé
 */
export interface SummaryGenerationOptions {
  /**
   * Type de résumé souhaité
   * @default 'extractive'
   */
  type?: SummaryType;

  /**
   * Longueur du résumé
   * @default 'medium'
   */
  length?: SummaryLength;

  /**
   * Méthode de génération
   * @default 'extractive'
   */
  method?: GenerationMethod;

  /**
   * Modèle LLM à utiliser (si method = 'llm' ou 'hybrid')
   * @example "gpt-4", "claude-3-sonnet"
   */
  llmModel?: string;

  /**
   * Nombre max de points clés
   * @default 5
   */
  maxKeyPoints?: number;

  /**
   * Extraire les action items ?
   * @default true
   */
  extractActionItems?: boolean;

  /**
   * Détecter les topics ?
   * @default true
   */
  detectTopics?: boolean;

  /**
   * Langue du résumé
   * @default 'auto' (détection auto)
   */
  language?: string;
}

/**
 * Options pour résumé de thread
 */
export interface ThreadSummaryOptions extends SummaryGenerationOptions {
  /**
   * Inclure les métadonnées des participants ?
   * @default true
   */
  includeParticipants?: boolean;

  /**
   * Inclure la timeline du thread ?
   * @default false
   */
  includeTimeline?: boolean;
}

/**
 * Résultat de génération de résumé
 */
export interface SummaryGenerationResult {
  /**
   * Résumé généré
   */
  summary: ItemSummary;

  /**
   * Temps d'exécution (ms)
   */
  executionTime: number;

  /**
   * Métadonnées de génération
   */
  metadata?: {
    /**
     * Nombre de mots dans le contenu original
     */
    originalWordCount: number;

    /**
     * Nombre de mots dans le résumé
     */
    summaryWordCount: number;

    /**
     * Ratio de compression (summary / original)
     */
    compressionRatio: number;
  };
}

/**
 * Statistiques de résumés
 */
export interface SummaryStats {
  /**
   * Nombre total de résumés
   */
  totalSummaries: number;

  /**
   * Répartition par type
   */
  byType: Record<SummaryType, number>;

  /**
   * Confiance moyenne
   */
  averageConfidence: number;

  /**
   * Modèles utilisés
   */
  modelsUsed: Record<string, number>;

  /**
   * Méthode de génération dominante
   */
  dominantMethod: GenerationMethod;
}
