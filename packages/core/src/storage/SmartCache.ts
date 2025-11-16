/**
 * SmartCache - Cache intelligent avec scoring de priorité
 *
 * Responsabilités :
 * - Calculer score de priorité par item
 * - Chargement sélectif initial (hot data)
 * - Eviction intelligente (low priority first)
 *
 * @module storage/SmartCache
 */

import type { CartaeItem } from '../types';
import type { CacheManager } from './CacheManager';
import type { CacheConfig, InitialLoadStrategy } from './CacheConfig';

/**
 * Score de priorité d'un item (0-100+)
 */
export interface PriorityScore {
  /** ID de l'item */
  itemId: string;

  /** Score total (0-100+) */
  total: number;

  /** Breakdown du score */
  breakdown: {
    /** Points pour status (unread, starred, etc.) */
    status: number;

    /** Points pour âge (récent vs vieux) */
    age: number;

    /** Points pour dernier accès */
    lastAccess: number;

    /** Points pour type d'item */
    type: number;
  };
}

/**
 * Métadonnées étendues pour scoring
 */
export interface ItemMetadata {
  /** Statut non lu ? */
  unread?: boolean;

  /** Item marqué (starred) ? */
  starred?: boolean;

  /** Item archivé ? */
  archived?: boolean;

  /** Priorité manuelle (high, medium, low) */
  priority?: 'high' | 'medium' | 'low';

  /** Dernière fois accédé */
  lastAccessedAt?: number;
}

/**
 * SmartCache - Gestion intelligente de la priorité des items
 */
export class SmartCache {
  private cacheManager: CacheManager;

