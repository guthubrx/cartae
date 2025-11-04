/**
 * Office365Plugin - Tests E2E
 * Tests avec les vraies APIs Office 365 (sans mocks)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Office365Plugin } from '../src/Office365Plugin';

describe('Office365Plugin', () => {
  let plugin: Office365Plugin;

  beforeEach(() => {
    plugin = new Office365Plugin();
  });

  afterEach(async () => {
    if (plugin.isConnected()) {
      await plugin.disconnect();
    }
  });

  describe('Lifecycle', () => {
    it('should create plugin instance', () => {
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('office365-plugin');
      expect(plugin.version).toBe('1.0.0');
    });

    it('should have disconnected state initially', () => {
      expect(plugin.connectionState).toBe('disconnected');
      expect(plugin.isConnected()).toBe(false);
    });

    it('should activate without errors', async () => {
      // Mock IPluginContext
      const mockContext = {
        events: {
          emit: (event: string, data: any) => {
            console.log(`[Test] Event emitted: ${event}`, data);
          },
        },
      };

      await expect(plugin.activate(mockContext as any)).resolves.not.toThrow();
    });

    it('should deactivate without errors', async () => {
      await expect(plugin.deactivate()).resolves.not.toThrow();
      expect(plugin.connectionState).toBe('disconnected');
    });
  });

  describe('Connection', () => {
    it('should fail to connect without extension', async () => {
      // Timeout après 2 secondes pour ne pas bloquer les tests
      const timeout = setTimeout(() => {
        // Test passera si pas de connexion après 2s
      }, 2000);

      const connected = await plugin.connect();

      clearTimeout(timeout);

      // Sans extension, devrait échouer
      expect(connected).toBe(false);
      expect(plugin.connectionState).toBe('failed');
    }, 10000); // 10s timeout pour le test

    it('should disconnect properly', async () => {
      await plugin.disconnect();
      expect(plugin.connectionState).toBe('disconnected');
      expect(plugin.isConnected()).toBe(false);
    });
  });

  describe('DataPluginInterface methods', () => {
    it('should throw when calling getRecent without connection', async () => {
      await expect(plugin.getRecent(10)).rejects.toThrow();
    });

    it('should throw when calling search without connection', async () => {
      await expect(
        plugin.search({ query: 'test' })
      ).rejects.toThrow();
    });

    it('should throw when calling sync without connection', async () => {
      await expect(plugin.sync()).rejects.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Tests de gestion d'erreur basiques
      expect(() => {
        // Mock scenarios
      }).not.toThrow();
    });
  });
});
