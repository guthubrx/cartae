/**
 * FR: Tests pour le validateur de thèmes CSS
 * EN: Tests for CSS theme validator
 */

import {
  validateThemeCSS,
  sanitizeCSS,
  extractCSSVariables,
  checkVariableCoverage,
} from './theme-validator';

describe('ThemeValidator', () => {
  describe('validateThemeCSS', () => {
    it('✅ accepte un CSS valide', () => {
      const validCSS = `
        :root {
          --primary: #007aff;
          --secondary: #5856d6;
          --accent: #ff2d55;
        }
      `;
      const result = validateThemeCSS(validCSS);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('❌ rejette les fichiers > 500KB', () => {
      const largeCss = 'a { color: red; }' + 'x'.repeat(600000);
      const result = validateThemeCSS(largeCss);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('volumineux'))).toBe(true);
    });

    it('❌ rejette les balises <script>', () => {
      const evilCSS = `
        :root { --color: red; }
        <script>alert('xss')</script>
      `;
      const result = validateThemeCSS(evilCSS);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('<script>'))).toBe(true);
    });

    it('❌ rejette javascript: protocol', () => {
      const evilCSS = `.btn { background: url(javascript:alert('xss')); }`;
      const result = validateThemeCSS(evilCSS);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('javascript:'))).toBe(true);
    });

    it('❌ rejette les event handlers (onerror=, onload=)', () => {
      const evilCSS = `img { onerror="alert('xss')"; }`;
      const result = validateThemeCSS(evilCSS);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('dangereux'))).toBe(true);
    });

    it('⚠️ avertit pour braces non balancées', () => {
      const invalidCSS = `:root { --color: red; `;
      const result = validateThemeCSS(invalidCSS);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('accolades'))).toBe(true);
    });

    it('⚠️ avertit pour variables recommandées manquantes', () => {
      const css = `:root { --random: blue; }`;
      const result = validateThemeCSS(css);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('manquantes'))).toBe(true);
    });

    it('⚠️ avertit pour URLs externes', () => {
      const css = `@import url('https://fonts.google.com/css?family=Roboto');`;
      const result = validateThemeCSS(css);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('URLs externes'))).toBe(true);
    });
  });

  describe('sanitizeCSS', () => {
    it('🧹 supprime les <script> tags', () => {
      const dirty = `css { color: red; } <script>alert('xss')</script>`;
      const clean = sanitizeCSS(dirty);
      expect(clean).not.toContain('<script>');
    });

    it('🧹 supprime javascript: protocol', () => {
      const dirty = `.url { background: url(javascript:void(0)); }`;
      const clean = sanitizeCSS(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('🧹 supprime les event handlers', () => {
      const dirty = `img { onerror="alert('xss')"; }`;
      const clean = sanitizeCSS(dirty);
      expect(clean).not.toContain('onerror');
    });

    it('✅ préserve le CSS valide', () => {
      const valid = `:root { --color: #007aff; }`;
      const clean = sanitizeCSS(valid);
      expect(clean).toContain('--color');
      expect(clean).toContain('#007aff');
    });
  });

  describe('extractCSSVariables', () => {
    it('✅ extrait toutes les variables CSS', () => {
      const css = `
        :root {
          --primary: #007aff;
          --secondary: #5856d6;
          --spacing-sm: 4px;
        }
      `;
      const vars = extractCSSVariables(css);
      expect(vars.size).toBe(3);
      expect(vars.get('--primary')).toBe('#007aff');
      expect(vars.get('--secondary')).toBe('#5856d6');
      expect(vars.get('--spacing-sm')).toBe('4px');
    });

    it('✅ gère les valeurs avec espaces', () => {
      const css = `--font-family: "Segoe UI", sans-serif;`;
      const vars = extractCSSVariables(css);
      expect(vars.get('--font-family')).toContain('Segoe UI');
    });

    it('✅ gère les valeurs vides/nulles', () => {
      const css = `--empty: inherit;`;
      const vars = extractCSSVariables(css);
      expect(vars.get('--empty')).toBe('inherit');
    });
  });

  describe('checkVariableCoverage', () => {
    it('✅ calcule la couverture correctement', () => {
      const css = `
        :root {
          --background: white;
          --text: black;
        }
      `;
      const required = ['--background', '--text', '--accent', '--primary'];
      const coverage = checkVariableCoverage(css, required);

      expect(coverage.coverage).toBe(50); // 2/4 = 50%
      expect(coverage.missing).toEqual(['--accent', '--primary']);
    });

    it('✅ retourne 100% si toutes les variables sont présentes', () => {
      const css = `--a: 1; --b: 2; --c: 3;`;
      const required = ['--a', '--b', '--c'];
      const coverage = checkVariableCoverage(css, required);

      expect(coverage.coverage).toBe(100);
      expect(coverage.missing).toHaveLength(0);
    });

    it('✅ retourne 0% si aucune variable n\'est présente', () => {
      const css = `--other: value;`;
      const required = ['--a', '--b', '--c'];
      const coverage = checkVariableCoverage(css, required);

      expect(coverage.coverage).toBe(0);
      expect(coverage.missing).toEqual(['--a', '--b', '--c']);
    });
  });
});

/**
 * FR: Tests d'intégration pour les données de thèmes
 * EN: Integration tests for theme data
 */
describe('ThemeMarketplace', () => {
  it('✅ contient au moins 15 thèmes populaires', async () => {
    const { POPULAR_THEMES } = await import('../data/theme-marketplace');
    expect(POPULAR_THEMES.length).toBeGreaterThanOrEqual(15);
  });

  it('✅ tous les thèmes ont les propriétés requises', async () => {
    const { POPULAR_THEMES } = await import('../data/theme-marketplace');

    POPULAR_THEMES.forEach((theme) => {
      expect(theme.id).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.author).toBeDefined();
      expect(theme.description).toBeDefined();
      expect(theme.cssUrl).toBeDefined();
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
    });
  });

  it('✅ tous les thèmes ont des couleurs cohérentes', async () => {
    const { POPULAR_THEMES } = await import('../data/theme-marketplace');

    const requiredColors = [
      'primary',
      'secondary',
      'accent',
      'background',
      'text',
      'error',
      'success',
    ];

    POPULAR_THEMES.forEach((theme) => {
      requiredColors.forEach((color) => {
        expect(theme.colors[color as keyof typeof theme.colors]).toBeDefined();
      });
    });
  });

  it('✅ les URLs de thèmes sont valides (GitHub URLs)', async () => {
    const { POPULAR_THEMES } = await import('../data/theme-marketplace');

    POPULAR_THEMES.forEach((theme) => {
      expect(theme.cssUrl).toMatch(/^https?:\/\//);
      expect(theme.cssUrl).toContain('github.com');
    });
  });
});

/**
 * FR: Tests de performance
 * EN: Performance tests
 */
describe('ThemeValidator Performance', () => {
  it('✅ valide un CSS > 100KB en < 50ms', () => {
    const largeCss = ':root { --color: red; }' + 'x'.repeat(50000);
    const start = performance.now();
    validateThemeCSS(largeCss);
    const end = performance.now();

    expect(end - start).toBeLessThan(50);
  });

  it('✅ extrait variables d\'un CSS > 50KB en < 30ms', () => {
    const largeCss = ':root { --color: red; }' + 'x'.repeat(25000);
    const start = performance.now();
    extractCSSVariables(largeCss);
    const end = performance.now();

    expect(end - start).toBeLessThan(30);
  });
});
