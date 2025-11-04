/**
 * FavoritesService - Manage user favorite plugins (Session 60C)
 */

export class FavoritesService {
  private static readonly STORAGE_KEY = 'cartae-marketplace-favorites';

  /**
   * Get user's favorite plugins
   */
  static getFavorites(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[FavoritesService] Failed to load favorites:', error);
      return [];
    }
  }

  /**
   * Add plugin to favorites
   */
  static addFavorite(pluginId: string): void {
    try {
      const favorites = this.getFavorites();
      if (!favorites.includes(pluginId)) {
        favorites.push(pluginId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('[FavoritesService] Failed to add favorite:', error);
    }
  }

  /**
   * Remove plugin from favorites
   */
  static removeFavorite(pluginId: string): void {
    try {
      const favorites = this.getFavorites();
      const updated = favorites.filter(id => id !== pluginId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[FavoritesService] Failed to remove favorite:', error);
    }
  }

  /**
   * Check if plugin is in favorites
   */
  static isFavorite(pluginId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.includes(pluginId);
  }

  /**
   * Toggle favorite status
   */
  static toggleFavorite(pluginId: string): boolean {
    if (this.isFavorite(pluginId)) {
      this.removeFavorite(pluginId);
      return false;
    }
    this.addFavorite(pluginId);
    return true;
  }

  /**
   * Clear all favorites
   */
  static clearFavorites(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[FavoritesService] Failed to clear favorites:', error);
    }
  }

  /**
   * Get count of favorites
   */
  static getFavoritesCount(): number {
    return this.getFavorites().length;
  }
}
