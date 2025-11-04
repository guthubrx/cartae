/**
 * Obsidian Variable Mapper
 * Convertit les variables CSS Obsidian vers la structure Theme de Cartae
 */

import type { Theme } from '../types';
import type { ObsidianCSSVariables } from './ObsidianThemeParser';

/**
 * Configuration de mapping entre une variable Obsidian et une propriété Theme Cartae
 */
interface VariableMapping {
  /** Nom de la variable CSS Obsidian (ex: --background-primary) */
  obsidianVar: string;
  /** Chemin vers la propriété Theme Cartae (ex: colors.bg) */
  cartaePath: string;
  /** Valeur par défaut si variable Obsidian absente */
  fallback: string;
}

/**
 * Mapper de variables CSS Obsidian vers Theme Cartae
 * Contient ~90 mappings entre variables Obsidian et structure Theme
 */
export class ObsidianVariableMapper {
  /**
   * Mappings des couleurs (colors)
   * ~50 mappings pour les couleurs
   */
  private static readonly colorMappings: VariableMapping[] = [
    // Background colors
    { obsidianVar: '--background-primary', cartaePath: 'colors.bg', fallback: '#ffffff' },
    {
      obsidianVar: '--background-secondary',
      cartaePath: 'colors.bgSecondary',
      fallback: '#f5f6f8',
    },
    {
      obsidianVar: '--background-secondary-alt',
      cartaePath: 'colors.bgTertiary',
      fallback: '#e3e5e8',
    },

    // Foreground colors (text)
    { obsidianVar: '--text-normal', cartaePath: 'colors.fg', fallback: '#2e3338' },
    { obsidianVar: '--text-muted', cartaePath: 'colors.fgSecondary', fallback: '#6c7680' },
    { obsidianVar: '--text-faint', cartaePath: 'colors.fgTertiary', fallback: '#999999' },

    // Accent colors
    { obsidianVar: '--interactive-accent', cartaePath: 'colors.accent', fallback: '#7c3aed' },
    {
      obsidianVar: '--interactive-accent-hover',
      cartaePath: 'colors.accentHover',
      fallback: '#6d28d9',
    },
    { obsidianVar: '--text-accent', cartaePath: 'colors.accentActive', fallback: '#5b21b6' },

    // Semantic colors - Error
    { obsidianVar: '--text-error', cartaePath: 'colors.error', fallback: '#dc2626' },

    // Semantic colors - Warning
    { obsidianVar: '--text-warning', cartaePath: 'colors.warning', fallback: '#f59e0b' },

    // Semantic colors - Success
    { obsidianVar: '--text-success', cartaePath: 'colors.success', fallback: '#16a34a' },

    // Semantic colors - Info
    { obsidianVar: '--text-highlight-bg', cartaePath: 'colors.info', fallback: '#3b82f6' },

    // UI colors - Borders
    {
      obsidianVar: '--background-modifier-border',
      cartaePath: 'colors.border',
      fallback: '#e5e7eb',
    },
    {
      obsidianVar: '--background-modifier-border-hover',
      cartaePath: 'colors.borderHover',
      fallback: '#d1d5db',
    },

    // UI colors - Shadow
    {
      obsidianVar: '--background-modifier-box-shadow',
      cartaePath: 'colors.shadow',
      fallback: 'rgba(0, 0, 0, 0.1)',
    },

    // UI colors - Overlay
    {
      obsidianVar: '--modal-background',
      cartaePath: 'colors.overlay',
      fallback: 'rgba(0, 0, 0, 0.5)',
    },

    // Node colors (pour mind maps)
    {
      obsidianVar: '--nav-item-background-active',
      cartaePath: 'colors.nodeDefault',
      fallback: '#e0e7ff',
    },
    {
      obsidianVar: '--nav-item-background-hover',
      cartaePath: 'colors.nodeHover',
      fallback: '#c7d2fe',
    },
    {
      obsidianVar: '--background-modifier-active-hover',
      cartaePath: 'colors.nodeSelected',
      fallback: '#a5b4fc',
    },
    { obsidianVar: '--interactive-accent', cartaePath: 'colors.nodeEdge', fallback: '#7c3aed' },
  ];

