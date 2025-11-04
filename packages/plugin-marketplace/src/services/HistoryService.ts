/**
 * HistoryService - Manage user plugin viewing history (Session 60C)
 */

export interface ViewHistoryItem {
  pluginId: string;
  pluginName: string;
  viewedAt: string;
  category?: string;
}

export class HistoryService {
  private static readonly STORAGE_KEY = 'cartae-marketplace-history';

  private static readonly MAX_HISTORY_ITEMS = 50;

  /**
   * Get user's viewing history
   */
  static getHistory(): ViewHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[HistoryService] Failed to load history:', error);
      return [];
    }
  }

  /**
   * Add plugin to viewing history
   */
  static addToHistory(pluginId: string, pluginName: string, category?: string): void {
    try {
      const history = this.getHistory();

      // Remove existing entry for this plugin (if any)
      const filteredHistory = history.filter(item => item.pluginId !== pluginId);

      // Add new entry at the beginning
      const newEntry: ViewHistoryItem = {
        pluginId,
        pluginName,
        viewedAt: new Date().toISOString(),
        category,
      };

      const updatedHistory = [newEntry, ...filteredHistory];

      // Limit history size
      const limitedHistory = updatedHistory.slice(0, this.MAX_HISTORY_ITEMS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('[HistoryService] Failed to add to history:', error);
    }
  }

  /**
   * Remove plugin from viewing history
   */
  static removeFromHistory(pluginId: string): void {
    try {
      const history = this.getHistory();
      const updated = history.filter(item => item.pluginId !== pluginId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[HistoryService] Failed to remove from history:', error);
    }
  }

  /**
   * Clear all viewing history
   */
  static clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[HistoryService] Failed to clear history:', error);
    }
  }

  /**
   * Get recent history (last N items)
   */
  static getRecentHistory(limit: number = 10): ViewHistoryItem[] {
    const history = this.getHistory();
    return history.slice(0, limit);
  }

  /**
   * Check if plugin is in recent history
   */
  static isInRecentHistory(pluginId: string, hours: number = 24): boolean {
    const history = this.getHistory();
    const item = history.find(h => h.pluginId === pluginId);
    if (!item) return false;

    const viewedTime = new Date(item.viewedAt).getTime();
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

    return viewedTime > cutoffTime;
  }

  /**
   * Get history grouped by category
   */
  static getHistoryByCategory(): Record<string, ViewHistoryItem[]> {
    const history = this.getHistory();
    const grouped: Record<string, ViewHistoryItem[]> = {};

    history.forEach(item => {
      const category = item.category || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  }

  /**
   * Get count of history items
   */
  static getHistoryCount(): number {
    return this.getHistory().length;
  }
}
