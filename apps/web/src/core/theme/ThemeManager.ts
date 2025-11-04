/**
 * Theme Manager
 * Manages theme state and CSS variable generation
 */

import type { Theme } from './types';
import { lightTheme, darkTheme } from './defaultThemes';

export class ThemeManager {
  private static instance: ThemeManager;

  private currentTheme: Theme;

  private listeners = new Set<(theme: Theme) => void>();

  private systemThemeMediaQuery: MediaQueryList;

  private constructor() {
    // Start with light theme
    this.currentTheme = lightTheme;

    // Setup system theme detection
    this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemThemeMediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));

    // Load saved theme or use system preference
    this.loadSavedTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return { ...this.currentTheme };
  }

  /**
   * Set theme by ID
   */
  setTheme(themeId: string): void {
    let theme: Theme;

    switch (themeId) {
      case 'light':
        theme = lightTheme;
        break;
      case 'dark':
        theme = darkTheme;
        break;
      case 'system':
        theme = this.getSystemTheme();
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unknown theme: ${themeId}, using light theme`);
        theme = lightTheme;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(themeId);
    this.notifyListeners();
  }

  /**
   * Get system theme preference
   */
  private getSystemTheme(): Theme {
    return this.systemThemeMediaQuery.matches ? darkTheme : lightTheme;
  }

  /**
   * Handle system theme change
   */
  private handleSystemThemeChange(): void {
    const savedTheme = localStorage.getItem('bigmind-theme');

    // Only update if using system theme
    if (savedTheme === 'system' || !savedTheme) {
      this.setTheme('system');
    }
  }

  /**
   * Apply theme to DOM
   */
  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    // Apply colors (Niveau 1: Variables de base)
    const colorMapping = this.getColorMapping(theme);
    for (const [key, value] of Object.entries(colorMapping)) {
      root.style.setProperty(`--${key}`, value);
    }

    // Apply spacing (Niveau 1)
    for (const [key, value] of Object.entries(theme.spacing)) {
      root.style.setProperty(`--space-${key}`, value);
    }

    // Apply typography (Niveau 1)
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    root.style.setProperty('--font-family-mono', theme.typography.fontFamilyMono);

    for (const [key, value] of Object.entries(theme.typography.fontSize)) {
      root.style.setProperty(`--font-size-${key}`, value);
    }

    for (const [key, value] of Object.entries(theme.typography.fontWeight)) {
      root.style.setProperty(`--font-weight-${key}`, String(value));
    }

    for (const [key, value] of Object.entries(theme.typography.lineHeight)) {
      root.style.setProperty(`--line-height-${key}`, String(value));
    }

    // Apply radius (Niveau 1)
    for (const [key, value] of Object.entries(theme.radius)) {
      root.style.setProperty(`--border-radius-${key}`, value);
    }

    // Apply shadows (Niveau 1)
    for (const [key, value] of Object.entries(theme.shadows)) {
      root.style.setProperty(`--shadow-${key}`, value);
    }

    // Apply animation (Niveau 1)
    for (const [key, value] of Object.entries(theme.animation)) {
      root.style.setProperty(`--transition-${key}`, value);
    }

    // Apply z-index (Niveau 1)
    for (const [key, value] of Object.entries(theme.zIndex)) {
      root.style.setProperty(`--z-index-${this.kebabCase(key)}`, String(value));
    }

    // Set data attribute for theme mode
    root.setAttribute('data-theme', theme.mode);
  }

  /**
   * Map theme colors to CSS variables (Niveau 1)
   */
  private getColorMapping(theme: Theme): Record<string, string> {
    // Map des couleurs du thème vers les variables CSS de niveau 1
    const colorMap: Record<string, string> = {};

    // Couleurs primaires
    colorMap['color-white'] = theme.mode === 'light' ? '#ffffff' : '#171717';
    colorMap['color-black'] = theme.mode === 'light' ? '#171717' : '#fafafa';

    // Gray scale mapping
    if (theme.mode === 'light') {
      colorMap['color-gray-50'] = '#fafafa';
      colorMap['color-gray-100'] = '#f5f5f5';
      colorMap['color-gray-200'] = '#e5e5e5';
      colorMap['color-gray-300'] = '#d4d4d4';
      colorMap['color-gray-400'] = '#a3a3a3';
      colorMap['color-gray-500'] = '#737373';
      colorMap['color-gray-600'] = '#525252';
      colorMap['color-gray-700'] = '#404040';
      colorMap['color-gray-800'] = '#262626';
      colorMap['color-gray-900'] = '#171717';
    } else {
      colorMap['color-gray-50'] = '#171717';
      colorMap['color-gray-100'] = '#262626';
      colorMap['color-gray-200'] = '#404040';
      colorMap['color-gray-300'] = '#525252';
      colorMap['color-gray-400'] = '#737373';
      colorMap['color-gray-500'] = '#a3a3a3';
      colorMap['color-gray-600'] = '#d4d4d4';
      colorMap['color-gray-700'] = '#e5e5e5';
      colorMap['color-gray-800'] = '#f5f5f5';
      colorMap['color-gray-900'] = '#fafafa';
    }

    // Couleurs d'accent
    if (theme.mode === 'light') {
      colorMap['color-blue-500'] = '#3b82f6';
      colorMap['color-blue-400'] = '#60a5fa';
      colorMap['color-blue-300'] = '#93c5fd';
      colorMap['color-blue-200'] = '#bfdbfe';
      colorMap['color-blue-100'] = '#dbeafe';
      colorMap['color-blue-50'] = '#eff6ff';
    } else {
      colorMap['color-blue-500'] = '#60a5fa';
      colorMap['color-blue-400'] = '#3b82f6';
      colorMap['color-blue-300'] = '#2563eb';
      colorMap['color-blue-200'] = '#1d4ed8';
      colorMap['color-blue-100'] = '#1e40af';
      colorMap['color-blue-50'] = '#1e3a8a';
    }

    return colorMap;
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Save theme preference
   */
  private saveTheme(themeId: string): void {
    localStorage.setItem('bigmind-theme', themeId);
  }

  /**
   * Load saved theme
   */
  private loadSavedTheme(): void {
    const savedTheme = localStorage.getItem('bigmind-theme');

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Use system theme by default
      this.setTheme('system');
    }
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of theme change
   */
  private notifyListeners(): void {
    const theme = this.getTheme();
    this.listeners.forEach(listener => {
      try {
        listener(theme);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in theme listener:', error);
      }
    });
  }

  /**
   * Get CSS variable value
   */
  getCSSVariable(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  }

  /**
   * Set CSS variable
   */
  setCSSVariable(name: string, value: string): void {
    document.documentElement.style.setProperty(`--${name}`, value);
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();
