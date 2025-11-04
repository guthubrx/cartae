/**
 * Tests pour ObsidianThemeLoader
 */

import { describe, it, expect, vi } from 'vitest';
import { ObsidianThemeLoader } from '../ObsidianThemeLoader';

describe('ObsidianThemeLoader', () => {
  const loader = new ObsidianThemeLoader();

  describe('loadFromCSS', () => {
    it('doit charger un thème depuis du CSS brut', async () => {
      const css = `
        :root {
          --background-primary: #1e1e1e;
          --text-normal: #dcddde;
          --interactive-accent: #7c3aed;
        }
      `;

      const result = await loader.loadFromCSS(css, {
        themeId: 'test-theme',
        themeName: 'Test Theme',
      });

      expect(result.success).toBe(true);
      expect(result.theme).toBeDefined();
      expect(result.theme?.id).toBe('test-theme');
      expect(result.theme?.name).toBe('Test Theme');
    });

    it('doit détecter automatiquement le mode dark', async () => {
      const css = `
        :root {
          --background-primary: #1e1e1e;
        }
      `;

      const result = await loader.loadFromCSS(css, {
        themeId: 'dark-theme',
        themeName: 'Dark Theme',
      });

      expect(result.success).toBe(true);
      expect(result.theme?.mode).toBe('dark');
    });

    it('doit détecter automatiquement le mode light', async () => {
      const css = `
        :root {
          --background-primary: #ffffff;
        }
      `;

      const result = await loader.loadFromCSS(css, {
        themeId: 'light-theme',
        themeName: 'Light Theme',
      });

      expect(result.success).toBe(true);
      expect(result.theme?.mode).toBe('light');
    });

    it('doit respecter le mode forcé', async () => {
      const css = `
        :root {
          --background-primary: #ffffff;
        }
      `;

      const result = await loader.loadFromCSS(css, {
        themeId: 'forced-dark',
        themeName: 'Forced Dark',
        forceMode: 'dark',
      });

      expect(result.success).toBe(true);
      expect(result.theme?.mode).toBe('dark');
    });

    it('doit mapper correctement les couleurs du thème', async () => {
      const css = `
        :root {
          --background-primary: #1e1e1e;
          --text-normal: #dcddde;
        }
      `;

      const result = await loader.loadFromCSS(css, {
        themeId: 'test',
        themeName: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.theme?.colors.bg).toBe('#1e1e1e');
      expect(result.theme?.colors.fg).toBe('#dcddde');
    });

    it('doit gérer les erreurs de parsing', async () => {
      // CSS invalide ne devrait pas causer d'erreur fatale
      const invalidCss = 'not valid css {{{';

      const result = await loader.loadFromCSS(invalidCss, {
        themeId: 'invalid',
        themeName: 'Invalid',
      });

      // Devrait quand même réussir avec valeurs par défaut
      expect(result.success).toBe(true);
    });
  });

  describe('loadFromFile', () => {
    it('doit charger un thème depuis un fichier File', async () => {
      const css = `
        :root {
          --background-primary: #ffffff;
          --text-normal: #2e3338;
        }
      `;

      // Mock File API
      const file = new File([css], 'theme.css', { type: 'text/css' });

      const result = await loader.loadFromFile(file, {
        themeId: 'file-theme',
        themeName: 'File Theme',
      });

      expect(result.success).toBe(true);
      expect(result.theme).toBeDefined();
      expect(result.theme?.id).toBe('file-theme');
    });
  });

  describe('unloadTheme', () => {
    it('doit permettre de décharger un thème', () => {
      // Test que unloadTheme ne lance pas d'erreur
      expect(() => {
        loader.unloadTheme();
      }).not.toThrow();
    });
  });
});
