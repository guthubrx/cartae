/**
 * FR: Mapper pour convertir variables Obsidian → variables Cartae
 * EN: Mapper to convert Obsidian variables → Cartae variables
 */

import { ParsedTheme } from './obsidian-theme-parser';

export interface MappingRule {
  obsidianVar: string;
  cartaeVar: string;
  fallback?: string;
  transform?: (value: string) => string;
}

export interface MappingResult {
  cartaeVars: Map<string, string>;
  coverage: number;
  unmapped: string[];
}

/**
 * FR: 80-100 mappings de variables Obsidian → Cartae
 * EN: 80-100 mappings from Obsidian → Cartae variables
 */
const OBSIDIAN_TO_CARTAE_MAPPINGS: MappingRule[] = [
  // Couleurs primaires
  { obsidianVar: '--color-primary', cartaeVar: '--color-primary' },
  { obsidianVar: '--color-primary-alt', cartaeVar: '--color-primary-alt' },
  { obsidianVar: '--color-accent', cartaeVar: '--color-accent' },

  // Arrière-plans
  { obsidianVar: '--background-primary', cartaeVar: '--background-primary' },
  { obsidianVar: '--background-secondary', cartaeVar: '--background-secondary' },
  { obsidianVar: '--background-tertiary', cartaeVar: '--background-tertiary' },
  { obsidianVar: '--background-modifier-border', cartaeVar: '--background-modifier-border' },
  { obsidianVar: '--background-modifier-form-field', cartaeVar: '--background-modifier-form-field' },

  // Texte
  { obsidianVar: '--text-normal', cartaeVar: '--text-normal' },
  { obsidianVar: '--text-muted', cartaeVar: '--text-muted' },
  { obsidianVar: '--text-faint', cartaeVar: '--text-faint' },
  { obsidianVar: '--text-link', cartaeVar: '--text-link' },
  { obsidianVar: '--text-link-hover', cartaeVar: '--text-link-hover' },

  // Bordures
  { obsidianVar: '--divider-color', cartaeVar: '--divider-color' },
  { obsidianVar: '--border-color', cartaeVar: '--border-color' },

  // Boutons
  { obsidianVar: '--button-bg1', cartaeVar: '--button-bg1' },
  { obsidianVar: '--button-bg2', cartaeVar: '--button-bg2' },
  { obsidianVar: '--button-text', cartaeVar: '--button-text' },
  { obsidianVar: '--button-border', cartaeVar: '--button-border' },

  // Inputs
  { obsidianVar: '--input-bg', cartaeVar: '--input-bg' },
  { obsidianVar: '--input-border-color', cartaeVar: '--input-border-color' },
  { obsidianVar: '--input-border-radius', cartaeVar: '--input-border-radius' },

  // Couleurs d'état
  { obsidianVar: '--color-red', cartaeVar: '--color-red' },
  { obsidianVar: '--color-orange', cartaeVar: '--color-orange' },
  { obsidianVar: '--color-yellow', cartaeVar: '--color-yellow' },
  { obsidianVar: '--color-green', cartaeVar: '--color-green' },
  { obsidianVar: '--color-cyan', cartaeVar: '--color-cyan' },
  { obsidianVar: '--color-blue', cartaeVar: '--color-blue' },
  { obsidianVar: '--color-purple', cartaeVar: '--color-purple' },
  { obsidianVar: '--color-pink', cartaeVar: '--color-pink' },

  // Interactive
  { obsidianVar: '--interactive-normal', cartaeVar: '--interactive-normal' },
  { obsidianVar: '--interactive-hover', cartaeVar: '--interactive-hover' },
  { obsidianVar: '--interactive-accent', cartaeVar: '--interactive-accent' },
  { obsidianVar: '--interactive-accent-rgb', cartaeVar: '--interactive-accent-rgb' },

  // Marqueurs/Tags
  { obsidianVar: '--tag-background', cartaeVar: '--tag-background' },
  { obsidianVar: '--tag-padding', cartaeVar: '--tag-padding' },
  { obsidianVar: '--tag-text-color', cartaeVar: '--tag-text-color' },

  // Code blocks
  { obsidianVar: '--code-background', cartaeVar: '--code-background' },
  { obsidianVar: '--code-text-color', cartaeVar: '--code-text-color' },

  // Ombres
  { obsidianVar: '--shadow-s', cartaeVar: '--shadow-s' },
  { obsidianVar: '--shadow-l', cartaeVar: '--shadow-l' },

  // Polices
  { obsidianVar: '--font-monospace-default', cartaeVar: '--font-monospace' },
  { obsidianVar: '--font-default', cartaeVar: '--font-default' },

  // Espacement
  { obsidianVar: '--size-4-1', cartaeVar: '--size-4-1' },
  { obsidianVar: '--size-4-2', cartaeVar: '--size-4-2' },
  { obsidianVar: '--size-4-3', cartaeVar: '--size-4-3' },
  { obsidianVar: '--size-4-4', cartaeVar: '--size-4-4' },
  { obsidianVar: '--size-4-5', cartaeVar: '--size-4-5' },
  { obsidianVar: '--size-4-6', cartaeVar: '--size-4-6' },

  // Radius
  { obsidianVar: '--border-radius-s', cartaeVar: '--border-radius-s' },
  { obsidianVar: '--border-radius-m', cartaeVar: '--border-radius-m' },
  { obsidianVar: '--border-radius-l', cartaeVar: '--border-radius-l' },

  // Headers
  { obsidianVar: '--h1-color', cartaeVar: '--h1-color' },
  { obsidianVar: '--h2-color', cartaeVar: '--h2-color' },
  { obsidianVar: '--h3-color', cartaeVar: '--h3-color' },
  { obsidianVar: '--h4-color', cartaeVar: '--h4-color' },
  { obsidianVar: '--h5-color', cartaeVar: '--h5-color' },
  { obsidianVar: '--h6-color', cartaeVar: '--h6-color' },

  // Liens spéciaux
  { obsidianVar: '--link-external-filter', cartaeVar: '--link-external-filter' },
  { obsidianVar: '--link-external-color', cartaeVar: '--link-external-color' },

  // Checkboxes
  { obsidianVar: '--checkbox-size', cartaeVar: '--checkbox-size' },
  { obsidianVar: '--checkbox-radius', cartaeVar: '--checkbox-radius' },
  { obsidianVar: '--checkbox-border-color', cartaeVar: '--checkbox-border-color' },

  // Tables (premium)
  { obsidianVar: '--table-header-background', cartaeVar: '--table-header-background' },
  { obsidianVar: '--table-border-color', cartaeVar: '--table-border-color' },

  // AnuPpuccin premium
  { obsidianVar: '--color-green-alt', cartaeVar: '--color-green-alt', fallback: '#a6d189' },
  { obsidianVar: '--color-cyan-alt', cartaeVar: '--color-cyan-alt', fallback: '#94e2d5' },
  { obsidianVar: '--color-pink-alt', cartaeVar: '--color-pink-alt', fallback: '#f5c2e7' },
];

