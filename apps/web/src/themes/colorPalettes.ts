/**
 * FR: Définitions des palettes de couleurs pour les nœuds et tags (CORE - minimal)
 * EN: Color palette definitions for nodes and tags (CORE - minimal)
 */

/**
 * FR: Variantes de couleurs pour un thème (light/dark)
 * EN: Color variants for a theme (light/dark)
 */
export interface ColorPaletteVariants {
  /**
   * FR: Couleurs pour le thème clair
   * EN: Colors for light theme
   */
  light?: string[];
  /**
   * FR: Couleurs pour le thème sombre
   * EN: Colors for dark theme
   */
  dark?: string[];
}

/**
 * FR: Variantes de fond de carte pour un thème (light/dark)
 * EN: Canvas background variants for a theme (light/dark)
 */
export interface CanvasBackgroundVariants {
  /**
   * FR: Fond de carte pour le thème clair
   * EN: Canvas background for light theme
   */
  light?: string;
  /**
   * FR: Fond de carte pour le thème sombre
   * EN: Canvas background for dark theme
   */
  dark?: string;
}

/**
 * FR: Mapping des couleurs sémantiques pour un thème (light/dark)
 * EN: Semantic color mapping for a theme (light/dark)
 * Permet de mapper les couleurs de palette vers des rôles sémantiques
 * Inspiré de Material Design 3, Apple HIG, et Fluent Design
 */
export interface SemanticColorMapping {
  /**
   * FR: Couleur primaire (accent principal)
   * EN: Primary color (main accent)
   */
  primary?: { light?: string; dark?: string };
  /**
   * FR: Couleur secondaire (accent secondaire)
   * EN: Secondary color (secondary accent)
   */
  secondary?: { light?: string; dark?: string };
  /**
   * FR: Couleur tertiaire (accent tertiaire, contraste)
   * EN: Tertiary color (tertiary accent, contrast)
   */
  tertiary?: { light?: string; dark?: string };
  /**
   * FR: Couleur d'accent (pour les highlights)
   * EN: Accent color (for highlights)
   */
  accent?: { light?: string; dark?: string };
  /**
   * FR: Couleur de surface (backgrounds, cards, panels)
   * EN: Surface color (backgrounds, cards, panels)
   * Inspiré de Material Design 3 - pour hiérarchie de surfaces
   */
  surface?: { light?: string; dark?: string };
  /**
   * FR: Couleur de succès
   * EN: Success color
   */
  success?: { light?: string; dark?: string };
  /**
   * FR: Couleur d'erreur
   * EN: Error color
   */
  error?: { light?: string; dark?: string };
  /**
   * FR: Couleur d'avertissement
   * EN: Warning color
   */
  warning?: { light?: string; dark?: string };
  /**
   * FR: Couleur d'information
   * EN: Info color
   */
  info?: { light?: string; dark?: string };
}

/**
 * FR: Métadonnées d'une palette
 * EN: Palette metadata
 */
export interface PaletteMetadata {
  /**
   * FR: Tags pour la recherche et le filtrage
   * EN: Tags for search and filtering
   */
  tags?: string[];
  /**
   * FR: Catégorie de la palette (colorful, pastel, dark, etc.)
   * EN: Palette category (colorful, pastel, dark, etc.)
   */
  category?: string;
  /**
   * FR: Compatibilité avec les thèmes (light, dark, both)
   * EN: Theme compatibility (light, dark, both)
   */
  compatibility?: 'light' | 'dark' | 'both';
  /**
   * FR: Niveau de contraste WCAG (AA, AAA)
   * EN: WCAG contrast level (AA, AAA)
   */
  wcagLevel?: 'AA' | 'AAA';
  /**
   * FR: Contraste général (low, medium, high)
   * EN: General contrast (low, medium, high)
   */
  contrast?: 'low' | 'medium' | 'high';
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  /**
   * FR: Couleurs par défaut (rétrocompatibilité)
   * EN: Default colors (backward compatibility)
   * Si colors.light ou colors.dark ne sont pas définis, on utilise colors
   */
  colors: string[]; // 10 couleurs
  /**
   * FR: Variantes de couleurs pour light/dark (optionnel)
   * EN: Color variants for light/dark (optional)
   * Si défini, remplace colors selon le thème actif
   */
  variants?: ColorPaletteVariants;
  /**
   * FR: Fond de carte adaptatif selon le thème (optionnel)
   * EN: Adaptive canvas background based on theme (optional)
   * Si défini, le fond de carte change selon le thème actif
   */
  canvasBackground?: CanvasBackgroundVariants;
  /**
   * FR: Mapping des couleurs sémantiques (optionnel)
   * EN: Semantic color mapping (optional)
   * Permet de mapper les couleurs de palette vers des rôles sémantiques
   */
  semantic?: SemanticColorMapping;
  /**
   * FR: Métadonnées de la palette (optionnel)
   * EN: Palette metadata (optional)
   */
  metadata?: PaletteMetadata;
}

