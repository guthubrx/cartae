/**
 * RecommendationService - Plugin recommendation engine (Session 60B)
 */

import type { PluginListing } from '../types';

export interface RecommendationOptions {
  maxResults?: number;
  similarityThreshold?: number;
  includePopular?: boolean;
}

export class RecommendationService {
  private static instance: RecommendationService;

  private cache = new Map<string, PluginListing[]>();

  static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  /**
   * Get similar plugins based on various criteria
   */
  getSimilarPlugins(
    targetPlugin: PluginListing,
    allPlugins: PluginListing[],
    options: RecommendationOptions = {}
  ): PluginListing[] {
    const { maxResults = 6, similarityThreshold = 0.3, includePopular = true } = options;

    const cacheKey = this.generateCacheKey(targetPlugin.id, options);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.slice(0, maxResults);
    }

    const scoredPlugins = allPlugins
      .filter(plugin => plugin.id !== targetPlugin.id)
      .map(plugin => ({
        plugin,
        score: this.calculateSimilarityScore(targetPlugin, plugin),
      }))
      .filter(item => item.score >= similarityThreshold)
      .sort((a, b) => b.score - a.score);

    let recommendations = scoredPlugins.map(item => item.plugin);

    // If not enough similar plugins, include popular ones
    if (recommendations.length < maxResults && includePopular) {
      const popularPlugins = this.getPopularPlugins(
        allPlugins,
        maxResults - recommendations.length
      );
      recommendations = [...recommendations, ...popularPlugins];
    }

    // Remove duplicates and limit results
    recommendations = this.removeDuplicates(recommendations).slice(0, maxResults);

    this.cache.set(cacheKey, recommendations);
    return recommendations;
  }

  /**
   * Get plugins that are often installed together
   */
  getCrossSellPlugins(
    targetPlugin: PluginListing,
    allPlugins: PluginListing[],
    maxResults: number = 4
  ): PluginListing[] {
    // Simple implementation based on category and tags similarity
    return allPlugins
      .filter(
        plugin =>
          plugin.id !== targetPlugin.id &&
          (plugin.category === targetPlugin.category ||
            this.hasCommonTags(plugin.tags || [], targetPlugin.tags || []))
      )
      .sort((a, b) => {
        // Prioritize by downloads and rating
        const aScore = (a.downloads || 0) + (a.rating || 0) * 1000;
        const bScore = (b.downloads || 0) + (b.rating || 0) * 1000;
        return bScore - aScore;
      })
      .slice(0, maxResults);
  }

  /**
   * Get trending plugins based on recent activity
   */
  getTrendingPlugins(allPlugins: PluginListing[], maxResults: number = 8): PluginListing[] {
    return allPlugins
      .filter(plugin => plugin.downloads && plugin.downloads > 100)
      .sort((a, b) => {
        // Simple trending algorithm based on downloads and recent updates
        const aTrend = (a.downloads || 0) * this.getRecencyFactor(a.updatedAt);
        const bTrend = (b.downloads || 0) * this.getRecencyFactor(b.updatedAt);
        return bTrend - aTrend;
      })
      .slice(0, maxResults);
  }

  /**
   * Clear recommendation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Calculate similarity score between two plugins
   */
  private calculateSimilarityScore(pluginA: PluginListing, pluginB: PluginListing): number {
    let score = 0;
    let totalWeight = 0;

    // Category similarity (weight: 0.4)
    if (pluginA.category && pluginB.category) {
      const categoryWeight = 0.4;
      totalWeight += categoryWeight;
      score += pluginA.category === pluginB.category ? categoryWeight : 0;
    }

    // Tag similarity (weight: 0.3)
    const tagWeight = 0.3;
    totalWeight += tagWeight;
    const tagSimilarity = this.calculateTagSimilarity(pluginA.tags || [], pluginB.tags || []);
    score += tagSimilarity * tagWeight;

    // Description similarity (weight: 0.2)
    const descWeight = 0.2;
    totalWeight += descWeight;
    const descSimilarity = this.calculateTextSimilarity(
      pluginA.description.toLowerCase(),
      pluginB.description.toLowerCase()
    );
    score += descSimilarity * descWeight;

    // Pricing similarity (weight: 0.1)
    const pricingWeight = 0.1;
    totalWeight += pricingWeight;
    score += pluginA.pricing === pluginB.pricing ? pricingWeight : 0;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Calculate similarity between two tag arrays
   */
  private calculateTagSimilarity(tagsA: string[], tagsB: string[]): number {
    if (tagsA.length === 0 && tagsB.length === 0) return 0;

    const commonTags = tagsA.filter(tag => tagsB.includes(tag));
    const totalTags = new Set([...tagsA, ...tagsB]).size;

    return totalTags > 0 ? commonTags.length / totalTags : 0;
  }

  /**
   * Simple text similarity using common words
   */
  private calculateTextSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.split(/\s+/));
    const wordsB = new Set(textB.split(/\s+/));

    const commonWords = [...wordsA].filter(word => wordsB.has(word));
    const totalWords = new Set([...wordsA, ...wordsB]).size;

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Get popular plugins based on downloads and ratings
   */
  private getPopularPlugins(plugins: PluginListing[], maxResults: number): PluginListing[] {
    return plugins
      .filter(plugin => plugin.downloads && plugin.downloads > 0)
      .sort((a, b) => {
        const aPopularity = (a.downloads || 0) * (a.rating || 1);
        const bPopularity = (b.downloads || 0) * (b.rating || 1);
        return bPopularity - aPopularity;
      })
      .slice(0, maxResults);
  }

  /**
   * Check if two plugins have common tags
   */
  private hasCommonTags(tagsA: string[], tagsB: string[]): boolean {
    return tagsA.some(tag => tagsB.includes(tag));
  }

  /**
   * Calculate recency factor for trending algorithm
   */
  private getRecencyFactor(updatedAt: string): number {
    const updateDate = new Date(updatedAt);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24);

    // More recent updates get higher factor
    return Math.max(0.1, 1 - daysSinceUpdate / 30); // Decay over 30 days
  }

  /**
   * Remove duplicate plugins from array
   */
  private removeDuplicates(plugins: PluginListing[]): PluginListing[] {
    const seen = new Set<string>();
    return plugins.filter(plugin => {
      if (seen.has(plugin.id)) return false;
      seen.add(plugin.id);
      return true;
    });
  }

  /**
   * Generate cache key for recommendations
   */
  private generateCacheKey(pluginId: string, options: RecommendationOptions): string {
    return `${pluginId}-${JSON.stringify(options)}`;
  }
}
