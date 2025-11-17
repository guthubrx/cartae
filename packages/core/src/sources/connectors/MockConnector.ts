/**
 * MockConnector - Connecteur factice pour tests et démo
 *
 * Simule un connecteur de source de données pour :
 * - Tests unitaires
 * - Démonstration de l'interface
 * - Validation du système
 */

import type { SourceConnector } from '../SourceManager';
import type { FieldMapping, TestConnectionResult, SyncOptions, SyncProgress } from '../types';
import type { CartaeItem } from '../../types/CartaeItem';

/**
 * Configuration attendue par le MockConnector
 */
export interface MockConnectorConfig {
  /** API endpoint (simulé) */
  endpoint?: string;

  /** API key (simulée) */
  apiKey?: string;

  /** Nombre d'items à générer lors du sync */
  mockItemCount?: number;

  /** Délai artificiel (ms) pour simuler latence réseau */
  mockDelay?: number;

  /** Simuler une erreur de connexion */
  simulateError?: boolean;
}

/**
 * Connecteur Mock
 */
export class MockConnector implements SourceConnector {
  type = 'mock';

  /**
   * Valider la configuration
   */
  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.endpoint || typeof config.endpoint !== 'string') {
      errors.push('endpoint est requis et doit être une chaîne');
    }

    if (!config.apiKey || typeof config.apiKey !== 'string') {
      errors.push('apiKey est requis et doit être une chaîne');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Tester la connexion
   */
  async testConnection(config: Record<string, any>): Promise<TestConnectionResult> {
    const mockConfig = config as MockConnectorConfig;

    // Simuler délai réseau
    if (mockConfig.mockDelay) {
      await new Promise((resolve) => setTimeout(resolve, mockConfig.mockDelay));
    }

    // Simuler erreur
    if (mockConfig.simulateError) {
      return {
        success: false,
        message: 'Erreur de connexion simulée',
        errors: ['Impossible de se connecter à l\'endpoint', 'Vérifiez vos credentials'],
      };
    }

    // Succès
    return {
      success: true,
      message: 'Connexion réussie au Mock Connector',
      details: {
        endpoint: mockConfig.endpoint || 'https://api.mock.cartae.io',
        auth: 'ok',
        permissions: ['read', 'write', 'sync'],
        sampleData: {
          itemsAvailable: mockConfig.mockItemCount || 10,
          lastSync: new Date().toISOString(),
        },
        latency: mockConfig.mockDelay || 50,
      },
    };
  }

  /**
   * Synchroniser les données
   */
  async sync(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }> {
    const mockConfig = config as MockConnectorConfig;
    const itemCount = Math.min(mockConfig.mockItemCount || 10, options?.limit || 999);
    const items: CartaeItem[] = [];
    const errors: Array<{ itemId: string; error: string }> = [];

    // Simuler progression
    for (let i = 0; i < itemCount; i++) {
      // Callback de progression
      if (options?.onProgress) {
        const progress: SyncProgress = {
          processed: i,
          total: itemCount,
          percentage: Math.round((i / itemCount) * 100),
          rate: 10, // items/sec
          eta: ((itemCount - i) / 10) * 1000, // ms
          currentItem: `mock-item-${i}`,
        };
        options.onProgress(progress);
      }

      // Simuler délai de traitement
      if (mockConfig.mockDelay) {
        await new Promise((resolve) => setTimeout(resolve, mockConfig.mockDelay / 10));
      }

      // Générer un item mock
      try {
        const mockItem = this.generateMockItem(i, fieldMappings);
        items.push(mockItem);
      } catch (error) {
        errors.push({
          itemId: `mock-item-${i}`,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }

    // Progression finale
    if (options?.onProgress) {
      options.onProgress({
        processed: itemCount,
        total: itemCount,
        percentage: 100,
        rate: 10,
        eta: 0,
      });
    }

    return { items, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Générer un CartaeItem mock
   */
  private generateMockItem(index: number, fieldMappings: FieldMapping[]): CartaeItem {
    const types: Array<CartaeItem['type']> = [
      'email',
      'task',
      'document',
      'note',
      'event',
      'message',
      'contact',
      'file',
    ];
    const priorities: Array<CartaeItem['priority']> = ['low', 'medium', 'high', 'urgent'];
    const statuses: Array<CartaeItem['status']> = ['active', 'archived', 'deleted'];

    const type = types[index % types.length];
    const now = new Date();

    // Item de base
    const baseItem: CartaeItem = {
      id: `mock_${Date.now()}_${index}`,
      type,
      title: `Mock ${type} #${index + 1}`,
      content: `Contenu mock pour ${type} numéro ${index + 1}.\n\nGénéré par MockConnector pour tests.`,
      source: 'mock-connector',
      sourceId: `mock-source-${index}`,
      priority: priorities[index % priorities.length],
      status: statuses[index % statuses.length],
      createdAt: new Date(now.getTime() - index * 3600000), // -index heures
      updatedAt: now,
      metadata: {
        raw: {},
      },
    };

    // Appliquer les field mappings (simplifi pour mock)
    // Dans un vrai connecteur, cela transformerait les données source
    for (const mapping of fieldMappings) {
      // Simuler application du mapping
      // (dans la vraie implémentation, on prendrait sourceField depuis les données raw)
      if (mapping.targetField === 'title') {
        baseItem.title = `[Mapped] ${baseItem.title}`;
      }
    }

    return baseItem;
  }
}