/**
 * FR: Palette de fallback si aucune palette n'est chargée
 * EN: Fallback palette if no palette is loaded
 */
const FALLBACK_PALETTE: ColorPalette = {
  id: '__fallback__',
  name: 'Fallback',
  description: 'Default gray palette when no plugins are loaded',
  colors: [
    '#9ca3af', // Gray-400
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
    '#9ca3af',
  ],
};

/**
 * FR: Registre global des palettes (alimenté par les plugins)
 * EN: Global palette registry (populated by plugins)
 */
const paletteRegistry: Map<string, ColorPalette> = new Map();

/**
 * FR: Rétrocompatibilité - exporter toutes les palettes comme avant
 * EN: Backward compatibility - export all palettes as before
 */
export const COLOR_PALETTES: Record<string, ColorPalette> = {};

/**
 * FR: Mettre à jour COLOR_PALETTES depuis le registre
 * EN: Update COLOR_PALETTES from registry
 */
function updateColorPalettes() {
  Object.keys(COLOR_PALETTES).forEach(key => delete COLOR_PALETTES[key]);
  paletteRegistry.forEach((palette, id) => {
    COLOR_PALETTES[id] = palette;
  });
}

/**
 * FR: Enregistrer une palette (utilisé par les plugins)
 * EN: Register a palette (used by plugins)
 */
export function registerPalette(palette: ColorPalette): void {
  paletteRegistry.set(palette.id, palette);
  updateColorPalettes();
}

/**
 * FR: Désenregistrer une palette (utilisé par les plugins)
 * EN: Unregister a palette (used by plugins)
 */
export function unregisterPalette(paletteId: string): void {
  paletteRegistry.delete(paletteId);
  updateColorPalettes();
}

/**
 * FR: Enregistrer plusieurs palettes à la fois
 * EN: Register multiple palettes at once
 */
export function registerPalettes(palettes: ColorPalette[]): void {
  palettes.forEach(palette => paletteRegistry.set(palette.id, palette));
  updateColorPalettes();
}

/**
 * FR: Obtenir une palette par son ID
 * EN: Get a palette by its ID
 */
export function getPalette(paletteId: string): ColorPalette {
  const palette = paletteRegistry.get(paletteId);
  if (palette) return palette;

  // Si la palette demandée n'existe pas, retourner la première palette disponible
  const firstPalette = paletteRegistry.values().next().value;
  return firstPalette || FALLBACK_PALETTE;
}

/**
 * FR: Obtenir les couleurs d'une palette selon le thème actif
 * EN: Get palette colors based on active theme
 * @param palette - La palette à utiliser
 * @param themeId - ID du thème actif ('light' ou 'dark')
 * @returns Tableau de couleurs adapté au thème
 */
export function getPaletteColorsForTheme(
  palette: ColorPalette,
  themeId: 'light' | 'dark'
): string[] {
  // Si la palette a des variantes, utiliser celle correspondant au thème
  if (palette.variants) {
    const variantColors = themeId === 'dark' ? palette.variants.dark : palette.variants.light;
    if (variantColors && variantColors.length > 0) {
      return variantColors;
    }
  }

  // Sinon, utiliser les couleurs par défaut
  return palette.colors;
}

