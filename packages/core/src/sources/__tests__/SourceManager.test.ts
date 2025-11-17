/**
 * Tests unitaires pour SourceManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceManager } from '../SourceManager';
import { MockConnector } from '../connectors/MockConnector';
import type { SourceStorage } from '../SourceManager';
import type { SourceConfig, SyncHistoryEntry } from '../types';

/**
 * In-Memory Storage pour tests
 */
class InMemorySourceStorage implements SourceStorage {
  private sources: Map<string, SourceConfig> = new Map();
  private history: SyncHistoryEntry[] = [];

  async getAllSources(): Promise<SourceConfig[]> {
    return Array.from(this.sources.values());
  }

  async getSource(id: string): Promise<SourceConfig | null> {
    return this.sources.get(id) || null;
  }

  async saveSource(source: SourceConfig): Promise<void> {
    this.sources.set(source.id, source);
  }

  async deleteSource(id: string): Promise<void> {
    this.sources.delete(id);
  }

  async getSyncHistory(sourceId: string, limit: number = 50): Promise<SyncHistoryEntry[]> {
    return this.history
      .filter((entry) => entry.sourceId === sourceId)
      .slice(0, limit);
  }

  async saveSyncHistory(entry: SyncHistoryEntry): Promise<void> {
    this.history.push(entry);
  }

  // Helper pour tests
  clear(): void {
    this.sources.clear();
    this.history = [];
  }
}

