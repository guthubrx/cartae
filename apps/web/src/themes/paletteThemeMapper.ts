/**
 * FR: Mapper de palettes adaptatives selon le thème (light/dark)
 * EN: Adaptive palette mapper based on theme (light/dark)
 *
 * Ce module centralise la logique de mapping des palettes de couleurs
 * vers les variables CSS custom properties, en s'adaptant au thème actif.
 * Inspiré de Material Design 3, Apple HIG, Fluent Design, et Obsidian.
 */

import type { ColorPalette } from './colorPalettes';
import {
  getPaletteColorsForTheme,
  getCanvasBackgroundForTheme,
  getSemanticColors,
  getPaletteForTheme,
} from './colorPalettes';

/**
 * FR: Configuration du mapper de palette
 * EN: Palette mapper configuration
 */
export interface PaletteMapperConfig {
  /**
   * FR: Préfixe pour les variables CSS de palette
   * EN: Prefix for palette CSS variables
   * @default "--palette-"
   */
  palettePrefix?: string;
  /**
   * FR: Préfixe pour les variables CSS sémantiques
   * EN: Prefix for semantic CSS variables
   * @default "--palette-semantic-"
   */
  semanticPrefix?: string;
  /**
   * FR: Préfixe pour les variables CSS de canvas
   * EN: Prefix for canvas CSS variables
   * @default "--canvas-"
   */
  canvasPrefix?: string;
  /**
   * FR: Activer le mode debug (log dans console)
   * EN: Enable debug mode (console logging)
   * @default false
   */
  debug?: boolean;
}

/**
 * FR: Résultat du mapping de palette vers CSS
 * EN: Result of palette mapping to CSS
 */
export interface PaletteCSSMapping {
  /**
   * FR: Variables CSS générées
   * EN: Generated CSS variables
   */
  cssVariables: Record<string, string>;
  /**
   * FR: Styles CSS formatés (prêts à injecter)
   * EN: Formatted CSS styles (ready to inject)
   */
  cssString: string;
  /**
   * FR: Palette source utilisée
   * EN: Source palette used
   */
  sourcePalette: ColorPalette;
  /**
   * FR: Thème actif
   * EN: Active theme
   */
  themeId: 'light' | 'dark';
}

const DEFAULT_CONFIG: Required<PaletteMapperConfig> = {
  palettePrefix: '--palette-color-',
  semanticPrefix: '--palette-semantic-',
  canvasPrefix: '--canvas-',
  debug: false,
};

/**
 * FR: Génère les variables CSS pour une palette selon le thème
 * EN: Generates CSS variables for a palette based on theme
 *
 * @param palette - La palette à mapper
 * @param themeId - ID du thème actif ('light' ou 'dark')
 * @param config - Configuration du mapper (optionnel)
 * @returns Mapping CSS complet avec variables et styles
 *
 * @example
 * ```ts
 * const mapping = generatePaletteCSSVariables(myPalette, 'dark');
 * console.log(mapping.cssString);
 * // Output:
 * // :root {
 * //   --palette-color-0: #1a1a1a;
 * //   --palette-color-1: #2a2a2a;
 * //   --palette-semantic-primary: #0078d4;
 * //   --canvas-background: #0f0f0f;
 * // }
 * ```
 */
export function generatePaletteCSSVariables(
  palette: ColorPalette,
  themeId: 'light' | 'dark',
  config?: PaletteMapperConfig
): PaletteCSSMapping {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cssVariables: Record<string, string> = {};

  // Résoudre la palette pour le thème
  const resolvedPalette = getPaletteForTheme(palette, themeId);
  const { resolvedColors, resolvedCanvasBackground, resolvedSemantic } = resolvedPalette;

  // 1. Mapper les couleurs de palette (0-9 ou plus)
  resolvedColors.forEach((color, index) => {
    const varName = `${cfg.palettePrefix}${index}`;
    cssVariables[varName] = color;
  });

  // 2. Mapper le background de canvas (si défini)
  if (resolvedCanvasBackground) {
    cssVariables[`${cfg.canvasPrefix}background`] = resolvedCanvasBackground;
  }

  // 3. Mapper les couleurs sémantiques (primary, secondary, etc.)
  if (resolvedSemantic) {
    Object.entries(resolvedSemantic).forEach(([key, value]) => {
      const varName = `${cfg.semanticPrefix}${key}`;
      cssVariables[varName] = value;
    });
  }

  // Générer le string CSS
  const cssString = generateCSSString(cssVariables, themeId);

  if (cfg.debug) {
    console.log('[PaletteMapper] Generated CSS variables:', cssVariables);
  }

  return {
    cssVariables,
    cssString,
    sourcePalette: palette,
    themeId,
  };
}

