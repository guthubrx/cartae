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
});
