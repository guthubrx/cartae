/**
 * RelationshipScorer - Calcul du score de connexion multi-critères
 *
 * Combine plusieurs signaux pour déterminer la force d'une connexion :
 * - Similarité vectorielle (sémantique)
 * - Proximité temporelle
 * - Concordance de sentiment
 * - Concordance de priorité
 * - Participants communs
 * - Tags communs
 */

import type { CartaeItem, CartaeRelationship } from '@cartae/core';
import type {
  ConnectionScoringCriteria,
  ConnectionScoringWeights,
  ConnectionDetectionResult,
} from './types';

/**
 * RelationshipScorer
 *
 * Calcule des scores de connexion entre items en utilisant plusieurs critères
 */
export class RelationshipScorer {
  /**
   * Score une connexion entre deux items
   *
   * @param sourceItem - Item source
   * @param targetItem - Item cible
   * @param vectorSimilarity - Similarité vectorielle pré-calculée (cosine similarity)
   * @param weights - Poids pour chaque critère
   * @returns Résultat complet avec score et relation générée
   */
  scoreConnection(
    sourceItem: CartaeItem,
    targetItem: CartaeItem,
    vectorSimilarity: number,
    weights: ConnectionScoringWeights
  ): ConnectionDetectionResult {
    // Calculer chaque critère
    const criteria: ConnectionScoringCriteria = {
      vectorSimilarity,
      temporalSimilarity: this.calculateTemporalSimilarity(sourceItem, targetItem),
      sentimentAlignment: this.calculateSentimentAlignment(sourceItem, targetItem),
      priorityAlignment: this.calculatePriorityAlignment(sourceItem, targetItem),
      sharedParticipants: this.calculateSharedParticipants(sourceItem, targetItem),
      sharedTags: this.calculateSharedTags(sourceItem, targetItem),
    };

    // Score global (somme pondérée)
    const overallScore =
      weights.vectorSimilarity * criteria.vectorSimilarity +
      weights.temporalSimilarity * criteria.temporalSimilarity +
      weights.sentimentAlignment * criteria.sentimentAlignment +
      weights.priorityAlignment * criteria.priorityAlignment +
      weights.sharedParticipants * criteria.sharedParticipants +
      weights.sharedTags * criteria.sharedTags;

    // Générer raison humainement lisible
    const reason = this.generateReason(criteria, sourceItem, targetItem);

    // Créer CartaeRelationship
    const relationship: CartaeRelationship = {
      type: 'related',
      targetId: targetItem.id,
      bidirectional: true,
      metadata: {
        createdBy: 'ai',
        strength: overallScore,
        confidence: vectorSimilarity, // Confiance basée sur similarité sémantique
        reason,
        createdAt: new Date(),
        // Métadonnées extensibles
        criteria,
        weights,
      },
    };

    return {
      sourceItem,
      targetItem,
      overallScore,
      criteria,
      reason,
      relationship,
    };
  }