/**
 * FR: Génère le string CSS à partir des variables
 * EN: Generates CSS string from variables
 *
 * @param variables - Record de variables CSS (nom → valeur)
 * @param themeId - ID du thème (pour ajouter classe si nécessaire)
 * @returns String CSS formaté
 */
function generateCSSString(
  variables: Record<string, string>,
  themeId: 'light' | 'dark'
): string {
  const entries = Object.entries(variables);
  if (entries.length === 0) {
    return '';
  }

  const variableLines = entries
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');

  // Générer CSS avec classe de thème (style Obsidian)
  return `.theme-${themeId} {\n${variableLines}\n}`;
}

/**
 * FR: Applique les variables CSS au DOM
 * EN: Applies CSS variables to DOM
 *
 * @param mapping - Mapping CSS à appliquer
 * @param target - Élément cible (défaut: document.documentElement)
 *
 * @example
 * ```ts
 * const mapping = generatePaletteCSSVariables(myPalette, 'dark');
 * applyPaletteCSSVariables(mapping);
 * ```
 */
export function applyPaletteCSSVariables(
  mapping: PaletteCSSMapping,
  target: HTMLElement = document.documentElement
): void {
  // Appliquer chaque variable CSS directement sur l'élément cible
  Object.entries(mapping.cssVariables).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}

/**
 * FR: Injecte un style CSS dans le DOM
 * EN: Injects CSS style into DOM
 *
 * @param mapping - Mapping CSS à injecter
 * @param styleId - ID du <style> tag (pour update/remove ultérieur)
 * @returns Élément <style> créé ou mis à jour
 *
 * @example
 * ```ts
 * const mapping = generatePaletteCSSVariables(myPalette, 'dark');
 * injectPaletteCSS(mapping, 'cartae-palette-vars');
 * ```
 */
export function injectPaletteCSS(
  mapping: PaletteCSSMapping,
  styleId: string = 'cartae-palette-variables'
): HTMLStyleElement {
  // Chercher style existant ou créer nouveau
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Mettre à jour le contenu
  styleEl.textContent = mapping.cssString;

  return styleEl;
}

/**
 * FR: Retire les variables CSS de palette du DOM
 * EN: Removes palette CSS variables from DOM
 *
 * @param target - Élément cible (défaut: document.documentElement)
 * @param config - Configuration du mapper (pour déterminer les préfixes)
 */
export function removePaletteCSSVariables(
  target: HTMLElement = document.documentElement,
  config?: PaletteMapperConfig
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Récupérer toutes les variables CSS de l'élément
  const styles = target.style;
  const variablesToRemove: string[] = [];

  // Identifier toutes les variables avec nos préfixes
  for (let i = 0; i < styles.length; i++) {
    const propertyName = styles[i];
    if (
      propertyName.startsWith(cfg.palettePrefix) ||
      propertyName.startsWith(cfg.semanticPrefix) ||
      propertyName.startsWith(cfg.canvasPrefix)
    ) {
      variablesToRemove.push(propertyName);
    }
  }

  // Supprimer chaque variable
  variablesToRemove.forEach(varName => {
    target.style.removeProperty(varName);
  });
}

/**
 * FR: Retire le <style> tag injecté du DOM
 * EN: Removes injected <style> tag from DOM
 *
 * @param styleId - ID du <style> tag à supprimer
 */
export function removePaletteCSS(
  styleId: string = 'cartae-palette-variables'
): void {
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }
}

/**
 * FR: Mappe plusieurs palettes vers CSS (pour thème multi-palette)
 * EN: Maps multiple palettes to CSS (for multi-palette theme)
 *
 * Utile si on veut combiner plusieurs palettes (ex: palette UI + palette nœuds)
 *
 * @param palettes - Array de palettes à mapper
 * @param themeId - ID du thème actif
 * @param config - Configuration du mapper
 * @returns Mapping CSS combiné
 */
export function generateMultiPaletteCSSVariables(
  palettes: Array<{ palette: ColorPalette; prefix?: string }>,
  themeId: 'light' | 'dark',
  config?: PaletteMapperConfig
): PaletteCSSMapping {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cssVariables: Record<string, string> = {};

  palettes.forEach(({ palette, prefix }) => {
    const customConfig = prefix
      ? { ...cfg, palettePrefix: prefix }
      : cfg;

    const mapping = generatePaletteCSSVariables(palette, themeId, customConfig);
    Object.assign(cssVariables, mapping.cssVariables);
  });

  const cssString = generateCSSString(cssVariables, themeId);

  return {
    cssVariables,
    cssString,
    sourcePalette: palettes[0]?.palette, // Première palette comme source
    themeId,
  };
}

