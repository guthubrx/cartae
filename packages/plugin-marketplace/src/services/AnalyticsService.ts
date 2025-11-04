/**
 * AnalyticsService - Collect and manage plugin analytics (Session 60D)
 */

import type { PluginListing } from '../types';

export interface PluginAnalytics {
  pluginId: string;
  pluginName: string;
  views: number;
  uniqueViews: number;
  downloads: number;
  installs: number;
  uninstalls: number;
  favorites: number;
  ratings: number;
  averageRating: number;
  ratingDistribution: number[]; // [1-star, 2-star, 3-star, 4-star, 5-star]
  dailyViews: Record<string, number>; // date -> count
  dailyDownloads: Record<string, number>; // date -> count
  topReferrers: Array<{ source: string; count: number }>;
  userEngagement: {
    avgTimeOnPage: number; // seconds
    bounceRate: number; // percentage
    conversionRate: number; // percentage
  };
  geographicData: Array<{ country: string; count: number }>;
  deviceData: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface AuthorAnalytics {
  authorId: string;
  totalPlugins: number;
  totalDownloads: number;
  totalRevenue?: number;
  averageRating: number;
  totalRatings: number;
  monthlyGrowth: {
    downloads: number;
    revenue?: number;
    ratings: number;
  };
  topPlugins: Array<{ pluginId: string; pluginName: string; downloads: number }>;
  performanceMetrics: {
    installToRatingRatio: number;
    downloadToInstallRatio: number;
    userRetention: number;
  };
}

export class AnalyticsService {
  private static readonly STORAGE_KEY = 'cartae-marketplace-analytics';

  private static readonly VIEWS_KEY = 'cartae-marketplace-views';

  /**
   * Track plugin view
   */
  static trackView(pluginId: string, pluginName: string): void {
    try {
      const today = new Date().toISOString().split('T')[0];
      const views = this.getViews();

      // Track unique views per day
      const viewKey = `${pluginId}-${today}`;
      if (!views[viewKey]) {
        views[viewKey] = 0;
      }
      views[viewKey]++;

      localStorage.setItem(this.VIEWS_KEY, JSON.stringify(views));

      // Update analytics data
      this.updatePluginAnalytics(pluginId, pluginName, {
        views: 1,
        uniqueViews: 1,
      });
    } catch (error) {
      console.error('[AnalyticsService] Failed to track view:', error);
    }
  }

  /**
   * Track plugin download
   */
  static trackDownload(pluginId: string, pluginName: string): void {
    try {
      const today = new Date().toISOString().split('T')[0];

      this.updatePluginAnalytics(pluginId, pluginName, {
        downloads: 1,
      });
    } catch (error) {
      console.error('[AnalyticsService] Failed to track download:', error);
    }
  }

  /**
   * Track plugin install
   */
  static trackInstall(pluginId: string, pluginName: string): void {
    try {
      this.updatePluginAnalytics(pluginId, pluginName, {
        installs: 1,
      });
    } catch (error) {
      console.error('[AnalyticsService] Failed to track install:', error);
    }
  }

  /**
   * Track plugin uninstall
   */
  static trackUninstall(pluginId: string, pluginName: string): void {
    try {
      this.updatePluginAnalytics(pluginId, pluginName, {
        uninstalls: 1,
      });
    } catch (error) {
      console.error('[AnalyticsService] Failed to track uninstall:', error);
    }
  }

  /**
   * Track plugin favorite
   */
  static trackFavorite(pluginId: string, pluginName: string): void {
    try {
      this.updatePluginAnalytics(pluginId, pluginName, {
        favorites: 1,
      });
    } catch (error) {
      console.error('[AnalyticsService] Failed to track favorite:', error);
    }
  }

  /**
   * Track plugin rating
   */
  static trackRating(pluginId: string, pluginName: string, rating: number): void {
    try {
      this.updatePluginAnalytics(pluginId, pluginName, {
        ratings: 1,
        ratingValue: rating,
      });
    } catch (error) {
      console.error('[AnalyticsService] Failed to track rating:', error);
    }
  }

  /**
   * Get plugin analytics
   */
  static getPluginAnalytics(pluginId: string): PluginAnalytics | null {
    try {
      const analytics = this.getAllAnalytics();
      return analytics.plugins[pluginId] || null;
    } catch (error) {
      console.error('[AnalyticsService] Failed to get plugin analytics:', error);
      return null;
    }
  }

  /**
   * Get author analytics
   */
  static getAuthorAnalytics(authorId: string, plugins: PluginListing[]): AuthorAnalytics | null {
    try {
      const authorPlugins = plugins.filter(p =>
        typeof p.author === 'string' ? p.author === authorId : p.author.name === authorId
      );

      if (authorPlugins.length === 0) return null;

      const analytics = this.getAllAnalytics();
      let totalDownloads = 0;
      let totalRatings = 0;
      let totalRatingSum = 0;
      const topPlugins: Array<{ pluginId: string; pluginName: string; downloads: number }> = [];

      authorPlugins.forEach(plugin => {
        const pluginAnalytics = analytics.plugins[plugin.id];
        if (pluginAnalytics) {
          totalDownloads += pluginAnalytics.downloads;
          totalRatings += pluginAnalytics.ratings;
          totalRatingSum += pluginAnalytics.averageRating * pluginAnalytics.ratings;

          topPlugins.push({
            pluginId: plugin.id,
            pluginName: plugin.name,
            downloads: pluginAnalytics.downloads,
          });
        }
      });

      topPlugins.sort((a, b) => b.downloads - a.downloads);

      return {
        authorId,
        totalPlugins: authorPlugins.length,
        totalDownloads,
        averageRating: totalRatings > 0 ? totalRatingSum / totalRatings : 0,
        totalRatings,
        monthlyGrowth: {
          downloads: 0, // Would need historical data
          ratings: 0,
        },
        topPlugins: topPlugins.slice(0, 5),
        performanceMetrics: {
          installToRatingRatio: totalDownloads > 0 ? totalRatings / totalDownloads : 0,
          downloadToInstallRatio: 0.8, // Placeholder
          userRetention: 0.75, // Placeholder
        },
      };
    } catch (error) {
      console.error('[AnalyticsService] Failed to get author analytics:', error);
      return null;
    }
  }

