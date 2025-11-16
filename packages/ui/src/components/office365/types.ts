/**
 * Types pour composants Office365 enrichis par IA
 */

import type { CartaeItem } from '@cartae/core';

/**
 * Niveau de priorité avec couleur associée
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

/**
 * Sentiment avec couleur associée
 */
export type SentimentType = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

/**
 * Métadonnées IA pour visualisation
 */
export interface AIVisualizationData {
  priority?: {
    level: PriorityLevel;
    score: number;
    color: string;
  };
  sentiment?: {
    type: SentimentType;
    score: number;
    color: string;
  };
  hasActionItems?: boolean;
  actionItemCount?: number;
  hasDeadline?: boolean;
  deadlineDate?: Date;
  hasConnections?: boolean;
  connectionCount?: number;
  hasSummary?: boolean;
}

/**
 * Item Office365 enrichi pour visualisation
 */
export interface EnrichedOffice365Item extends CartaeItem {
  aiViz?: AIVisualizationData;
}

/**
 * Filtre UI pour métadonnées IA
 */
export interface AIMetadataFilters {
  priorities: PriorityLevel[];
  sentiments: SentimentType[];
  hasActionItems?: boolean;
  hasDeadline?: boolean;
  hasConnections?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Configuration des couleurs pour priorités
 */
export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  critical: '#EF4444', // Rouge vif
  high: '#F97316', // Orange
  medium: '#EAB308', // Jaune
  low: '#22C55E', // Vert
  none: '#94A3B8', // Gris
};

/**
 * Configuration des couleurs pour sentiments
 */
export const SENTIMENT_COLORS: Record<SentimentType, string> = {
  very_positive: '#10B981', // Vert vif
  positive: '#84CC16', // Vert lime
  neutral: '#94A3B8', // Gris
  negative: '#F59E0B', // Orange
  very_negative: '#EF4444', // Rouge
};

/**
 * Labels pour priorités
 */
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
  none: 'Aucune',
};

/**
 * Labels pour sentiments
 */
export const SENTIMENT_LABELS: Record<SentimentType, string> = {
  very_positive: 'Très positif',
  positive: 'Positif',
  neutral: 'Neutre',
  negative: 'Négatif',
  very_negative: 'Très négatif',
};
