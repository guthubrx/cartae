/**
 * Algorithme de matching sur mots-clés et tags
 *
 * Cet algorithme calcule la similarité entre deux items en :
 * 1. Comparant leurs tags (poids élevé)
 * 2. Comparant leurs mots-clés significatifs (poids moyen)
 * 3. Utilisant le coefficient de Jaccard pour mesurer l'overlap
 *
 * Avantages :
 * - Rapide et efficace
 * - Excellent pour items avec tags bien définis
 * - Facile à expliquer à l'utilisateur
 */

import type { CartaeItem } from '@cartae/core';
import type { SimilarityAlgorithmImplementation } from '../types/index.js';
import {
  tokenize,
  extractHashtags,
  jaccardSimilarity,
} from '../utils/textProcessing.js';

/**
 * Extrait les mots-clés significatifs d'un texte
 * (mots les plus fréquents, en excluant les stop words)
 */
function extractKeywords(text: string, maxKeywords = 20): Set<string> {
  const tokens = tokenize(text, true); // true = remove stop words

  // Compter les fréquences
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  }

  // Trier par fréquence décroissante
  const sorted = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords);

  return new Set(sorted.map(([word]) => word));
}

/**
 * Implémentation de l'algorithme Keyword Matching
 */
export class KeywordMatchingAlgorithm implements SimilarityAlgorithmImplementation {
  name = 'keyword' as const;

  /**
   * Poids pour les différents types de matching
   */
  private weights = {
    tags: 0.5,        // Tags ont le poids le plus élevé
    keywords: 0.3,    // Mots-clés du contenu
    title: 0.2,       // Mots du titre
  };

  /**
   * Cache pour les keywords extraits
   */
  private keywordCache = new Map<string, {
    tags: Set<string>;
    keywords: Set<string>;
    titleWords: Set<string>;
  }>();

  /**
   * Extrait et cache les keywords d'un item
   */
  private getKeywords(item: CartaeItem): {
    tags: Set<string>;
    keywords: Set<string>;
    titleWords: Set<string>;
  } {
    const cacheKey = item.id;

    if (this.keywordCache.has(cacheKey)) {
      return this.keywordCache.get(cacheKey)!;
    }

    // Extraire tags
    const tags = new Set<string>();
    if (item.tags && item.tags.length > 0) {
      for (const tag of item.tags) {
        // Normaliser les tags (enlever # si présent)
        const normalized = tag.replace(/^#/, '').toLowerCase();
        tags.add(normalized);
      }
    }

    // Extraire tags du contenu (#hashtags)
    if (item.content) {
      const contentTags = extractHashtags(item.content);
      for (const tag of contentTags) {
        tags.add(tag);
      }
    }

    // Extraire keywords du contenu
    const keywords = item.content
      ? extractKeywords(item.content, 20)
      : new Set<string>();

    // Extraire mots du titre
    const titleWords = item.title
      ? new Set(tokenize(item.title, true))
      : new Set<string>();

    const result = { tags, keywords, titleWords };
    this.keywordCache.set(cacheKey, result);

    return result;
  }

  /**
   * Calcule la similarité par matching de mots-clés
   * @returns Score entre 0 (aucune similarité) et 1 (identique)
   */
  compute(item1: CartaeItem, item2: CartaeItem): number {
    const kw1 = this.getKeywords(item1);
    const kw2 = this.getKeywords(item2);

    // Calculer Jaccard pour chaque type
    const tagSimilarity = jaccardSimilarity(kw1.tags, kw2.tags);
    const keywordSimilarity = jaccardSimilarity(kw1.keywords, kw2.keywords);
    const titleSimilarity = jaccardSimilarity(kw1.titleWords, kw2.titleWords);

    // Moyenne pondérée
    const score =
      tagSimilarity * this.weights.tags +
      keywordSimilarity * this.weights.keywords +
      titleSimilarity * this.weights.title;

    return score;
  }

  /**
   * Explique pourquoi deux items sont similaires
   */
  explain(item1: CartaeItem, item2: CartaeItem, score: number): string[] {
    const reasons: string[] = [];
    const kw1 = this.getKeywords(item1);
    const kw2 = this.getKeywords(item2);

    // Tags communs
    const commonTags = [...kw1.tags].filter((tag) => kw2.tags.has(tag));
    if (commonTags.length > 0) {
      const tagList = commonTags.slice(0, 5).map(t => `#${t}`).join(', ');
      reasons.push(`${commonTags.length} tag(s) commun(s): ${tagList}`);
    }

    // Mots-clés communs
    const commonKeywords = [...kw1.keywords].filter((kw) => kw2.keywords.has(kw));
    if (commonKeywords.length > 0) {
      const kwList = commonKeywords.slice(0, 5).map(k => `"${k}"`).join(', ');
      reasons.push(`${commonKeywords.length} mot(s)-clé(s) commun(s): ${kwList}`);
    }

    // Mots de titre communs
    const commonTitleWords = [...kw1.titleWords].filter((w) => kw2.titleWords.has(w));
    if (commonTitleWords.length > 0) {
      const wordList = commonTitleWords.slice(0, 3).map(w => `"${w}"`).join(', ');
      reasons.push(`Titre similaire: ${wordList}`);
    }

    // Statistiques
    const tagRatio = kw1.tags.size > 0 && kw2.tags.size > 0
      ? Math.round((commonTags.length / Math.max(kw1.tags.size, kw2.tags.size)) * 100)
      : 0;

    if (tagRatio > 0) {
      reasons.push(`${tagRatio}% de tags en commun`);
    }

    // Score global
    const scorePercent = Math.round(score * 100);
    reasons.push(`Score de matching: ${scorePercent}%`);

    return reasons;
  }

  /**
   * Configure les poids de l'algorithme
   */
  setWeights(weights: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Réinitialise le cache
   */
  clearCache(): void {
    this.keywordCache.clear();
  }
}

/**
 * Instance singleton de l'algorithme
 */
export const keywordMatchingAlgorithm = new KeywordMatchingAlgorithm();