describe('SourceManager', () => {
  let storage: InMemorySourceStorage;
  let manager: SourceManager;
  let mockConnector: MockConnector;

  beforeEach(() => {
    storage = new InMemorySourceStorage();
    mockConnector = new MockConnector();

    manager = new SourceManager({
      storage,
      enableAutoSync: false, // Désactiver auto-sync pour tests
      connectors: new Map([['mock', mockConnector]]),
    });
  });

  describe('CRUD Sources', () => {
    it('devrait créer une nouvelle source', async () => {
      const source = await manager.createSource(
        'Test Source',
        'mock',
        {
          endpoint: 'https://api.test.com',
          apiKey: 'test-key',
        },
        [
          {
            id: '1',
            sourceField: 'title',
            targetField: 'title',
          },
        ]
      );

      expect(source).toBeDefined();
      expect(source.id).toMatch(/^source_/);
      expect(source.name).toBe('Test Source');
      expect(source.connectorType).toBe('mock');
      expect(source.status).toBe('configuring');
    });

    it('devrait récupérer une source par ID', async () => {
      const created = await manager.createSource('Test Source', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      const retrieved = await manager.getSource(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Source');
    });

    it('devrait retourner null pour une source inexistante', async () => {
      const result = await manager.getSource('non-existent-id');
      expect(result).toBeNull();
    });

    it('devrait récupérer toutes les sources', async () => {
      await manager.createSource('Source 1', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'key1',
      }, []);
      await manager.createSource('Source 2', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'key2',
      }, []);

      const sources = await manager.getAllSources();

      expect(sources).toHaveLength(2);
      expect(sources[0].name).toBe('Source 1');
      expect(sources[1].name).toBe('Source 2');
    });

    it('devrait mettre à jour une source', async () => {
      const source = await manager.createSource('Original Name', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      const updated = await manager.updateSource(source.id, {
        name: 'Updated Name',
        status: 'active',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('active');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(source.updatedAt.getTime());
    });

    it('devrait lever une erreur si mise à jour source inexistante', async () => {
      await expect(
        manager.updateSource('non-existent', { name: 'New Name' })
      ).rejects.toThrow('Source non trouvée');
    });

    it('devrait supprimer une source', async () => {
      const source = await manager.createSource('To Delete', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      await manager.deleteSource(source.id);

      const retrieved = await manager.getSource(source.id);
      expect(retrieved).toBeNull();
    });

    it('devrait changer le statut d\'une source', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      await manager.setSourceStatus(source.id, 'active');

      const updated = await manager.getSource(source.id);
      expect(updated?.status).toBe('active');
    });
  });

  describe('Test Connexion', () => {
    it('devrait tester la connexion avec succès', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockDelay: 0,
      }, []);

      const result = await manager.testConnection(source.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Connexion réussie');
      expect(result.details).toBeDefined();
      expect(result.details?.auth).toBe('ok');
    });

    it('devrait échouer le test si source inexistante', async () => {
      await expect(manager.testConnection('non-existent')).rejects.toThrow(
        'Source non trouvée'
      );
    });

    it('devrait retourner erreur si connecteur non disponible', async () => {
      const source = await manager.createSource('Test', 'custom', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      const result = await manager.testConnection(source.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connecteur non disponible');
      expect(result.errors).toBeDefined();
    });

    it('devrait gérer erreur de connexion simulée', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        simulateError: true,
      }, []);

      const result = await manager.testConnection(source.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erreur');
    });
  });

  describe('Synchronisation', () => {
    it('devrait synchroniser une source avec succès', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 5,
        mockDelay: 0,
      }, []);

      const result = await manager.syncSource(source.id);

      expect(result.success).toBe(true);
      expect(result.sourceId).toBe(source.id);
      expect(result.itemsProcessed).toBe(5);
      expect(result.itemsSuccess).toBe(5);
      expect(result.itemsError).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('devrait mettre à jour lastSyncAt après sync réussie', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 1,
        mockDelay: 0,
      }, []);

      await manager.syncSource(source.id);

      const updated = await manager.getSource(source.id);
      expect(updated?.lastSyncAt).toBeDefined();
      expect(updated?.status).toBe('active');
    });

    it('devrait sauvegarder historique de sync', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 3,
        mockDelay: 0,
      }, []);

      await manager.syncSource(source.id);

      const history = await manager.getSyncHistory(source.id);

      expect(history).toHaveLength(1);
      expect(history[0].sourceId).toBe(source.id);
      expect(history[0].status).toBe('success');
      expect(history[0].itemsProcessed).toBe(3);
    });

    it('devrait empêcher sync simultanées sur même source', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 10,
        mockDelay: 100, // Ralentir pour permettre test concurrence
      }, []);

      // Lancer premier sync (ne pas awaiter)
      const firstSync = manager.syncSource(source.id);

      // Tenter second sync immédiatement
      await expect(manager.syncSource(source.id)).rejects.toThrow(
        'Synchronisation déjà en cours'
      );

      // Attendre que le premier sync se termine
      await firstSync;
    });

    it('devrait appeler callback de progression', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 5,
        mockDelay: 0,
      }, []);

      const progressUpdates: number[] = [];

      await manager.syncSource(source.id, {
        onProgress: (progress) => {
          progressUpdates.push(progress.processed);
        },
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(5); // Dernier = 100%
    });

    it('devrait respecter limit option', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 100,
        mockDelay: 0,
      }, []);

      const result = await manager.syncSource(source.id, { limit: 10 });

      expect(result.itemsProcessed).toBe(10);
    });

    it('devrait échouer si source inexistante', async () => {
      await expect(manager.syncSource('non-existent')).rejects.toThrow(
        'Source non trouvée'
      );
    });

    it('devrait échouer si connecteur non disponible', async () => {
      const source = await manager.createSource('Test', 'custom', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      await expect(manager.syncSource(source.id)).rejects.toThrow(
        'Connecteur non disponible'
      );
    });
  });

  describe('Connecteurs', () => {
    it('devrait enregistrer un nouveau connecteur', () => {
      const customConnector = new MockConnector();
      customConnector.type = 'custom-type';

      manager.registerConnector(customConnector);

      const retrieved = manager.getConnector('custom-type');
      expect(retrieved).toBe(customConnector);
    });

    it('devrait lister tous les connecteurs disponibles', () => {
      const types = manager.getAvailableConnectors();
      expect(types).toContain('mock');
    });

    it('devrait retourner undefined pour connecteur inexistant', () => {
      const connector = manager.getConnector('non-existent');
      expect(connector).toBeUndefined();
    });
  });

  describe('Événements', () => {
    it('devrait émettre event source:created', async () => {
      const handler = vi.fn();
      manager.on('source:created', handler);

      await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({
        name: 'Test',
        connectorType: 'mock',
      });
    });

    it('devrait émettre event source:updated', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      const handler = vi.fn();
      manager.on('source:updated', handler);

      await manager.updateSource(source.id, { name: 'Updated' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({
        id: source.id,
        name: 'Updated',
      });
    });

    it('devrait émettre event source:deleted', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
      }, []);

      const handler = vi.fn();
      manager.on('source:deleted', handler);

      await manager.deleteSource(source.id);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBe(source.id);
    });

    it('devrait émettre events de sync', async () => {
      const source = await manager.createSource('Test', 'mock', {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        mockItemCount: 2,
        mockDelay: 0,
      }, []);

      const startedHandler = vi.fn();
      const completedHandler = vi.fn();

      manager.on('source:sync:started', startedHandler);
      manager.on('source:sync:completed', completedHandler);

      await manager.syncSource(source.id);

      expect(startedHandler).toHaveBeenCalledTimes(1);
      expect(completedHandler).toHaveBeenCalledTimes(1);
      expect(completedHandler.mock.calls[0][0]).toMatchObject({
        success: true,
        sourceId: source.id,
      });
    });
  });

  describe('Lifecycle', () => {
    it('devrait nettoyer ressources avec destroy()', () => {
      manager.destroy();

      const types = manager.getAvailableConnectors();
      expect(types).toHaveLength(0);
    });
  });
});
