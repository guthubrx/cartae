/**
 * FR: Tests pour le parser Obsidian
 * EN: Tests for Obsidian parser
 */

import { parseObsidianTheme, mergeThemeVariables, flattenTheme, validateThemeVariables } from './obsidian-theme-parser';
import { mapObsidianToCartae } from './obsidian-theme-mapper';

describe('ObsidianThemeParser', () => {
  const minimalThemeCSS = `
    :root {
      --color-primary: #007aff;
      --color-accent: #ff2d55;
      --background-primary: #ffffff;
      --text-normal: #000000;
    }

    .theme-dark {
      --color-primary: #0a84ff;
      --color-accent: #ff453a;
      --background-primary: #000000;
      --text-normal: #ffffff;
    }
  `;

  it('✅ Parse theme CSS correctly', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);

    expect(parsed.light.size).toBeGreaterThan(0);
    expect(parsed.dark.size).toBeGreaterThan(0);
    expect(parsed.light.get('--color-primary')).toBe('#007aff');
    expect(parsed.dark.get('--color-primary')).toBe('#0a84ff');
  });

  it('✅ Extract variables from :root block', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);

    expect(parsed.light.get('--background-primary')).toBe('#ffffff');
    expect(parsed.light.get('--text-normal')).toBe('#000000');
  });

  it('✅ Extract variables from .theme-dark block', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);

    expect(parsed.dark.get('--background-primary')).toBe('#000000');
    expect(parsed.dark.get('--text-normal')).toBe('#ffffff');
  });

  it('✅ Merge light and dark variables', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);
    const merged = mergeThemeVariables(parsed.light, parsed.dark);

    expect(merged.has('--color-primary-light')).toBe(true);
    expect(merged.has('--color-primary-dark')).toBe(true);
  });

  it('✅ Flatten theme to plain object', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);
    const flattened = flattenTheme(parsed, 'light');

    expect(flattened['--color-primary']).toBe('#007aff');
    expect(flattened['--background-primary']).toBe('#ffffff');
  });

  it('✅ Validate essential variables', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);
    const validation = validateThemeVariables(parsed, ['--color-primary', '--text-normal']);

    expect(validation.valid).toBe(true);
    expect(validation.missing.length).toBe(0);
  });

  it('⚠️ Detect missing essential variables', () => {
    const parsed = parseObsidianTheme(minimalThemeCSS);
    const validation = validateThemeVariables(parsed, ['--color-missing', '--not-exists']);

    expect(validation.valid).toBe(false);
    expect(validation.missing.length).toBeGreaterThan(0);
  });
});

describe('ObsidianThemeMapper', () => {
  const testThemeCSS = `
    :root {
      --color-primary: #007aff;
      --color-accent: #ff2d55;
      --background-primary: #ffffff;
      --text-normal: #000000;
      --text-muted: #666666;
      --button-bg1: #f0f0f0;
      --button-text: #333333;
    }
  `;

  it('✅ Map Obsidian variables to Cartae', () => {
    const cssParser = require('./obsidian-theme-parser');
    const parsed = cssParser.parseObsidianTheme(testThemeCSS);
    const mapping = mapObsidianToCartae(parsed);

    expect(mapping.cartaeVars.size).toBeGreaterThan(0);
    expect(mapping.coverage).toBeGreaterThanOrEqual(0);
  });

  it('✅ Calculate coverage correctly', () => {
    const cssParser = require('./obsidian-theme-parser');
    const parsed = cssParser.parseObsidianTheme(testThemeCSS);
    const mapping = mapObsidianToCartae(parsed);

    expect(typeof mapping.coverage).toBe('number');
    expect(mapping.coverage).toBeGreaterThanOrEqual(0);
    expect(mapping.coverage).toBeLessThanOrEqual(100);
  });

  it('✅ Provide fallback for missing variables', () => {
    const emptyThemeCSS = ':root {}';
    const cssParser = require('./obsidian-theme-parser');
    const parsed = cssParser.parseObsidianTheme(emptyThemeCSS);
    const mapping = mapObsidianToCartae(parsed);

    // Should still have some variables with fallbacks
    expect(mapping.cartaeVars.size).toBeGreaterThan(0);
  });
});

describe('Integration', () => {
  it('✅ End-to-end theme parsing and mapping', () => {
    const realThemeCSS = `
      :root {
        --color-primary: #2563eb;
        --color-accent: #dc2626;
        --background-primary: #ffffff;
        --background-secondary: #f3f4f6;
        --text-normal: #1f2937;
        --text-muted: #6b7280;
      }

      .theme-dark {
        --color-primary: #3b82f6;
        --color-accent: #ef4444;
        --background-primary: #111827;
        --background-secondary: #1f2937;
        --text-normal: #f3f4f6;
        --text-muted: #9ca3af;
      }
    `;

    const parsed = parseObsidianTheme(realThemeCSS);
    expect(parsed.light.size).toBeGreaterThan(0);
    expect(parsed.dark.size).toBeGreaterThan(0);

    const mapping = mapObsidianToCartae(parsed);
    expect(mapping.cartaeVars.size).toBeGreaterThan(0);
    expect(mapping.coverage).toBeGreaterThan(0);
  });
});