/**
 * FR: Utilitaire pour mapper dynamiquement une palette au changement de thème
 * EN: Utility to dynamically map palette on theme change
 *
 * @param palette - Palette à surveiller
 * @param getCurrentTheme - Fonction qui retourne le thème actif
 * @param onUpdate - Callback appelé quand le mapping est mis à jour
 * @returns Fonction cleanup pour arrêter le mapping
 *
 * @example
 * ```ts
 * const cleanup = createDynamicPaletteMapper(
 *   myPalette,
 *   () => document.body.classList.contains('theme-dark') ? 'dark' : 'light',
 *   (mapping) => injectPaletteCSS(mapping)
 * );
 *
 * // Plus tard...
 * cleanup();
 * ```
 */
export function createDynamicPaletteMapper(
  palette: ColorPalette,
  getCurrentTheme: () => 'light' | 'dark',
  onUpdate: (mapping: PaletteCSSMapping) => void,
  config?: PaletteMapperConfig
): () => void {
  let currentTheme = getCurrentTheme();
  let mapping = generatePaletteCSSVariables(palette, currentTheme, config);
  onUpdate(mapping);

  // Observer les changements de classe sur body (style Obsidian)
  const observer = new MutationObserver(() => {
    const newTheme = getCurrentTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      mapping = generatePaletteCSSVariables(palette, currentTheme, config);
      onUpdate(mapping);
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Fonction cleanup
  return () => {
    observer.disconnect();
  };
}

/**
 * FR: Détecte le thème actif depuis les classes CSS (style Obsidian)
 * EN: Detects active theme from CSS classes (Obsidian style)
 *
 * @param element - Élément à inspecter (défaut: document.body)
 * @returns 'light' ou 'dark'
 */
export function detectThemeFromDOM(element: HTMLElement = document.body): 'light' | 'dark' {
  if (element.classList.contains('theme-dark')) {
    return 'dark';
  }
  return 'light'; // Default to light
}

/**
 * FR: Change le thème dans le DOM (style Obsidian)
 * EN: Changes theme in DOM (Obsidian style)
 *
 * @param themeId - Nouveau thème à appliquer
 * @param element - Élément cible (défaut: document.body)
 * @param persist - Sauvegarder dans localStorage (défaut: true)
 */
export function setThemeInDOM(
  themeId: 'light' | 'dark',
  element: HTMLElement = document.body,
  persist: boolean = true
): void {
  element.classList.remove('theme-light', 'theme-dark');
  element.classList.add(`theme-${themeId}`);

  if (persist) {
    localStorage.setItem('site-theme', themeId);
  }
}

/**
 * FR: Récupère le thème depuis localStorage (style Obsidian)
 * EN: Retrieves theme from localStorage (Obsidian style)
 *
 * @returns Thème stocké ou 'light' par défaut
 */
export function getThemeFromStorage(): 'light' | 'dark' {
  const stored = localStorage.getItem('site-theme');
  return stored === 'dark' ? 'dark' : 'light';
}

/**
 * FR: Génère automatiquement des variants light/dark depuis des couleurs de base
 * EN: Automatically generates light/dark variants from base colors
 *
 * Stratégie:
 * - Light: Couleurs de base (pas de modification)
 * - Dark: Augmente la luminosité de 15-20% pour meilleure visibilité sur fond sombre
 *
 * @param baseColors - Couleurs de base (hex format)
 * @param lightenAmount - Quantité de lightening pour dark mode (0-100, défaut: 18)
 * @returns Variantes light et dark
 *
 * @example
 * ```ts
 * const variants = generateColorVariants(['#3b82f6', '#ec4899']);
 * // { light: ['#3b82f6', '#ec4899'], dark: ['#60a5fa', '#f472b6'] }
 * ```
 */
export function generateColorVariants(
  baseColors: string[],
  lightenAmount: number = 18
): { light: string[]; dark: string[] } {
  return {
    light: baseColors, // Couleurs de base pour light
    dark: baseColors.map(color => lightenColor(color, lightenAmount)), // Éclaircies pour dark
  };
}

/**
 * FR: Éclaircit une couleur hex en augmentant sa luminosité
 * EN: Lightens a hex color by increasing its luminance
 *
 * @param hex - Couleur hex (ex: '#3b82f6')
 * @param amount - Quantité de lightening (0-100)
 * @returns Couleur éclaircie en hex
 */
function lightenColor(hex: string, amount: number): string {
  // Convertir hex → RGB
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Convertir RGB → HSL
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Augmenter luminosité
  hsl.l = Math.min(100, hsl.l + amount);

  // Convertir HSL → RGB → hex
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * FR: Convertit hex vers RGB
 * EN: Converts hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * FR: Convertit RGB vers HSL
 * EN: Converts RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * FR: Convertit HSL vers RGB
 * EN: Converts HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * FR: Convertit RGB vers hex
 * EN: Converts RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