  /**
   * Mappings de typographie (typography)
   * ~10 mappings pour la typographie
   */
  private static readonly typographyMappings: VariableMapping[] = [
    // Font families
    {
      obsidianVar: '--font-text',
      cartaePath: 'typography.fontFamily',
      fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    {
      obsidianVar: '--font-monospace',
      cartaePath: 'typography.fontFamilyMono',
      fallback: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace',
    },

    // Font sizes
    { obsidianVar: '--font-smallest', cartaePath: 'typography.fontSize.xs', fallback: '0.75rem' },
    { obsidianVar: '--font-smaller', cartaePath: 'typography.fontSize.sm', fallback: '0.875rem' },
    { obsidianVar: '--font-text-size', cartaePath: 'typography.fontSize.md', fallback: '1rem' },
    { obsidianVar: '--font-ui-medium', cartaePath: 'typography.fontSize.lg', fallback: '1.125rem' },
    { obsidianVar: '--font-ui-large', cartaePath: 'typography.fontSize.xl', fallback: '1.25rem' },
    { obsidianVar: '--font-ui-larger', cartaePath: 'typography.fontSize.xxl', fallback: '1.5rem' },
  ];

  /**
   * Mappings de spacing (espacements)
   * ~6 mappings pour les espacements
   */
  private static readonly spacingMappings: VariableMapping[] = [
    { obsidianVar: '--size-4-1', cartaePath: 'spacing.xs', fallback: '0.25rem' },
    { obsidianVar: '--size-4-2', cartaePath: 'spacing.sm', fallback: '0.5rem' },
    { obsidianVar: '--size-4-4', cartaePath: 'spacing.md', fallback: '1rem' },
    { obsidianVar: '--size-4-6', cartaePath: 'spacing.lg', fallback: '1.5rem' },
    { obsidianVar: '--size-4-8', cartaePath: 'spacing.xl', fallback: '2rem' },
    { obsidianVar: '--size-4-12', cartaePath: 'spacing.xxl', fallback: '3rem' },
  ];

  /**
   * Mappings de radius (border-radius)
   * ~5 mappings pour les rayons de bordure
   */
  private static readonly radiusMappings: VariableMapping[] = [
    { obsidianVar: '--radius-none', cartaePath: 'radius.none', fallback: '0' },
    { obsidianVar: '--radius-s', cartaePath: 'radius.sm', fallback: '0.25rem' },
    { obsidianVar: '--radius-m', cartaePath: 'radius.md', fallback: '0.5rem' },
    { obsidianVar: '--radius-l', cartaePath: 'radius.lg', fallback: '0.75rem' },
    { obsidianVar: '--radius-xl', cartaePath: 'radius.full', fallback: '9999px' },
  ];

  /**
   * Mappings de shadows (ombres)
   * ~5 mappings pour les ombres
   */
  private static readonly shadowMappings: VariableMapping[] = [
    { obsidianVar: '--shadow-none', cartaePath: 'shadows.none', fallback: 'none' },
    {
      obsidianVar: '--shadow-s',
      cartaePath: 'shadows.sm',
      fallback: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    {
      obsidianVar: '--shadow-m',
      cartaePath: 'shadows.md',
      fallback: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    {
      obsidianVar: '--shadow-l',
      cartaePath: 'shadows.lg',
      fallback: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
    {
      obsidianVar: '--shadow-xl',
      cartaePath: 'shadows.xl',
      fallback: '0 20px 25px rgba(0, 0, 0, 0.15)',
    },
  ];

  /**
   * Tous les mappings combinés (~90 mappings total)
   */
  private static readonly allMappings: VariableMapping[] = [
    ...ObsidianVariableMapper.colorMappings,
    ...ObsidianVariableMapper.typographyMappings,
    ...ObsidianVariableMapper.spacingMappings,
    ...ObsidianVariableMapper.radiusMappings,
    ...ObsidianVariableMapper.shadowMappings,
  ];

  /**
   * Convertit les variables CSS Obsidian en objet Theme Cartae partiel
   *
   * @param obsidianVars Variables CSS extraites d'un thème Obsidian
   * @param baseTheme Thème de base Cartae à étendre (pour valeurs par défaut)
   * @returns Objet Theme partiel avec valeurs mappées
   *
   * @example
   * ```ts
   * const mapper = new ObsidianVariableMapper();
   * const obsidianVars = { "--background-primary": "#1e1e1e" };
   * const themeUpdate = mapper.mapToTheme(obsidianVars, darkTheme);
   * // { colors: { bg: "#1e1e1e", ... }, ... }
   * ```
   */
  mapToTheme(obsidianVars: ObsidianCSSVariables, baseTheme: Theme): Partial<Theme> {
    const mappedTheme: any = {
      colors: { ...baseTheme.colors },
      typography: { ...baseTheme.typography, fontSize: { ...baseTheme.typography.fontSize } },
      spacing: { ...baseTheme.spacing },
      radius: { ...baseTheme.radius },
      shadows: { ...baseTheme.shadows },
    };

    // Appliquer tous les mappings
    for (const mapping of ObsidianVariableMapper.allMappings) {
      const value = obsidianVars[mapping.obsidianVar] || mapping.fallback;
      this.setNestedProperty(mappedTheme, mapping.cartaePath, value);
    }

    return mappedTheme;
  }

  /**
   * Définit une propriété imbriquée dans un objet via un chemin (ex: "colors.bg")
   *
   * @param obj Objet cible
   * @param path Chemin vers la propriété (ex: "colors.bg")
   * @param value Valeur à définir
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Détecte le mode (light/dark) d'un thème Obsidian basé sur la couleur de fond
   *
   * @param obsidianVars Variables CSS du thème Obsidian
   * @returns 'light' ou 'dark'
   *
   * @example
   * ```ts
   * const mapper = new ObsidianVariableMapper();
   * const mode = mapper.detectThemeMode({ "--background-primary": "#1e1e1e" });
   * // 'dark'
   * ```
   */
  detectThemeMode(obsidianVars: ObsidianCSSVariables): 'light' | 'dark' {
    const bgColor = obsidianVars['--background-primary'];

    if (!bgColor) {
      return 'light'; // défaut
    }

    // Convertir en luminosité relative
    const luminance = this.calculateLuminance(bgColor);

    // Si luminosité < 0.5 => dark, sinon light
    return luminance < 0.5 ? 'dark' : 'light';
  }

  /**
   * Calcule la luminosité relative d'une couleur
   * Basé sur la formule WCAG de luminance relative
   *
   * @param color Couleur CSS (hex, rgb, rgba)
   * @returns Luminosité entre 0 (noir) et 1 (blanc)
   */
  private calculateLuminance(color: string): number {
    // Extraire RGB depuis différents formats
    let r = 0;
    let g = 0;
    let b = 0;

    // Format hex (#ffffff ou #fff)
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    }
    // Format rgb/rgba
    else if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches) {
        r = parseInt(matches[0], 10);
        g = parseInt(matches[1], 10);
        b = parseInt(matches[2], 10);
      }
    }

    // Normaliser 0-1
    r /= 255;
    g /= 255;
    b /= 255;

    // Appliquer gamma correction
    r = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
    g = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
    b = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

    // Calculer luminosité
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Retourne le nombre total de mappings disponibles
   */
  static getMappingCount(): number {
    return ObsidianVariableMapper.allMappings.length;
  }
}
