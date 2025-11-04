/**
 * Obsidian Compatibility Layer
 * Permet de charger et utiliser des thèmes CSS Obsidian dans Cartae
 *
 * @example
 * ```ts
 * import { ObsidianThemeLoader } from '@/core/theme/obsidian';
 *
 * const loader = new ObsidianThemeLoader();
 * const result = await loader.loadFromUrl(
 *   'https://example.com/theme.css',
 *   { themeId: 'obsidian-minimal', themeName: 'Minimal Theme' }
 * );
 *
 * if (result.success) {
 *   console.log('Theme loaded:', result.theme);
 * }
 * ```
 */

export { ObsidianThemeParser } from './ObsidianThemeParser';
export type { ObsidianCSSVariables } from './ObsidianThemeParser';

export { ObsidianVariableMapper } from './ObsidianVariableMapper';

export { ObsidianThemeLoader } from './ObsidianThemeLoader';
export type { ObsidianThemeLoadOptions, ObsidianThemeLoadResult } from './ObsidianThemeLoader';
