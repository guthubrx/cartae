/**
 * Tests pour ObsidianThemeParser
 */

import { describe, it, expect } from 'vitest';
import { ObsidianThemeParser } from '../ObsidianThemeParser';

describe('ObsidianThemeParser', () => {
  const parser = new ObsidianThemeParser();

  describe('parse', () => {
    it('doit extraire les variables CSS basiques', () => {
      const css = `
        :root {
          --background-primary: #ffffff;
          --text-normal: #2e3338;
        }
      `;

      const result = parser.parse(css);

      expect(result['--background-primary']).toBe('#ffffff');
      expect(result['--text-normal']).toBe('#2e3338');
    });

    it('doit gérer les commentaires CSS', () => {
      const css = `
        :root {
          /* Couleur de fond */
          --background-primary: #ffffff;
          // Couleur du texte
          --text-normal: #2e3338;
        }
      `;

      const result = parser.parse(css);

      expect(result['--background-primary']).toBe('#ffffff');
      expect(result['--text-normal']).toBe('#2e3338');
    });

    it('doit gérer les valeurs avec espaces', () => {
      const css = `
        :root {
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI";
        }
      `;

      const result = parser.parse(css);

      expect(result['--shadow']).toBe('0 4px 6px rgba(0, 0, 0, 0.1)');
      expect(result['--font-family']).toBe('-apple-system, BlinkMacSystemFont, "Segoe UI"');
    });

    it('doit gérer les variables vides', () => {
      const css = ':root {}';
      const result = parser.parse(css);
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('resolveVariableReferences', () => {
    it('doit résoudre les références var() simples', () => {
      const vars = {
        '--color-base': '#ffffff',
        '--background': 'var(--color-base)',
      };

      const resolved = parser.resolveVariableReferences(vars);

      expect(resolved['--background']).toBe('#ffffff');
    });

    it('doit résoudre les références var() imbriquées', () => {
      const vars = {
        '--color-base': '#ffffff',
        '--color-primary': 'var(--color-base)',
        '--background': 'var(--color-primary)',
      };

      const resolved = parser.resolveVariableReferences(vars);

      expect(resolved['--background']).toBe('#ffffff');
    });

    it('doit gérer les valeurs de fallback', () => {
      const vars = {
        '--background': 'var(--missing-var, #ffffff)',
      };

      const resolved = parser.resolveVariableReferences(vars);

      expect(resolved['--background']).toBe('#ffffff');
    });

    it('doit gérer les variables sans références', () => {
      const vars = {
        '--background': '#ffffff',
        '--text': '#000000',
      };

      const resolved = parser.resolveVariableReferences(vars);

      expect(resolved['--background']).toBe('#ffffff');
      expect(resolved['--text']).toBe('#000000');
    });
  });

  describe('resolveCalcExpressions', () => {
    it('doit évaluer calc() simple avec une seule unité', () => {
      const vars = {
        '--spacing': 'calc(2 * 16px)',
        '--height': 'calc(100 + 50px)',
      };

      const resolved = parser.resolveCalcExpressions(vars);

      expect(resolved['--spacing']).toBe('32px');
      expect(resolved['--height']).toBe('150px');
    });

    it('doit préserver calc() avec unités mixtes', () => {
      const vars = {
        '--width': 'calc(100% - 20px)',
        '--height': 'calc(50vh + 10rem)',
      };

      const resolved = parser.resolveCalcExpressions(vars);

      // Unités mixtes ne peuvent pas être évaluées → garder calc()
      expect(resolved['--width']).toBe('calc(100% - 20px)');
      expect(resolved['--height']).toBe('calc(50vh + 10rem)');
    });

    it('doit gérer les variables sans calc()', () => {
      const vars = {
        '--background': '#ffffff',
        '--spacing': '16px',
      };

      const resolved = parser.resolveCalcExpressions(vars);

      expect(resolved['--background']).toBe('#ffffff');
      expect(resolved['--spacing']).toBe('16px');
    });

    it('doit gérer calc() avec division et multiplication', () => {
      const vars = {
        '--half': 'calc(100px / 2)',
        '--double': 'calc(50px * 2)',
      };

      const resolved = parser.resolveCalcExpressions(vars);

      expect(resolved['--half']).toBe('50px');
      expect(resolved['--double']).toBe('100px');
    });

    it('doit préserver calc() complexes non évaluables', () => {
      const vars = {
        '--complex': 'calc(var(--base) + 10px)',
      };

      const resolved = parser.resolveCalcExpressions(vars);

      // Expression contient var() → non évaluable, garder tel quel
      expect(resolved['--complex']).toBe('calc(var(--base) + 10px)');
    });
  });

  describe('résolution combinée (var + calc) - Session 58', () => {
    it('doit résoudre var() puis évaluer calc()', () => {
      const vars = {
        '--base-size': '16px',
        '--computed': 'var(--base-size)',
        '--doubled': 'calc(2 * 16px)',
      };

      // Résoudre var() d'abord
      const resolved = parser.resolveVariableReferences(vars);
      // Puis évaluer calc()
      const final = parser.resolveCalcExpressions(resolved);

      expect(final['--computed']).toBe('16px');
      expect(final['--doubled']).toBe('32px');
    });

    it('doit gérer var() imbriqué avec fallback dans calc()', () => {
      const vars = {
        '--fallback': 'var(--missing, 100px)',
        '--calc': 'calc(2 * 50px)',
      };

      const resolved = parser.resolveVariableReferences(vars);
      const final = parser.resolveCalcExpressions(resolved);

      expect(final['--fallback']).toBe('100px');
      expect(final['--calc']).toBe('100px');
    });
  });
});
