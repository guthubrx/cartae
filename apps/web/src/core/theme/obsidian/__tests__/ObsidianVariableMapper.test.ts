/**
 * Tests pour ObsidianVariableMapper
 */

import { describe, it, expect } from 'vitest';
import { ObsidianVariableMapper } from '../ObsidianVariableMapper';
import { lightTheme, darkTheme } from '../../defaultThemes';

describe('ObsidianVariableMapper', () => {
  const mapper = new ObsidianVariableMapper();

  describe('mapToTheme', () => {
    it('doit mapper les couleurs de fond Obsidian vers Cartae', () => {
      const obsidianVars = {
        '--background-primary': '#1e1e1e',
        '--background-secondary': '#252525',
      };

      const result = mapper.mapToTheme(obsidianVars, darkTheme);

      expect(result.colors?.bg).toBe('#1e1e1e');
      expect(result.colors?.bgSecondary).toBe('#252525');
    });

    it('doit mapper les couleurs de texte Obsidian vers Cartae', () => {
      const obsidianVars = {
        '--text-normal': '#dcddde',
        '--text-muted': '#999999',
      };

      const result = mapper.mapToTheme(obsidianVars, darkTheme);

      expect(result.colors?.fg).toBe('#dcddde');
      expect(result.colors?.fgSecondary).toBe('#999999');
    });

    it('doit mapper les couleurs accent Obsidian vers Cartae', () => {
      const obsidianVars = {
        '--interactive-accent': '#7c3aed',
        '--interactive-accent-hover': '#6d28d9',
      };

      const result = mapper.mapToTheme(obsidianVars, lightTheme);

      expect(result.colors?.accent).toBe('#7c3aed');
      expect(result.colors?.accentHover).toBe('#6d28d9');
    });

    it('doit utiliser les valeurs fallback si variables absentes', () => {
      const obsidianVars = {}; // Aucune variable

      const result = mapper.mapToTheme(obsidianVars, lightTheme);

      // Les fallbacks doivent être utilisés
      expect(result.colors?.bg).toBeDefined();
      expect(result.colors?.fg).toBeDefined();
    });

    it('doit mapper la typographie Obsidian vers Cartae', () => {
      const obsidianVars = {
        '--font-text': 'Inter, sans-serif',
        '--font-text-size': '16px',
      };

      const result = mapper.mapToTheme(obsidianVars, lightTheme);

      expect(result.typography?.fontFamily).toBe('Inter, sans-serif');
      expect(result.typography?.fontSize?.md).toBe('16px');
    });

    it('doit mapper les espacements Obsidian vers Cartae', () => {
      const obsidianVars = {
        '--size-4-2': '0.5rem',
        '--size-4-4': '1rem',
      };

      const result = mapper.mapToTheme(obsidianVars, lightTheme);

      expect(result.spacing?.sm).toBe('0.5rem');
      expect(result.spacing?.md).toBe('1rem');
    });
  });

  describe('detectThemeMode', () => {
    it('doit détecter un thème dark (fond sombre)', () => {
      const obsidianVars = {
        '--background-primary': '#1e1e1e',
      };

      const mode = mapper.detectThemeMode(obsidianVars);

      expect(mode).toBe('dark');
    });

    it('doit détecter un thème light (fond clair)', () => {
      const obsidianVars = {
        '--background-primary': '#ffffff',
      };

      const mode = mapper.detectThemeMode(obsidianVars);

      expect(mode).toBe('light');
    });

    it('doit détecter un thème light avec fond gris clair', () => {
      const obsidianVars = {
        '--background-primary': '#f5f5f5',
      };

      const mode = mapper.detectThemeMode(obsidianVars);

      expect(mode).toBe('light');
    });

    it('doit retourner light par défaut si variable absente', () => {
      const obsidianVars = {};

      const mode = mapper.detectThemeMode(obsidianVars);

      expect(mode).toBe('light');
    });
  });

  describe('getMappingCount', () => {
    it('doit retourner le nombre total de mappings (environ 90)', () => {
      const count = ObsidianVariableMapper.getMappingCount();

      expect(count).toBeGreaterThanOrEqual(80);
      expect(count).toBeLessThanOrEqual(100);
    });
  });
});