/**
 * FR: Obtenir le fond de carte d'une palette selon le thème actif
 * EN: Get canvas background from palette based on active theme
 * @param palette - La palette à utiliser
 * @param themeId - ID du thème actif ('light' ou 'dark')
 * @returns Couleur de fond de carte ou undefined si non défini
 */
export function getCanvasBackgroundForTheme(
  palette: ColorPalette,
  themeId: 'light' | 'dark'
): string | undefined {
  if (!palette.canvasBackground) {
    return undefined;
  }

  return themeId === 'dark'
    ? palette.canvasBackground.dark
    : palette.canvasBackground.light;
}

/**
 * FR: Obtenir la liste de toutes les palettes
 * EN: Get list of all palettes
 */
export function getAllPalettes(): ColorPalette[] {
  return Array.from(paletteRegistry.values());
}

/**
 * FR: Vérifier si une palette existe
 * EN: Check if a palette exists
 */
export function hasPalette(paletteId: string): boolean {
  return paletteRegistry.has(paletteId);
}

/**
 * FR: Obtenir la prochaine couleur disponible dans une palette
 * EN: Get the next available color from a palette
 *
 * @param paletteId - ID de la palette
 * @param usedColors - Couleurs déjà utilisées
 * @param themeId - ID du thème actif ('light' ou 'dark') pour utiliser la bonne variante
 * @returns La couleur la moins utilisée dans la palette
 */
export function getNextColorFromPalette(
  paletteId: string,
  usedColors: string[],
  themeId?: 'light' | 'dark'
): string {
  const palette = getPalette(paletteId);
  
  // FR: Utiliser les couleurs adaptées au thème si disponible
  // EN: Use theme-adapted colors if available
  const colors = themeId ? getPaletteColorsForTheme(palette, themeId) : palette.colors;

  // Compter l'utilisation de chaque couleur
  const colorUsage = new Map<string, number>();
  colors.forEach(color => colorUsage.set(color, 0));

  usedColors.forEach(color => {
    if (colorUsage.has(color)) {
      colorUsage.set(color, (colorUsage.get(color) || 0) + 1);
    }
  });

  // Trouver la couleur la moins utilisée
  let minUsage = Infinity;
  let selectedColor = colors[0];

  colors.forEach(color => {
    const usage = colorUsage.get(color) || 0;
    if (usage < minUsage) {
      minUsage = usage;
      selectedColor = color;
    }
  });

  return selectedColor;
}

/**
 * FR: Convertit une couleur hex en RGB
 * EN: Converts hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Support 3, 6, and 8 character hex codes
  const hexPattern = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i;
  const match = hexPattern.exec(hex);
  if (!match) return null;

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * FR: Calcule la luminance relative WCAG 2.1
 * EN: Calculates WCAG 2.1 relative luminance
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;

  // Normalize to 0-1
  const normalize = (value: number) => {
    const val = value / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

/**
 * FR: Calcule le ratio de contraste WCAG 2.1 entre deux couleurs
 * EN: Calculates WCAG 2.1 contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * FR: Retourne une palette complète adaptée au thème
 * EN: Returns a complete palette adapted to the theme
 * @param palette - La palette à adapter
 * @param themeId - ID du thème actif ('light' ou 'dark')
 * @returns Palette complète avec toutes les propriétés adaptées au thème
 */
export function getPaletteForTheme(
  palette: ColorPalette,
  themeId: 'light' | 'dark'
): ColorPalette & {
  resolvedColors: string[];
  resolvedCanvasBackground?: string;
  resolvedSemantic?: Record<string, string>;
} {
  const resolvedColors = getPaletteColorsForTheme(palette, themeId);
  const resolvedCanvasBackground = getCanvasBackgroundForTheme(palette, themeId);
  const resolvedSemantic: Record<string, string> = {};

  // Résoudre les couleurs sémantiques
  if (palette.semantic) {
    Object.entries(palette.semantic).forEach(([key, value]) => {
      if (value) {
        const semanticColor = themeId === 'dark' ? value.dark : value.light;
        if (semanticColor) {
          resolvedSemantic[key] = semanticColor;
        }
      }
    });
  }

  return {
    ...palette,
    resolvedColors,
    resolvedCanvasBackground,
    resolvedSemantic: Object.keys(resolvedSemantic).length > 0 ? resolvedSemantic : undefined,
  };
}