  /**
   * Calcule la similarité temporelle (0-1)
   * Items proches dans le temps = score élevé
   */
  private calculateTemporalSimilarity(itemA: CartaeItem, itemB: CartaeItem): number {
    const dateA = new Date(itemA.createdAt);
    const dateB = new Date(itemB.createdAt);

    const diffMs = Math.abs(dateA.getTime() - dateB.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Fenêtre de 30 jours
    // Même jour = 1.0, 30 jours = 0.0
    const windowDays = 30;
    const similarity = Math.max(0, 1 - diffDays / windowDays);

    return similarity;
  }

  /**
   * Calcule la concordance de sentiment (0-1)
   * Même sentiment = score élevé
   */
  private calculateSentimentAlignment(itemA: CartaeItem, itemB: CartaeItem): number {
    const sentimentA = itemA.metadata?.ai?.sentiment?.type;
    const sentimentB = itemB.metadata?.ai?.sentiment?.type;

    if (!sentimentA || !sentimentB) {
      return 0.5; // Neutre si pas de sentiment
    }

    if (sentimentA === sentimentB) {
      return 1.0; // Même sentiment
    }

    // Sentiments différents mais pas opposés (ex: neutral vs positive)
    if (
      (sentimentA === 'neutral' && sentimentB !== 'negative') ||
      (sentimentB === 'neutral' && sentimentA !== 'negative')
    ) {
      return 0.7;
    }

    // Sentiments opposés (positive vs negative)
    if (
      (sentimentA === 'positive' && sentimentB === 'negative') ||
      (sentimentA === 'negative' && sentimentB === 'positive')
    ) {
      return 0.0;
    }

    return 0.5; // Par défaut
  }

  /**
   * Calcule la concordance de priorité (0-1)
   * Même niveau de priorité = score élevé
   */
  private calculatePriorityAlignment(itemA: CartaeItem, itemB: CartaeItem): number {
    const priorityA = itemA.metadata?.ai?.priority?.level;
    const priorityB = itemB.metadata?.ai?.priority?.level;

    if (!priorityA || !priorityB) {
      return 0.5; // Neutre si pas de priorité
    }

    const priorityLevels = ['low', 'medium', 'high', 'critical'];
    const indexA = priorityLevels.indexOf(priorityA);
    const indexB = priorityLevels.indexOf(priorityB);

    if (indexA === -1 || indexB === -1) {
      return 0.5;
    }

    const diff = Math.abs(indexA - indexB);

    // Même niveau = 1.0, écart 1 = 0.66, écart 2 = 0.33, écart 3+ = 0.0
    return Math.max(0, 1 - diff * 0.34);
  }

  /**
   * Calcule le ratio de participants communs (0-1)
   */
  private calculateSharedParticipants(itemA: CartaeItem, itemB: CartaeItem): number {
    const participantsA = this.extractParticipants(itemA);
    const participantsB = this.extractParticipants(itemB);

    if (participantsA.length === 0 || participantsB.length === 0) {
      return 0;
    }

    const shared = participantsA.filter(p => participantsB.includes(p));
    const minSize = Math.min(participantsA.length, participantsB.length);

    return shared.length / minSize;
  }

  /**
   * Calcule le ratio de tags communs (0-1)
   */
  private calculateSharedTags(itemA: CartaeItem, itemB: CartaeItem): number {
    const tagsA = itemA.tags || [];
    const tagsB = itemB.tags || [];

    if (tagsA.length === 0 || tagsB.length === 0) {
      return 0;
    }

    const shared = tagsA.filter(tag => tagsB.includes(tag));
    const minSize = Math.min(tagsA.length, tagsB.length);

    return shared.length / minSize;
  }

  /**
   * Extrait les participants d'un item (emails, personnes)
   */
  private extractParticipants(item: CartaeItem): string[] {
    const participants: string[] = [];

    // From
    if (item.metadata?.from) {
      participants.push(item.metadata.from as string);
    }

    // To
    if (Array.isArray(item.metadata?.to)) {
      participants.push(...(item.metadata.to as string[]));
    }

    // Cc
    if (Array.isArray(item.metadata?.cc)) {
      participants.push(...(item.metadata.cc as string[]));
    }

    // Author
    if (item.metadata?.author) {
      participants.push(item.metadata.author as string);
    }

    // Dédupliquer et normaliser (lowercase)
    return [...new Set(participants.map(p => p.toLowerCase()))];
  }

  /**
   * Génère une raison humainement lisible de la connexion
   */
  private generateReason(
    criteria: ConnectionScoringCriteria,
    sourceItem: CartaeItem,
    targetItem: CartaeItem
  ): string {
    const reasons: string[] = [];

    // Similarité sémantique forte
    if (criteria.vectorSimilarity >= 0.8) {
      reasons.push(
        `forte similarité sémantique (${(criteria.vectorSimilarity * 100).toFixed(0)}%)`
      );
    } else if (criteria.vectorSimilarity >= 0.6) {
      reasons.push(
        `similarité sémantique modérée (${(criteria.vectorSimilarity * 100).toFixed(0)}%)`
      );
    }

    // Proximité temporelle
    if (criteria.temporalSimilarity >= 0.8) {
      reasons.push('créés au même moment');
    } else if (criteria.temporalSimilarity >= 0.5) {
      reasons.push('proximité temporelle');
    }

    // Participants communs
    if (criteria.sharedParticipants >= 0.5) {
      reasons.push('participants similaires');
    }

    // Tags communs
    if (criteria.sharedTags >= 0.5) {
      const commonTags = (sourceItem.tags || []).filter(tag =>
        (targetItem.tags || []).includes(tag)
      );
      if (commonTags.length > 0) {
        reasons.push(`tags communs: ${commonTags.slice(0, 3).join(', ')}`);
      }
    }

    // Sentiment concordant
    if (criteria.sentimentAlignment === 1.0) {
      const sentiment = sourceItem.metadata?.ai?.sentiment?.type;
      if (sentiment) {
        reasons.push(`même sentiment (${sentiment})`);
      }
    }

    // Priorité concordante
    if (criteria.priorityAlignment >= 0.8) {
      const priority = sourceItem.metadata?.ai?.priority?.level;
      if (priority) {
        reasons.push(`même priorité (${priority})`);
      }
    }

    // Si aucune raison spécifique, raison générique
    if (reasons.length === 0) {
      return 'Connexion détectée par analyse multi-critères';
    }

    // Capitaliser première lettre
    const result = reasons.join(', ');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
