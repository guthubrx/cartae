/**
 * Algorithme combiné (fusion des 3 algorithmes)
 *
 * Cet algorithme combine les résultats de :
 * 1. Cosine Similarity (TF-IDF) - similarité textuelle
 * 2. Keyword Matching - matching tags/mots-clés
 * 3. Context Analysis - similarité contextuelle
 *
 * Avec des poids configurables pour chaque algorithme.
 *
 * Avantages :
 * - Vision holistique de la similarité
 * - Combine forces de chaque approche
 * - Poids ajustables selon le contexte
 */

import type { CartaeItem } from '@cartae/core';
import type { SimilarityAlgorithmImplementation, SemanticConnectionsConfig } from '../types/index.js';
import { cosineSimilarityAlgorithm } from './cosineSimilarity.js';
import { keywordMatchingAlgorithm } from './keywordMatching.js';
import { contextAnalysisAlgorithm } from './contextAnalysis.js';

/**
 * Poids par défaut pour chaque algorithme
 */
const DEFAULT_WEIGHTS = {
  cosine: 0.4,   // TF-IDF textuel
  keyword: 0.3,  // Tags et mots-clés
  context: 0.3,  // Contexte hiérarchique et métadonnées
};

/**
 * Implémentation de l'algorithme Combined
 */
export class CombinedAlgorithm implements SimilarityAlgorithmImplementation {
  name = 'combined' as const;

  /**
   * Poids pour chaque algorithme
   */
  private weights = { ...DEFAULT_WEIGHTS };

  /**
   * Champs à analyser pour les algorithmes textuels
   */
  private fields: string[] = ['title', 'content', 'tags'];

  /**
   * Configure l'algorithme avec les poids depuis SemanticConnectionsConfig
   */
  configure(config?: SemanticConnectionsConfig): void {
    if (config?.weights) {
      this.weights = {
        cosine: config.weights.cosine ?? DEFAULT_WEIGHTS.cosine,
        keyword: config.weights.keyword ?? DEFAULT_WEIGHTS.keyword,
        context: config.weights.context ?? DEFAULT_WEIGHTS.context,
      };
    }

    if (config?.fields) {
      this.fields = config.fields;
    }
  }

  /**
   * Calcule la similarité combinée entre deux items
   * @returns Score entre 0 (aucune similarité) et 1 (très similaire)
   */
  compute(item1: CartaeItem, item2: CartaeItem): number {
    // Calculer score de chaque algorithme
    const cosineScore = cosineSimilarityAlgorithm.compute(item1, item2, this.fields);
    const keywordScore = keywordMatchingAlgorithm.compute(item1, item2);
    const contextScore = contextAnalysisAlgorithm.compute(item1, item2);

    // Moyenne pondérée
    const combinedScore =
      cosineScore * this.weights.cosine +
      keywordScore * this.weights.keyword +
      contextScore * this.weights.context;

    return combinedScore;
  }

  /**
   * Explique pourquoi deux items sont similaires
   * Combine les explications des 3 algorithmes
   */
  explain(item1: CartaeItem, item2: CartaeItem, score: number): string[] {
    const reasons: string[] = [];

    // Calculer scores individuels
    const cosineScore = cosineSimilarityAlgorithm.compute(item1, item2, this.fields);
    const keywordScore = keywordMatchingAlgorithm.compute(item1, item2);
    const contextScore = contextAnalysisAlgorithm.compute(item1, item2);

    // Header avec scores par algorithme
    reasons.push(
      `Scores: TF-IDF ${Math.round(cosineScore * 100)}%, ` +
      `Keywords ${Math.round(keywordScore * 100)}%, ` +
      `Context ${Math.round(contextScore * 100)}%`
    );

    // Ajouter explications de l'algorithme dominant
    const maxScore = Math.max(cosineScore, keywordScore, contextScore);

    if (maxScore === cosineScore && cosineScore > 0.3) {
      const cosineReasons = cosineSimilarityAlgorithm.explain(item1, item2, cosineScore, this.fields);
      // Prendre les 2 premières raisons
      reasons.push(...cosineReasons.slice(0, 2).map(r => `[TF-IDF] ${r}`));
    }

    if (maxScore === keywordScore && keywordScore > 0.3) {
      const keywordReasons = keywordMatchingAlgorithm.explain(item1, item2, keywordScore);
      reasons.push(...keywordReasons.slice(0, 2).map(r => `[Keywords] ${r}`));
    }

    if (maxScore === contextScore && contextScore > 0.3) {
      const contextReasons = contextAnalysisAlgorithm.explain(item1, item2, contextScore);
      reasons.push(...contextReasons.slice(0, 2).map(r => `[Context] ${r}`));
    }

    // Si tous les scores sont faibles mais combinaison donne résultat
    if (maxScore < 0.3 && score > 0.25) {
      reasons.push('Connexion faible mais cohérente sur plusieurs dimensions');
    }

    // Score global
    const scorePercent = Math.round(score * 100);
    reasons.push(`Score combiné: ${scorePercent}%`);

    return reasons;
  }

  /**
   * Configure les poids manuellement
   */
  setWeights(weights: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...weights };

    // Normaliser pour que la somme = 1
    const sum = this.weights.cosine + this.weights.keyword + this.weights.context;
    if (sum > 0) {
      this.weights.cosine /= sum;
      this.weights.keyword /= sum;
      this.weights.context /= sum;
    }
  }

  /**
   * Obtient les poids actuels
   */
  getWeights(): typeof this.weights {
    return { ...this.weights };
  }

  /**
   * Build le corpus pour l'algorithme cosine
   * À appeler une fois avec tous les items avant de calculer les similarités
   */
  buildCorpus(items: CartaeItem[]): void {
    cosineSimilarityAlgorithm.buildCorpus(items, this.fields);
  }

  /**
   * Réinitialise les caches de tous les algorithmes
   */
  clearCache(): void {
    cosineSimilarityAlgorithm.clearCache();
    keywordMatchingAlgorithm.clearCache();
  }
}

/**
 * Instance singleton de l'algorithme
 */
export const combinedAlgorithm = new CombinedAlgorithm();