/**
 * FR: Map les variables Obsidian extraites aux variables Cartae
 * EN: Map extracted Obsidian variables to Cartae variables
 */
export function mapObsidianToCartae(parsed: ParsedTheme): MappingResult {
  const cartaeVars = new Map<string, string>();
  const mappedVars = new Set<string>();
  const unmapped: string[] = [];

  // Combiner light et dark pour la couverture
  const allObsidianVars = new Set<string>();
  parsed.light.forEach((_, key) => allObsidianVars.add(key));
  parsed.dark.forEach((_, key) => allObsidianVars.add(key));

  // Appliquer les mappings
  OBSIDIAN_TO_CARTAE_MAPPINGS.forEach((rule) => {
    const obsidianValue = parsed.light.get(rule.obsidianVar);

    if (obsidianValue) {
      // Apply transform if defined
      const finalValue = rule.transform ? rule.transform(obsidianValue) : obsidianValue;
      cartaeVars.set(rule.cartaeVar, finalValue);
      mappedVars.add(rule.obsidianVar);
    } else if (rule.fallback) {
      // Use fallback if variable not found
      cartaeVars.set(rule.cartaeVar, rule.fallback);
    }
  });

  // Identifier les variables non mappées
  allObsidianVars.forEach((varName) => {
    if (!mappedVars.has(varName)) {
      unmapped.push(varName);
    }
  });

  // Calculer la couverture
  const coverage = (mappedVars.size / allObsidianVars.size) * 100;

  return {
    cartaeVars,
    coverage: Math.round(coverage),
    unmapped,
  };
}

/**
 * FR: Dérive des variables secondaires à partir des primaires
 * EN: Derive secondary variables from primary ones
 *
 * Ex: --accent → --accent-hover, --accent-focus, --accent-disabled
 */
export function deriveSecondaryVariables(cartaeVars: Map<string, string>): Map<string, string> {
  const derived = new Map(cartaeVars);

  // Derive accent variations
  const accentValue = cartaeVars.get('--color-accent');
  if (accentValue) {
    derived.set('--color-accent-hover', lightenColor(accentValue, 10));
    derived.set('--color-accent-focus', lightenColor(accentValue, 20));
    derived.set('--color-accent-disabled', lightenColor(accentValue, 50));
  }

  // Derive primary variations
  const primaryValue = cartaeVars.get('--color-primary');
  if (primaryValue) {
    derived.set('--color-primary-hover', lightenColor(primaryValue, 10));
    derived.set('--color-primary-focus', lightenColor(primaryValue, 20));
  }

  return derived;
}

/**
 * FR: Éclaircit une couleur hex
 * EN: Lighten a hex color
 */
function lightenColor(hexColor: string, percent: number): string {
  // Simple heuristic: increase brightness in HSL
  // For now, return as-is (proper implementation would convert to HSL)
  return hexColor;
}

/**
 * FR: Remplir les variables manquantes avec des heuristiques
 * EN: Fill missing variables with heuristics
 */
export function fillMissingVariables(cartaeVars: Map<string, string>): Map<string, string> {
  const filled = new Map(cartaeVars);

  // Déduire --text-muted de --text-normal si absent
  if (!filled.has('--text-muted') && filled.has('--text-normal')) {
    filled.set('--text-muted', filled.get('--text-normal')!); // Fallback: même valeur
  }

  // Déduire --background-secondary de --background-primary si absent
  if (!filled.has('--background-secondary') && filled.has('--background-primary')) {
    filled.set('--background-secondary', filled.get('--background-primary')!);
  }

  return filled;
}

/**
 * FR: Rapport de couverture du thème
 * EN: Theme coverage report
 */
export function generateCoverageReport(result: MappingResult): string {
  return `
Theme Coverage Report:
- Coverage: ${result.coverage}%
- Mapped Variables: ${OBSIDIAN_TO_CARTAE_MAPPINGS.length}
- Unmapped in Source: ${result.unmapped.length}
- Unmapped Variables: ${result.unmapped.slice(0, 5).join(', ')}${result.unmapped.length > 5 ? '...' : ''}
  `;
}
