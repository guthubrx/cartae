/**
 * Result Ranker - Re-rank les résultats de recherche
 */

import type { CartaeItem } from '@cartae/ai-types';
import type { SearchResult } from '@cartae/vector-store';

/**
 * Result Ranker
 *
 * Re-rank les résultats basé sur des heuristiques:
 * - Similarité vectorielle (70%)
 * - Récence (15%)
 * - Popularité/pertinence (15%)
 */
export class ResultRanker {
  /**
   * Re-rank les résultats
   * @param results Résultats de recherche vectorielle
   * @param query Requête originale
   * @param items CartaeItems correspondants
   * @returns Résultats re-rankés
   */
  rank(
    results: SearchResult[],
    query: string,
    items?: CartaeItem[]
  ): SearchResult[] {
    const now = Date.now();

    // Ajouter des scores additionnels aux résultats
    const scored = results.map(result => {
      let score = result.score * 0.7; // 70% : similarité vectorielle

      // 15% : récence (items récents boostés)
      const item = items?.find(i => i.id === result.id);
      if (item?.updatedAt) {
        const age = (now - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24); // Days
        const recencyScore = Math.max(0, 1 - age / 365); // Decay sur 1 an
        score += recencyScore * 0.15;
      }

      // 15% : match direct dans le texte
      if (item && this.hasDirectMatch(query, item)) {
        score += 0.15;
      }

      return {
        ...result,
        score: Math.min(1, score), // Clamp à [0, 1]
      };
    });

    // Trier par score final
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Vérifie si la requête a un match direct dans l'item
   * @private
   */
  private hasDirectMatch(query: string, item: CartaeItem): boolean {
    const queryLower = query.toLowerCase();

    // Match dans le titre
    if (item.title?.toLowerCase().includes(queryLower)) {
      return true;
    }

    // Match dans le contenu (premières 200 chars seulement)
    if (item.content) {
      const contentPreview = item.content.substring(0, 200).toLowerCase();
      if (contentPreview.includes(queryLower)) {
        return true;
      }
    }

    // Match dans les tags
    if (item.tags) {
      for (const tag of item.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
    }

    return false;
  }
}
