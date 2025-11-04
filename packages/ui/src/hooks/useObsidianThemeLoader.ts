/**
 * FR: Hook React pour charger et appliquer un thème Obsidian
 * EN: React hook to load and apply an Obsidian theme
 */

import { useEffect } from 'react';
import { parseObsidianTheme, ParsedTheme } from '../utils/obsidian-theme-parser';
import { mapObsidianToCartae, deriveSecondaryVariables, fillMissingVariables } from '../utils/obsidian-theme-mapper';

export interface ObsidianThemeConfig {
  cssContent: string;
  isDark: boolean;
  themeId?: string;
}

/**
 * FR: Hook pour charger un thème Obsidian
 * EN: Hook to load an Obsidian theme
 *
 * Workflow: Parse → Resolve → Map → Apply
 */
export const useObsidianThemeLoader = (config: ObsidianThemeConfig | null) => {
  useEffect(() => {
    if (!config) {
      // Clear theme if config is null
      document.body.classList.remove('theme-dark', 'theme-light');
      clearThemeVariables();
      return;
    }

    try {
      // 1. Parse Obsidian theme CSS
      const parsed = parseObsidianTheme(config.cssContent);

      // 2. Map to Cartae variables
      const mappingResult = mapObsidianToCartae(parsed);

      // 3. Derive secondary variables
      let cartaeVars = deriveSecondaryVariables(mappingResult.cartaeVars);

      // 4. Fill missing variables
      cartaeVars = fillMissingVariables(cartaeVars);

      // 5. Apply to DOM
      applyThemeToDOM(cartaeVars, config.isDark, config.themeId);

      // 6. Log coverage for debugging
      console.log(
        `✅ Theme loaded: ${config.themeId || 'unnamed'} (${mappingResult.coverage}% coverage)`
      );
    } catch (error) {
      console.error('Failed to load Obsidian theme:', error);
    }

    // Cleanup on unmount
    return () => {
      clearThemeVariables();
      document.body.classList.remove('theme-dark', 'theme-light');
    };
  }, [config]);
};

/**
 * FR: Applique le thème au DOM via CSS Custom Properties
 * EN: Apply theme to DOM via CSS Custom Properties
 */
function applyThemeToDOM(
  variables: Map<string, string>,
  isDark: boolean,
  themeId?: string
): void {
  const root = document.documentElement;

  // Apply all variables
  variables.forEach((value, varName) => {
    root.style.setProperty(varName, value);
  });

  // Add theme class
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');

  // Optional: add theme ID as data attribute
  if (themeId) {
    document.body.setAttribute('data-theme', themeId);
  }
}

/**
 * FR: Efface toutes les variables de thème
 * EN: Clear all theme variables
 */
function clearThemeVariables(): void {
  const root = document.documentElement;

  // Récupérer toutes les propriétés CSS personnalisées
  const styles = getComputedStyle(root);
  for (let i = 0; i < styles.length; i++) {
    const propName = styles[i];
    if (propName.startsWith('--')) {
      root.style.removeProperty(propName);
    }
  }
}

/**
 * FR: Hook pour basculer entre les modes clair et sombre
 * EN: Hook to toggle between light and dark modes
 */
export const useThemeMode = (isDark: boolean) => {
  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
  }, [isDark]);
};

/**
 * FR: Utility pour obtenir la valeur actuelle d'une variable CSS
 * EN: Utility to get current value of a CSS variable
 */
export function getThemeVariable(varName: string): string | null {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || null;
}

/**
 * FR: Utility pour définir une variable CSS manuellement
 * EN: Utility to set a CSS variable manually
 */
export function setThemeVariable(varName: string, value: string): void {
  document.documentElement.style.setProperty(varName, value);
}

/**
 * FR: Utility pour vérifier si un thème est appliqué
 * EN: Utility to check if a theme is applied
 */
export function isThemeApplied(themeId: string): boolean {
  return document.body.getAttribute('data-theme') === themeId;
}
