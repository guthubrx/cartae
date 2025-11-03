/**
 * Algorithme d'analyse de contexte sémantique
 *
 * Cet algorithme calcule la similarité entre deux items en analysant :
 * 1. Leur position dans la hiérarchie (items proches dans l'arbre)
 * 2. Leurs relations explicites (related_items, parent_item)
 * 3. Leurs métadonnées AI (priority, status, sentiment)
 * 4. Leurs auteurs et timestamps
 *
 * Avantages :
 * - Capture la similarité contextuelle (pas seulement textuelle)
 * - Détecte items liés par position ou workflow
 * - Complémentaire aux approches textuelles
 */

import type { CartaeItem } from '@cartae/core';
import type { SimilarityAlgorithmImplementation } from '../types/index.js';

/**
 * Calcule la distance hiérarchique entre deux chemins
 * Exemple: ['A', 'B', 'C'] et ['A', 'B', 'D'] → distance = 2 (1 ancêtre commun)
 */
function hierarchyDistance(path1: string[], path2: string[]): number {
  if (!path1 || !path2 || path1.length === 0 || path2.length === 0) {
    return 1.0; // Distance maximale si pas de hiérarchie
  }

  // Trouver l'ancêtre commun le plus profond
  let commonDepth = 0;
  const minLength = Math.min(path1.length, path2.length);

  for (let i = 0; i < minLength; i++) {
    if (path1[i] === path2[i]) {
      commonDepth = i + 1;
    } else {
      break;
    }
  }

  // Distance = nombre de niveaux à remonter/descendre
  // Plus la distance est faible, plus les items sont proches
  const distance = (path1.length - commonDepth) + (path2.length - commonDepth);

  // Normaliser entre 0 et 1 (0 = même position, 1 = racines différentes)
  const maxDistance = path1.length + path2.length;
  return distance / maxDistance;
}

/**
 * Calcule la similarité temporelle entre deux items
 * Items créés/modifiés proches dans le temps sont potentiellement liés
 */
function temporalSimilarity(item1: CartaeItem, item2: CartaeItem): number {
  const date1 = new Date(item1.timestamp || item1.created_at).getTime();
  const date2 = new Date(item2.timestamp || item2.created_at).getTime();

  const diffMs = Math.abs(date1 - date2);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Similarité décroît exponentiellement avec le temps
  // 0 jours = 1.0, 7 jours = 0.5, 30 jours = ~0.1
  return Math.exp(-diffDays / 10);
}

/**
 * Implémentation de l'algorithme Context Analysis
 */
export class ContextAnalysisAlgorithm implements SimilarityAlgorithmImplementation {
  name = 'context' as const;

  /**
   * Poids pour les différents facteurs contextuels
   */
  private weights = {
    hierarchy: 0.3,      // Position hiérarchique
    relations: 0.3,      // Relations explicites
    metadata: 0.2,       // Métadonnées AI (priority, status)
    temporal: 0.1,       // Proximité temporelle
    author: 0.1,         // Même auteur
  };

  /**
   * Calcule la similarité hiérarchique
   */
  private computeHierarchySimilarity(item1: CartaeItem, item2: CartaeItem): number {
    const path1 = item1.hierarchy_path || [];
    const path2 = item2.hierarchy_path || [];

    // Items sans hiérarchie ont similarité 0
    if (path1.length === 0 || path2.length === 0) {
      return 0;
    }

    // Plus la distance est faible, plus la similarité est élevée
    const distance = hierarchyDistance(path1, path2);
    return 1 - distance;
  }

  /**
   * Calcule la similarité par relations explicites
   */
  private computeRelationSimilarity(item1: CartaeItem, item2: CartaeItem): number {
    let score = 0;

    // Items explicitement liés (related_items)
    const related1 = new Set(item1.related_items || []);
    const related2 = new Set(item2.related_items || []);

    if (related1.has(item2.id) || related2.has(item1.id)) {
      score += 1.0; // Relation explicite = score max
    }

    // Items avec même parent
    if (item1.parent_item && item2.parent_item && item1.parent_item === item2.parent_item) {
      score += 0.7; // Siblings = score élevé
    }

    // Parent-enfant
    if (item1.parent_item === item2.id || item2.parent_item === item1.id) {
      score += 0.8; // Relation directe parent-enfant
    }

    return Math.min(score, 1.0); // Cap à 1.0
  }