  private config: CacheConfig;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.config = cacheManager.getConfig();
  }

  // ==========================================================================
  // Priority Scoring
  // ==========================================================================

  /**
   * Calculer le score de priorité d'un item
   *
   * Algorithme :
   * - Unread : +50 points
   * - Starred : +40 points
   * - Archived : -60 points
   * - Age : -2 points par jour
   * - Last access : +30 points si accédé aujourd'hui (décroit ensuite)
   * - Priority : high +20, medium +10, low 0
   */
  calculatePriority(item: CartaeItem): PriorityScore {
    const metadata = (item.metadata || {}) as ItemMetadata;
    const now = Date.now();

    let statusScore = 0;
    let ageScore = 0;
    let lastAccessScore = 0;
    let typeScore = 0;

    // ========================================================================
    // 1. Status Score
    // ========================================================================

    if (metadata.unread) {
      statusScore += 50; // Unread très important
    }

    if (metadata.starred) {
      statusScore += 40; // Starred important
    }

    if (metadata.archived) {
      statusScore -= 60; // Archived très bas
    }

    // Priority manuelle
    if (metadata.priority === 'high') {
      statusScore += 20;
    } else if (metadata.priority === 'medium') {
      statusScore += 10;
    }

    // ========================================================================
    // 2. Age Score (pénalité pour items vieux)
    // ========================================================================

    const createdAtTimestamp = item.createdAt ? new Date(item.createdAt).getTime() : now;
    const ageInDays = (now - createdAtTimestamp) / (1000 * 60 * 60 * 24);
    ageScore = Math.max(-100, -ageInDays * 2); // -2 points par jour (plafonné à -100)

    // ========================================================================
    // 3. Last Access Score (boost si accédé récemment)
    // ========================================================================

    if (metadata.lastAccessedAt) {
      const lastAccessDays = (now - metadata.lastAccessedAt) / (1000 * 60 * 60 * 24);
      lastAccessScore = Math.max(0, 30 - lastAccessDays * 3); // +30 si aujourd'hui, décroit rapidement
    }

    // ========================================================================
    // 4. Type Score (certains types plus importants)
    // ========================================================================

    const itemType = item.type?.toLowerCase() || 'other';

    if (itemType === 'email' || itemType === 'message') {
      typeScore = 10; // Emails prioritaires
    } else if (itemType === 'task' || itemType === 'todo') {
      typeScore = 8; // Tasks importants
    } else if (itemType === 'event' || itemType === 'calendar') {
      typeScore = 6; // Events moyens
    } else if (itemType === 'note' || itemType === 'document') {
      typeScore = 4; // Notes moins prioritaires
    }

    // ========================================================================
    // Total Score
    // ========================================================================

    const total = Math.max(0, statusScore + ageScore + lastAccessScore + typeScore);

    return {
      itemId: item.id,
      total,
      breakdown: {
        status: statusScore,
        age: ageScore,
        lastAccess: lastAccessScore,
        type: typeScore,
      },
    };
  }

  /**
   * Calculer scores pour plusieurs items
   */
  calculatePriorities(items: CartaeItem[]): PriorityScore[] {
    return items.map(item => this.calculatePriority(item));
  }

  /**
   * Trier items par priorité (high → low)
   */
  sortByPriority(items: CartaeItem[]): CartaeItem[] {
    const scores = this.calculatePriorities(items);

    // Map items avec leurs scores
    const itemsWithScores = items.map((item, index) => ({
      item,
      score: scores[index].total,
    }));

    // Trier par score décroissant
    itemsWithScores.sort((a, b) => b.score - a.score);

    return itemsWithScores.map(x => x.item);
  }

  // ==========================================================================
  // Smart Loading
  // ==========================================================================

  /**
   * Sélectionner items à charger initialement selon stratégie
   *
   * @param allItems Tous les items disponibles
   * @returns Items à charger
   */
  selectInitialItems(allItems: CartaeItem[]): CartaeItem[] {
    const strategy = this.config.initialLoadStrategy;
    const maxItems = this.config.initialLoadMaxItems;

    switch (strategy) {
      case 'all':
        // Charger tout
        return allItems;

      case 'minimal':
        // Charger seulement les N items les plus récents
        return allItems
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, maxItems);

      case 'smart':
      default:
        // Charger les N items avec le meilleur score de priorité
        return this.sortByPriority(allItems).slice(0, maxItems);
    }
  }

  // ==========================================================================
  // Smart Eviction
  // ==========================================================================

  /**
   * Sélectionner items à évincer intelligemment
   *
   * Combine LRU avec scoring de priorité :
   * - Items avec score bas sont évincés en premier
   * - Parmi items avec score similaire, évince les LRU
   *
   * @param items Items candidats à l'éviction
   * @param count Nombre d'items à évincer
   * @returns IDs des items à supprimer
   */
  selectItemsToEvict(items: CartaeItem[], count: number): string[] {
    // Calculer scores de priorité
    const scores = this.calculatePriorities(items);

    // Récupérer métadonnées LRU depuis CacheManager
    const allMetadata = this.cacheManager.getAllMetadata();
    const metadataMap = new Map(allMetadata.map(m => [m.id, m]));

    // Combiner scores + LRU
    const itemsWithCombinedScore = items.map((item, index) => {
      const priorityScore = scores[index].total;
      const metadata = metadataMap.get(item.id);
      const lruScore = metadata ? metadata.lastAccessedAt : 0;

      // Score combiné : priorité basse + LRU ancien = bon candidat éviction
      // Plus le score est bas, plus l'item est candidat
      const combinedScore = priorityScore * 0.7 + (lruScore / 1000000) * 0.3;

      return {
        id: item.id,
        priorityScore,
        lruScore,
        combinedScore,
      };
    });

    // Trier par score combiné croissant (les plus faibles en premier)
    itemsWithCombinedScore.sort((a, b) => a.combinedScore - b.combinedScore);

    // Prendre les N premiers
    return itemsWithCombinedScore.slice(0, count).map(x => x.id);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Identifier "hot data" (items chauds)
   *
   * Critères :
   * - Score de priorité > 50
   * - Accédé dans les 7 derniers jours
   */
  identifyHotData(items: CartaeItem[]): CartaeItem[] {
    const scores = this.calculatePriorities(items);
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return items.filter((item, index) => {
      const score = scores[index].total;
      const metadata = (item.metadata || {}) as ItemMetadata;
      const lastAccess = metadata.lastAccessedAt || 0;

      return score > 50 || lastAccess > sevenDaysAgo;
    });
  }

  /**
   * Identifier "cold data" (items froids)
   *
   * Critères :
   * - Score de priorité < 20
   * - Pas accédé depuis 30+ jours
   */
  identifyColdData(items: CartaeItem[]): CartaeItem[] {
    const scores = this.calculatePriorities(items);
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    return items.filter((item, index) => {
      const score = scores[index].total;
      const metadata = (item.metadata || {}) as ItemMetadata;
      const lastAccess = metadata.lastAccessedAt || 0;

      return score < 20 && lastAccess < thirtyDaysAgo;
    });
  }

  /**
   * Obtenir statistiques de priorité
   */
  getPriorityStats(items: CartaeItem[]): {
    avgScore: number;
    minScore: number;
    maxScore: number;
    hotCount: number;
    coldCount: number;
  } {
    const scores = this.calculatePriorities(items);
    const hotItems = this.identifyHotData(items);
    const coldItems = this.identifyColdData(items);

    const totalScores = scores.map(s => s.total);

    return {
      avgScore: totalScores.reduce((sum, s) => sum + s, 0) / totalScores.length || 0,
      minScore: Math.min(...totalScores),
      maxScore: Math.max(...totalScores),
      hotCount: hotItems.length,
      coldCount: coldItems.length,
    };
  }
}