/**
 * FR: Obtient les couleurs sémantiques d'une palette pour un thème
 * EN: Gets semantic colors from a palette for a theme
 * @param palette - La palette à utiliser
 * @param themeId - ID du thème actif ('light' ou 'dark')
 * @returns Mapping des couleurs sémantiques (primary, secondary, accent, etc.)
 */
export function getSemanticColors(
  palette: ColorPalette,
  themeId: 'light' | 'dark'
): Record<string, string> {
  const semantic: Record<string, string> = {};

  if (!palette.semantic) {
    return semantic;
  }

  Object.entries(palette.semantic).forEach(([key, value]) => {
    if (value) {
      const color = themeId === 'dark' ? value.dark : value.light;
      if (color) {
        semantic[key] = color;
      }
    }
  });

  return semantic;
}

/**
 * FR: Résultat de validation de contraste
 * EN: Contrast validation result
 */
export interface ContrastValidationResult {
  /**
   * FR: Tous les contrastes sont valides
   * EN: All contrasts are valid
   */
  isValid: boolean;
  /**
   * FR: Ratio minimum trouvé
   * EN: Minimum ratio found
   */
  minRatio: number;
  /**
   * FR: Ratio maximum trouvé
   * EN: Maximum ratio found
   */
  maxRatio: number;
  /**
   * FR: Liste des problèmes de contraste
   * EN: List of contrast issues
   */
  issues: Array<{
    color1: string;
    color2: string;
    ratio: number;
    required: number;
    message: string;
  }>;
}

/**
 * FR: Valide les ratios de contraste WCAG d'une palette
 * EN: Validates WCAG contrast ratios for a palette
 * @param palette - La palette à valider
 * @param themeId - ID du thème actif ('light' ou 'dark')
 * @param minContrast - Contraste minimum requis (défaut: 4.5 pour WCAG AA)
 * @param backgroundColor - Couleur de fond pour tester le contraste (optionnel)
 * @returns Résultat de validation avec détails
 */
export function validatePaletteContrast(
  palette: ColorPalette,
  themeId: 'light' | 'dark',
  minContrast: number = 4.5,
  backgroundColor?: string
): ContrastValidationResult {
  const colors = getPaletteColorsForTheme(palette, themeId);
  const canvasBg = backgroundColor || getCanvasBackgroundForTheme(palette, themeId) || '#ffffff';
  const issues: ContrastValidationResult['issues'] = [];
  let minRatio = Infinity;
  let maxRatio = 0;

  // Tester le contraste de chaque couleur avec le fond de carte
  colors.forEach(color => {
    const ratio = getContrastRatio(color, canvasBg);
    minRatio = Math.min(minRatio, ratio);
    maxRatio = Math.max(maxRatio, ratio);

    if (ratio < minContrast) {
      issues.push({
        color1: color,
        color2: canvasBg,
        ratio,
        required: minContrast,
        message: `Contraste insuffisant: ${ratio.toFixed(2)}:1 (requis: ${minContrast}:1)`,
      });
    }
  });

  // Tester le contraste entre les couleurs adjacentes dans la palette
  for (let i = 0; i < colors.length - 1; i++) {
    const ratio = getContrastRatio(colors[i], colors[i + 1]);
    minRatio = Math.min(minRatio, ratio);
    maxRatio = Math.max(maxRatio, ratio);

    // Pour les couleurs adjacentes, on veut un ratio plus élevé (au moins 2:1)
    const minAdjacentContrast = 2.0;
    if (ratio < minAdjacentContrast) {
      issues.push({
        color1: colors[i],
        color2: colors[i + 1],
        ratio,
        required: minAdjacentContrast,
        message: `Contraste faible entre couleurs adjacentes: ${ratio.toFixed(2)}:1`,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    minRatio,
    maxRatio,
    issues,
  };
}
