/**
 * FR: Hook React pour gérer les palettes de couleurs adaptatives
 * EN: React hook for managing adaptive color palettes
 *
 * Ce hook permet aux composants React de:
 * - Accéder à la palette active
 * - Changer de palette
 * - Écouter les changements de palette
 * - Obtenir les couleurs résolues pour le thème actif
 *
 * Session 69: Adaptive Palette Integration
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { themeManager } from '../core/theme/ThemeManager';
import type { ColorPalette } from '../themes/colorPalettes';
import { getPaletteColorsForTheme, getSemanticColors } from '../themes/colorPalettes';
import type { PaletteCSSMapping } from '../themes/paletteThemeMapper';

/**
 * FR: Valeur de retour du hook usePaletteTheme
 * EN: Return value of usePaletteTheme hook
 */
export interface UsePaletteThemeReturn {
  /**
   * FR: ID de la palette active
   * EN: Active palette ID
   */
  paletteId: string;

  /**
   * FR: Palette active complète
   * EN: Complete active palette
   */
  palette: ColorPalette | null;

  /**
   * FR: Mapping CSS actuel
   * EN: Current CSS mapping
   */
  mapping: PaletteCSSMapping | null;

  /**
   * FR: Couleurs résolues pour le thème actif (light ou dark)
   * EN: Resolved colors for active theme (light or dark)
   */
  colors: string[];

  /**
   * FR: Couleurs sémantiques résolues (primary, secondary, etc.)
   * EN: Resolved semantic colors (primary, secondary, etc.)
   */
  semanticColors: Record<string, string>;

  /**
   * FR: Changer de palette
   * EN: Change palette
   */
  setPalette: (paletteId: string) => void;

  /**
   * FR: Rafraîchir la palette (force reload depuis ThemeManager)
   * EN: Refresh palette (force reload from ThemeManager)
   */
  refresh: () => void;
}

/**
 * FR: Hook React pour gérer les palettes de couleurs adaptatives
 * EN: React hook for managing adaptive color palettes
 *
 * @returns Objet avec palette active et fonctions de gestion
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { paletteId, colors, semanticColors, setPalette } = usePaletteTheme();
 *
 *   return (
 *     <div>
 *       <p>Palette active: {paletteId}</p>
 *       <div style={{ background: semanticColors.primary }}>
 *         Couleur primaire
 *       </div>
 *       <button onClick={() => setPalette('ocean')}>
 *         Changer vers Ocean
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaletteTheme(): UsePaletteThemeReturn {
  // État local pour palette et thème
  const [paletteId, setPaletteIdState] = useState<string>(() => themeManager.getPaletteId());
  const [palette, setPaletteState] = useState<ColorPalette | null>(() => themeManager.getPalette());
  const [mapping, setMappingState] = useState<PaletteCSSMapping | null>(() => themeManager.getPaletteMapping());

  // Fonction pour rafraîchir depuis ThemeManager
  const refresh = useCallback(() => {
    setPaletteIdState(themeManager.getPaletteId());
    setPaletteState(themeManager.getPalette());
    setMappingState(themeManager.getPaletteMapping());
  }, []);

  // Fonction pour changer de palette
  const setPalette = useCallback((newPaletteId: string) => {
    themeManager.setPalette(newPaletteId);
    // L'état sera mis à jour via le listener
  }, []);

  // Écouter les changements de palette depuis ThemeManager
  useEffect(() => {
    const unsubscribePalette = themeManager.subscribeToPalette((newPaletteId, newPalette) => {
      setPaletteIdState(newPaletteId);
      setPaletteState(newPalette);
      setMappingState(themeManager.getPaletteMapping());
    });

    // Écouter aussi les changements de thème (light/dark) pour mettre à jour les couleurs résolues
    const unsubscribeTheme = themeManager.subscribe(() => {
      // Le thème a changé, rafraîchir le mapping
      setMappingState(themeManager.getPaletteMapping());
    });

    return () => {
      unsubscribePalette();
      unsubscribeTheme();
    };
  }, []);

  // Calculer les couleurs résolues pour le thème actif
  const colors = useMemo(() => {
    if (!palette) return [];

    const currentTheme = themeManager.getTheme();
    const themeMode = currentTheme.mode === 'dark' ? 'dark' : 'light';

    return getPaletteColorsForTheme(palette, themeMode);
  }, [palette, mapping]); // Recalculer si palette ou mapping change

  // Calculer les couleurs sémantiques résolues
  const semanticColors = useMemo(() => {
    if (!palette) return {};

    const currentTheme = themeManager.getTheme();
    const themeMode = currentTheme.mode === 'dark' ? 'dark' : 'light';

    return getSemanticColors(palette, themeMode);
  }, [palette, mapping]); // Recalculer si palette ou mapping change

  return {
    paletteId,
    palette,
    mapping,
    colors,
    semanticColors,
    setPalette,
    refresh,
  };
}

/**
 * FR: Hook simplifié pour obtenir juste les couleurs de palette
 * EN: Simplified hook to get just palette colors
 *
 * @returns Array de couleurs adaptées au thème actif
 *
 * @example
 * ```tsx
 * function Node() {
 *   const colors = usePaletteColors();
 *   return <div style={{ background: colors[0] }}>Node</div>;
 * }
 * ```
 */
export function usePaletteColors(): string[] {
  const { colors } = usePaletteTheme();
  return colors;
}

/**
 * FR: Hook simplifié pour obtenir juste les couleurs sémantiques
 * EN: Simplified hook to get just semantic colors
 *
 * @returns Object avec couleurs sémantiques (primary, secondary, etc.)
 *
 * @example
 * ```tsx
 * function Button() {
 *   const { primary, secondary } = useSemanticColors();
 *   return (
 *     <button style={{ background: primary, color: secondary }}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useSemanticColors(): Record<string, string> {
  const { semanticColors } = usePaletteTheme();
  return semanticColors;
}

/**
 * FR: Hook pour obtenir une couleur de palette spécifique par index
 * EN: Hook to get specific palette color by index
 *
 * @param index - Index de la couleur (0-9 généralement)
 * @returns Couleur hex ou undefined si index invalide
 *
 * @example
 * ```tsx
 * function ColoredBox() {
 *   const color = usePaletteColor(3);
 *   return <div style={{ background: color }}>Box</div>;
 * }
 * ```
 */
export function usePaletteColor(index: number): string | undefined {
  const colors = usePaletteColors();
  return colors[index];
}
