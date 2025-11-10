/**
 * Theme Manager
 * Manages theme state and CSS variable generation
 * Enhanced with adaptive color palette support (Session 69)
 */

import type { Theme } from './types';
import { lightTheme, darkTheme } from './defaultThemes';
import type { ColorPalette } from '../../themes/colorPalettes';
import { getPalette } from '../../themes/colorPalettes';
import {
  generatePaletteCSSVariables,
  injectPaletteCSS,
  removePaletteCSS,
  type PaletteCSSMapping,
} from '../../themes/paletteThemeMapper';

export class ThemeManager {
  private static instance: ThemeManager;

  private currentTheme: Theme;

  private listeners = new Set<(theme: Theme) => void>();

  private systemThemeMediaQuery: MediaQueryList;

  // Session 69: Adaptive palette support
  private currentPaletteId: string = 'vibrant'; // Default palette
  private currentPalette: ColorPalette | null = null;
  private currentPaletteMapping: PaletteCSSMapping | null = null;
  private paletteListeners = new Set<(paletteId: string, palette: ColorPalette) => void>();

  private constructor() {
    // Start with light theme
    this.currentTheme = lightTheme;

    // Setup system theme detection
    this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemThemeMediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));

    // Load saved theme or use system preference
    this.loadSavedTheme();

    // Session 69: Load saved palette or use default
    this.loadSavedPalette();
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

    // Session 69: Update palette CSS variables for new theme mode
    this.updatePaletteAfterThemeChange();
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

    // Apply colors
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
    }

    // Apply spacing
    for (const [key, value] of Object.entries(theme.spacing)) {
      root.style.setProperty(`--spacing-${key}`, value);
    }

    // Apply typography
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

    // Apply radius
    for (const [key, value] of Object.entries(theme.radius)) {
      root.style.setProperty(`--radius-${key}`, value);
    }

    // Apply shadows
    for (const [key, value] of Object.entries(theme.shadows)) {
      root.style.setProperty(`--shadow-${key}`, value);
    }

    // Apply animation
    for (const [key, value] of Object.entries(theme.animation)) {
      root.style.setProperty(`--animation-${key}`, value);
    }

    // Apply z-index
    for (const [key, value] of Object.entries(theme.zIndex)) {
      root.style.setProperty(`--z-index-${this.kebabCase(key)}`, String(value));
    }

    // Set data attribute for theme mode
    root.setAttribute('data-theme', theme.mode);
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

  // ============================================================
  // Session 69: Adaptive Palette Methods
  // ============================================================

  /**
   * Get current palette ID
   */
  getPaletteId(): string {
    return this.currentPaletteId;
  }

  /**
   * Get current palette
   */
  getPalette(): ColorPalette | null {
    return this.currentPalette;
  }

  /**
   * Get current palette mapping
   */
  getPaletteMapping(): PaletteCSSMapping | null {
    return this.currentPaletteMapping;
  }

  /**
   * Set color palette
   */
  setPalette(paletteId: string): void {
    if (paletteId === this.currentPaletteId) {
      return; // No change
    }

    // Load palette
    const palette = getPalette(paletteId);

    this.currentPaletteId = paletteId;
    this.currentPalette = palette;

    // Apply palette CSS variables
    this.applyPaletteCSSVariables();

    // Save to localStorage
    this.savePalette(paletteId);

    // Notify listeners
    this.notifyPaletteListeners();
  }

  /**
   * Apply palette CSS variables to DOM
   * @private
   */
  private applyPaletteCSSVariables(): void {
    if (!this.currentPalette) {
      return;
    }

    // Determine current theme mode (light/dark)
    const themeMode = this.currentTheme.mode === 'dark' ? 'dark' : 'light';

    // Generate CSS mapping
    this.currentPaletteMapping = generatePaletteCSSVariables(
      this.currentPalette,
      themeMode
    );

    // Inject into DOM
    injectPaletteCSS(this.currentPaletteMapping, 'cartae-palette-variables');
  }

  /**
   * Load saved palette from localStorage
   * @private
   */
  private loadSavedPalette(): void {
    const savedPaletteId = localStorage.getItem('cartae-palette');

    if (savedPaletteId) {
      this.setPalette(savedPaletteId);
    } else {
      // Use default palette
      this.setPalette(this.currentPaletteId);
    }
  }

  /**
   * Save palette preference to localStorage
   * @private
   */
  private savePalette(paletteId: string): void {
    localStorage.setItem('cartae-palette', paletteId);
  }

  /**
   * Subscribe to palette changes
   */
  subscribeToPalette(listener: (paletteId: string, palette: ColorPalette) => void): () => void {
    this.paletteListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.paletteListeners.delete(listener);
    };
  }

  /**
   * Notify palette listeners
   * @private
   */
  private notifyPaletteListeners(): void {
    if (!this.currentPalette) return;

    const paletteId = this.currentPaletteId;
    const palette = this.currentPalette;

    this.paletteListeners.forEach(listener => {
      try {
        listener(paletteId, palette);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in palette listener:', error);
      }
    });
  }

  /**
   * Update palette CSS variables when theme changes
   * Should be called after theme change to regenerate palette CSS with new theme mode
   * @private
   */
  private updatePaletteAfterThemeChange(): void {
    if (this.currentPalette) {
      this.applyPaletteCSSVariables();
    }
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();
