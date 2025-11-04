/**
 * Obsidian Theme Loader
 * Charge et applique dynamiquement des thèmes Obsidian dans Cartae
 */

import type { Theme } from '../types';
import { ThemeManager } from '../ThemeManager';
import { ObsidianThemeParser } from './ObsidianThemeParser';
import { ObsidianVariableMapper } from './ObsidianVariableMapper';
import { lightTheme, darkTheme } from '../defaultThemes';

/**
 * Options de chargement d'un thème Obsidian
 */
export interface ObsidianThemeLoadOptions {
  /** ID unique pour le thème chargé */
  themeId: string;
  /** Nom affiché du thème */
  themeName: string;
  /** Forcer un mode (sinon détection auto) */
  forceMode?: 'light' | 'dark';
}

/**
 * Résultat du chargement d'un thème
 */
export interface ObsidianThemeLoadResult {
  /** Succès du chargement */
  success: boolean;
  /** Thème chargé (si succès) */
  theme?: Theme;
  /** Message d'erreur (si échec) */
  error?: string;
}

/**
 * Loader pour charger et appliquer dynamiquement des thèmes Obsidian
 */
export class ObsidianThemeLoader {
  private parser: ObsidianThemeParser;

  private mapper: ObsidianVariableMapper;

  private themeManager: ThemeManager;

  constructor() {
    this.parser = new ObsidianThemeParser();
    this.mapper = new ObsidianVariableMapper();
    this.themeManager = ThemeManager.getInstance();
  }

  /**
   * Charge un thème Obsidian depuis une URL
   *
   * @param url URL du fichier CSS du thème
   * @param options Options de chargement
   * @returns Résultat du chargement
   *
   * @example
   * ```ts
   * const loader = new ObsidianThemeLoader();
   * const result = await loader.loadFromUrl(
   *   'https://example.com/theme.css',
   *   { themeId: 'custom-obsidian', themeName: 'Custom Theme' }
   * );
   * ```
   */
  async loadFromUrl(
    url: string,
    options: ObsidianThemeLoadOptions
  ): Promise<ObsidianThemeLoadResult> {
    try {
      // Parse les variables CSS
      const cssVariables = await this.parser.parseFromUrl(url);

      // Résoudre les références de variables
      const resolvedVariables = this.parser.resolveVariableReferences(cssVariables);

      // Créer le thème
      const theme = this.createTheme(resolvedVariables, options);

      // Appliquer le thème
      this.applyTheme(theme);

      return {
        success: true,
        theme,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load theme from URL: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Charge un thème Obsidian depuis un fichier local
   *
   * @param file Fichier CSS du thème
   * @param options Options de chargement
   * @returns Résultat du chargement
   *
   * @example
   * ```ts
   * const loader = new ObsidianThemeLoader();
   * const file = document.querySelector('input[type="file"]').files[0];
   * const result = await loader.loadFromFile(file, {
   *   themeId: 'custom-obsidian',
   *   themeName: 'Custom Theme'
   * });
   * ```
   */
  async loadFromFile(
    file: File,
    options: ObsidianThemeLoadOptions
  ): Promise<ObsidianThemeLoadResult> {
    try {
      // Parse les variables CSS
      const cssVariables = await this.parser.parseFromFile(file);

      // Résoudre les références de variables
      const resolvedVariables = this.parser.resolveVariableReferences(cssVariables);

      // Créer le thème
      const theme = this.createTheme(resolvedVariables, options);

      // Appliquer le thème
      this.applyTheme(theme);

      return {
        success: true,
        theme,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load theme from file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Charge un thème Obsidian depuis du contenu CSS brut
   *
   * @param cssContent Contenu CSS du thème
   * @param options Options de chargement
   * @returns Résultat du chargement
   *
   * @example
   * ```ts
   * const loader = new ObsidianThemeLoader();
   * const css = `:root { --background-primary: #1e1e1e; }`;
   * const result = await loader.loadFromCSS(css, {
   *   themeId: 'custom-obsidian',
   *   themeName: 'Custom Theme'
   * });
   * ```
   */
  async loadFromCSS(
    cssContent: string,
    options: ObsidianThemeLoadOptions
  ): Promise<ObsidianThemeLoadResult> {
    try {
      // Parse les variables CSS
      const cssVariables = this.parser.parse(cssContent);

      // Résoudre les références de variables
      const resolvedVariables = this.parser.resolveVariableReferences(cssVariables);

      // Créer le thème
      const theme = this.createTheme(resolvedVariables, options);

      // Appliquer le thème
      this.applyTheme(theme);

      return {
        success: true,
        theme,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load theme from CSS: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Crée un objet Theme Cartae depuis des variables Obsidian
   *
   * @param cssVariables Variables CSS résolues
   * @param options Options de chargement
   * @returns Thème Cartae complet
   */
  private createTheme(
    cssVariables: Record<string, string>,
    options: ObsidianThemeLoadOptions
  ): Theme {
    // Détecter le mode ou utiliser le mode forcé
    const mode = options.forceMode || this.mapper.detectThemeMode(cssVariables);

    // Choisir le thème de base selon le mode
    const baseTheme = mode === 'dark' ? darkTheme : lightTheme;

    // Mapper les variables vers la structure Theme
    const mappedTheme = this.mapper.mapToTheme(cssVariables, baseTheme);

    // Créer le thème complet
    const theme: Theme = {
      id: options.themeId,
      name: options.themeName,
      mode,
      colors: mappedTheme.colors || baseTheme.colors,
      spacing: mappedTheme.spacing || baseTheme.spacing,
      typography: mappedTheme.typography || baseTheme.typography,
      radius: mappedTheme.radius || baseTheme.radius,
      shadows: mappedTheme.shadows || baseTheme.shadows,
      animation: baseTheme.animation, // Pas de mapping pour animation
      zIndex: baseTheme.zIndex, // Pas de mapping pour zIndex
    };

    return theme;
  }

  /**
   * Applique un thème via le ThemeManager
   *
   * @param theme Thème à appliquer
   */
  private applyTheme(theme: Theme): void {
    // Note: ThemeManager n'a pas de méthode pour enregistrer un thème custom
    // Pour l'instant on applique directement les variables CSS
    const root = document.documentElement;

    // Appliquer toutes les propriétés du thème
    // Colors
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
    }

    // Spacing
    for (const [key, value] of Object.entries(theme.spacing)) {
      root.style.setProperty(`--spacing-${key}`, value);
    }

    // Typography
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    root.style.setProperty('--font-family-mono', theme.typography.fontFamilyMono);

    for (const [key, value] of Object.entries(theme.typography.fontSize)) {
      root.style.setProperty(`--font-size-${key}`, value);
    }

    // Radius
    for (const [key, value] of Object.entries(theme.radius)) {
      root.style.setProperty(`--radius-${key}`, value);
    }

    // Shadows
    for (const [key, value] of Object.entries(theme.shadows)) {
      root.style.setProperty(`--shadow-${key}`, value);
    }

    // Mode data attribute
    root.setAttribute('data-theme', theme.mode);
  }

  /**
   * Convertir camelCase en kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Supprime un thème Obsidian chargé (retour au thème par défaut)
   */
  unloadTheme(): void {
    // Retour au thème système
    this.themeManager.setTheme('system');
  }
}