  /**
   * Calcule la similarité des métadonnées AI
   */
  private computeMetadataSimilarity(item1: CartaeItem, item2: CartaeItem): number {
    let score = 0;
    let factors = 0;

    // Status similaire
    if (item1.status && item2.status) {
      factors++;
      if (item1.status === item2.status) {
        score += 1.0;
      }
    }

    // Priority similaire
    if (item1.priority && item2.priority) {
      factors++;
      if (item1.priority === item2.priority) {
        score += 1.0;
      }
    }

    // AI metadata
    if (item1.ai_metadata && item2.ai_metadata) {
      // Sentiment similaire
      if (item1.ai_metadata.sentiment && item2.ai_metadata.sentiment) {
        factors++;
        if (item1.ai_metadata.sentiment === item2.ai_metadata.sentiment) {
          score += 1.0;
        }
      }

      // Priority score proche
      if (
        typeof item1.ai_metadata.priority_score === 'number' &&
        typeof item2.ai_metadata.priority_score === 'number'
      ) {
        factors++;
        const diff = Math.abs(item1.ai_metadata.priority_score - item2.ai_metadata.priority_score);
        score += Math.max(0, 1 - diff / 10); // Normaliser sur échelle 0-10
      }

      // Connexions AI entre les items
      if (item1.ai_metadata.connections && item2.ai_metadata.connections) {
        if (
          item1.ai_metadata.connections.includes(item2.id) ||
          item2.ai_metadata.connections.includes(item1.id)
        ) {
          score += 1.0;
          factors++;
        }
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calcule la similarité d'auteur
   */
  private computeAuthorSimilarity(item1: CartaeItem, item2: CartaeItem): number {
    if (!item1.author || !item2.author) return 0;

    // Même auteur
    if (item1.author.id === item2.author.id) {
      return 1.0;
    }

    // Même email (cas où IDs différents mais même personne)
    if (item1.author.email && item2.author.email && item1.author.email === item2.author.email) {
      return 1.0;
    }

    return 0;
  }

  /**
   * Calcule la similarité contextuelle entre deux items
   * @returns Score entre 0 (aucune similarité) et 1 (très similaire)
   */
  compute(item1: CartaeItem, item2: CartaeItem): number {
    const hierarchySim = this.computeHierarchySimilarity(item1, item2);
    const relationSim = this.computeRelationSimilarity(item1, item2);
    const metadataSim = this.computeMetadataSimilarity(item1, item2);
    const temporalSim = temporalSimilarity(item1, item2);
    const authorSim = this.computeAuthorSimilarity(item1, item2);

    // Moyenne pondérée
    const score =
      hierarchySim * this.weights.hierarchy +
      relationSim * this.weights.relations +
      metadataSim * this.weights.metadata +
      temporalSim * this.weights.temporal +
      authorSim * this.weights.author;

    return score;
  }

  /**
   * Explique pourquoi deux items sont similaires contextuellement
   */
  explain(item1: CartaeItem, item2: CartaeItem, score: number): string[] {
    const reasons: string[] = [];

    // Hiérarchie
    const hierarchySim = this.computeHierarchySimilarity(item1, item2);
    if (hierarchySim > 0.5) {
      const path1 = item1.hierarchy_path || [];
      const path2 = item2.hierarchy_path || [];
      if (path1.length > 0 && path2.length > 0) {
        reasons.push(`Proches dans la hiérarchie (${Math.round(hierarchySim * 100)}%)`);
      }
    }

    // Relations explicites
    const related1 = new Set(item1.related_items || []);
    const related2 = new Set(item2.related_items || []);

    if (related1.has(item2.id) || related2.has(item1.id)) {
      reasons.push('Items explicitement liés');
    }

    if (item1.parent_item === item2.id || item2.parent_item === item1.id) {
      reasons.push('Relation parent-enfant');
    } else if (item1.parent_item && item2.parent_item && item1.parent_item === item2.parent_item) {
      reasons.push('Items frères (même parent)');
    }

    // Status/Priority
    if (item1.status && item2.status && item1.status === item2.status) {
      reasons.push(`Même statut: ${item1.status}`);
    }

    if (item1.priority && item2.priority && item1.priority === item2.priority) {
      reasons.push(`Même priorité: ${item1.priority}`);
    }

    // Auteur
    if (this.computeAuthorSimilarity(item1, item2) > 0) {
      reasons.push(`Même auteur: ${item1.author?.name || 'inconnu'}`);
    }

    // Temporel
    const temporalSim = temporalSimilarity(item1, item2);
    if (temporalSim > 0.7) {
      reasons.push('Créés/modifiés à des dates proches');
    }

    // Score global
    const scorePercent = Math.round(score * 100);
    reasons.push(`Score contextuel: ${scorePercent}%`);

    return reasons;
  }

  /**
   * Configure les poids de l'algorithme
   */
  setWeights(weights: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...weights };
  }
}

/**
 * Instance singleton de l'algorithme
 */
export const contextAnalysisAlgorithm = new ContextAnalysisAlgorithm();