  /**
   * Get analytics summary for all plugins
   */
  static getAnalyticsSummary(plugins: PluginListing[]): {
    totalViews: number;
    totalDownloads: number;
    totalInstalls: number;
    totalFavorites: number;
    topPlugins: Array<{ pluginId: string; pluginName: string; views: number }>;
  } {
    try {
      const analytics = this.getAllAnalytics();
      let totalViews = 0;
      let totalDownloads = 0;
      let totalInstalls = 0;
      let totalFavorites = 0;
      const topPlugins: Array<{ pluginId: string; pluginName: string; views: number }> = [];

      plugins.forEach(plugin => {
        const pluginAnalytics = analytics.plugins[plugin.id];
        if (pluginAnalytics) {
          totalViews += pluginAnalytics.views;
          totalDownloads += pluginAnalytics.downloads;
          totalInstalls += pluginAnalytics.installs;
          totalFavorites += pluginAnalytics.favorites;

          topPlugins.push({
            pluginId: plugin.id,
            pluginName: plugin.name,
            views: pluginAnalytics.views,
          });
        }
      });

      topPlugins.sort((a, b) => b.views - a.views);

      return {
        totalViews,
        totalDownloads,
        totalInstalls,
        totalFavorites,
        topPlugins: topPlugins.slice(0, 10),
      };
    } catch (error) {
      console.error('[AnalyticsService] Failed to get analytics summary:', error);
      return {
        totalViews: 0,
        totalDownloads: 0,
        totalInstalls: 0,
        totalFavorites: 0,
        topPlugins: [],
      };
    }
  }

  /**
   * Clear all analytics data
   */
  static clearAnalytics(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.VIEWS_KEY);
    } catch (error) {
      console.error('[AnalyticsService] Failed to clear analytics:', error);
    }
  }

  /**
   * Export analytics data
   */
  static exportAnalytics(): string {
    try {
      const analytics = this.getAllAnalytics();
      return JSON.stringify(analytics, null, 2);
    } catch (error) {
      console.error('[AnalyticsService] Failed to export analytics:', error);
      return '{}';
    }
  }

  // Private methods

  private static getViews(): Record<string, number> {
    try {
      const stored = localStorage.getItem(this.VIEWS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  private static getAllAnalytics(): {
    plugins: Record<string, PluginAnalytics>;
  } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : { plugins: {} };
    } catch (error) {
      return { plugins: {} };
    }
  }

  private static updatePluginAnalytics(
    pluginId: string,
    pluginName: string,
    updates: Partial<PluginAnalytics> & { ratingValue?: number }
  ): void {
    try {
      const analytics = this.getAllAnalytics();
      const today = new Date().toISOString().split('T')[0];

      if (!analytics.plugins[pluginId]) {
        analytics.plugins[pluginId] = {
          pluginId,
          pluginName,
          views: 0,
          uniqueViews: 0,
          downloads: 0,
          installs: 0,
          uninstalls: 0,
          favorites: 0,
          ratings: 0,
          averageRating: 0,
          ratingDistribution: [0, 0, 0, 0, 0],
          dailyViews: {},
          dailyDownloads: {},
          topReferrers: [],
          userEngagement: {
            avgTimeOnPage: 0,
            bounceRate: 0,
            conversionRate: 0,
          },
          geographicData: [],
          deviceData: {
            desktop: 0,
            mobile: 0,
            tablet: 0,
          },
        };
      }

      const pluginAnalytics = analytics.plugins[pluginId];

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (key === 'ratingValue' && updates.ratingValue) {
          // Handle rating update
          const rating = updates.ratingValue;
          pluginAnalytics.ratings += 1;
          pluginAnalytics.ratingDistribution[rating - 1] += 1;

          // Recalculate average rating
          const totalRatings = pluginAnalytics.ratingDistribution.reduce(
            (sum, count) => sum + count,
            0
          );
          const ratingSum = pluginAnalytics.ratingDistribution.reduce(
            (sum, count, index) => sum + count * (index + 1),
            0
          );
          pluginAnalytics.averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
        } else if (key !== 'ratingValue') {
          (pluginAnalytics as any)[key] += (updates as any)[key];
        }
      });

      // Update daily data
      if (updates.views) {
        if (!pluginAnalytics.dailyViews[today]) {
          pluginAnalytics.dailyViews[today] = 0;
        }
        pluginAnalytics.dailyViews[today] += updates.views;
      }

      if (updates.downloads) {
        if (!pluginAnalytics.dailyDownloads[today]) {
          pluginAnalytics.dailyDownloads[today] = 0;
        }
        pluginAnalytics.dailyDownloads[today] += updates.downloads;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('[AnalyticsService] Failed to update plugin analytics:', error);
    }
  }
}
