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
