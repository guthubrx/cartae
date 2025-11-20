/**
 * Tests unitaires pour LegacyAdapters
 *
 * Tests de migration bidirectionnelle et vérification intégrité
 *
 * @packageDocumentation
 * @module sources/__tests__
 */

import { describe, it, expect } from 'vitest';
import {
  sourceConfigToUnified,
  dataSourceToUnified,
  unifiedToSourceConfig,
  unifiedToDataSource,
  convertMappingsToFieldMappings,
  convertFieldMappingsToMappings,
  calculateNextSync,
  generateChecksum,
  type DataSource,
} from '../adapters/LegacyAdapters';
import type { SourceConfig } from '../types';
import type { UnifiedSource, FieldMapping } from '../types/UnifiedSource';

describe('LegacyAdapters', () => {
  // ========== SourceConfig → UnifiedSource ==========

  describe('sourceConfigToUnified', () => {
    it('should convert SourceConfig to UnifiedSource', () => {
      const sourceConfig: SourceConfig = {
        id: '123',
        name: 'My Office365',
        connectorType: 'office365-mail',
        config: { apiUrl: 'https://graph.microsoft.com/v1.0' },
        status: 'active',
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-20T10:30:00Z'),
        lastSyncAt: new Date('2025-01-20T10:00:00Z'),
        lastSyncError: undefined,
        autoSync: true,
        syncInterval: 15,
        fieldMappings: [
          {
            id: 'map-1',
            sourceField: 'from.emailAddress.address',
            targetField: 'metadata.author',
            transform: 'lowercase',
            required: true,
          },
        ],
        metadata: { color: 'blue' },
      };

      const unified = sourceConfigToUnified(sourceConfig);

      // Vérifier champs copiés
      expect(unified.id).toBe('123');
      expect(unified.name).toBe('My Office365');
      expect(unified.connectorType).toBe('office365-mail');
      expect(unified.status).toBe('active');
      expect(unified.config).toEqual({ apiUrl: 'https://graph.microsoft.com/v1.0' });
      expect(unified.fieldMappings).toHaveLength(1);
      expect(unified.autoSync).toBe(true);
      expect(unified.syncInterval).toBe(15);
      expect(unified.lastSyncAt).toBeInstanceOf(Date);
      expect(unified.metadata).toEqual({ color: 'blue' });

      // Vérifier champs calculés
      expect(unified.nextSyncAt).toBeInstanceOf(Date);
      expect(unified.itemsCount).toBe(0); // Default
      expect(unified.totalSize).toBe(0); // Default
      expect(unified.createdBy).toBe('unknown'); // Migration legacy

      // Vérifier sécurité
      expect(unified.schemaVersion).toBe(1);
      expect(unified.checksum).toBeDefined();
      expect(typeof unified.checksum).toBe('string');
      expect(unified.checksum.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should handle missing optional fields', () => {
      const sourceConfig: SourceConfig = {
        id: '456',
        name: 'Simple Source',
        connectorType: 'gmail',
        config: {},
        status: 'paused',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoSync: false,
        fieldMappings: [],
      };

      const unified = sourceConfigToUnified(sourceConfig);

      expect(unified.lastSyncAt).toBeNull();
      expect(unified.lastSyncError).toBeNull();
      expect(unified.syncInterval).toBeNull();
      expect(unified.nextSyncAt).toBeNull(); // paused → no next sync
      expect(unified.metadata).toEqual({});
    });
  });

  // ========== DataSource → UnifiedSource ==========

  describe('dataSourceToUnified', () => {
    it('should convert DataSource to UnifiedSource', () => {
      const dataSource: DataSource = {
        id: '789',
        name: 'My Gmail',
        connectorType: 'gmail',
        status: 'active',
        config: { userId: 'user@gmail.com' },
        mappings: {
          'from.emailAddress': 'author',
          subject: 'title',
        },
        lastSync: new Date('2025-01-20T10:00:00Z'),
        nextSync: new Date('2025-01-20T10:15:00Z'),
        itemsCount: 1547,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-20T10:30:00Z'),
      };

      const unified = dataSourceToUnified(dataSource);

      // Vérifier champs copiés
      expect(unified.id).toBe('789');
      expect(unified.name).toBe('My Gmail');
      expect(unified.connectorType).toBe('gmail');
      expect(unified.status).toBe('active');
      expect(unified.config).toEqual({ userId: 'user@gmail.com' });
      expect(unified.lastSyncAt).toBeInstanceOf(Date);
      expect(unified.nextSyncAt).toBeInstanceOf(Date);
      expect(unified.itemsCount).toBe(1547);

      // Vérifier mappings convertis
      expect(unified.fieldMappings).toHaveLength(2);
      expect(unified.fieldMappings[0]).toMatchObject({
        sourceField: 'from.emailAddress',
        targetField: 'author',
        transform: 'none',
        required: false,
      });

      // Vérifier champs par défaut (DataSource n'a pas ces infos)
      expect(unified.autoSync).toBe(false);
      expect(unified.syncInterval).toBeNull();
      expect(unified.totalSize).toBe(0);
      expect(unified.createdBy).toBe('unknown');

      // Vérifier sécurité
      expect(unified.schemaVersion).toBe(1);
      expect(unified.checksum).toBeDefined();
    });
  });

  // ========== UnifiedSource → SourceConfig (REVERSE) ==========

  describe('unifiedToSourceConfig', () => {
    it('should convert UnifiedSource to SourceConfig', () => {
      const unified: UnifiedSource = {
        id: '123',
        name: 'Test Source',
        connectorType: 'office365-mail',
        status: 'active',
        config: { apiUrl: 'https://example.com' },
        fieldMappings: [
          {
            id: '1',
            sourceField: 'email',
            targetField: 'author',
            transform: 'lowercase',
            required: true,
          },
        ],
        autoSync: true,
        syncInterval: 15,
        lastSyncAt: new Date('2025-01-20T10:00:00Z'),
        nextSyncAt: new Date('2025-01-20T10:15:00Z'),
        lastSyncError: null,
        syncHistoryIds: ['sync-1', 'sync-2'],
        itemsCount: 100,
        totalSize: 5000000,
        lastSyncDuration: 4523,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-20T10:30:00Z'),
        createdBy: 'user-123',
        metadata: { color: 'blue' },
        schemaVersion: 1,
        checksum: 'abc123',
      };

      const sourceConfig = unifiedToSourceConfig(unified);

      // Vérifier champs copiés
      expect(sourceConfig.id).toBe('123');
      expect(sourceConfig.name).toBe('Test Source');
      expect(sourceConfig.connectorType).toBe('office365-mail');
      expect(sourceConfig.status).toBe('active');
      expect(sourceConfig.config).toEqual({ apiUrl: 'https://example.com' });
      expect(sourceConfig.fieldMappings).toHaveLength(1);
      expect(sourceConfig.autoSync).toBe(true);
      expect(sourceConfig.syncInterval).toBe(15);
      expect(sourceConfig.lastSyncAt).toBeInstanceOf(Date);
      expect(sourceConfig.lastSyncError).toBeUndefined();
      expect(sourceConfig.metadata).toEqual({ color: 'blue' });

      // Vérifier champs absents de SourceConfig (ignorés)
      expect((sourceConfig as any).nextSyncAt).toBeUndefined();
      expect((sourceConfig as any).itemsCount).toBeUndefined();
      expect((sourceConfig as any).totalSize).toBeUndefined();
      expect((sourceConfig as any).schemaVersion).toBeUndefined();
    });
  });

  // ========== UnifiedSource → DataSource (REVERSE) ==========

  describe('unifiedToDataSource', () => {
    it('should convert UnifiedSource to DataSource', () => {
      const unified: UnifiedSource = {
        id: '789',
        name: 'Test Source',
        connectorType: 'gmail',
        status: 'active',
        config: { userId: 'user@gmail.com' },
        fieldMappings: [
          {
            id: '1',
            sourceField: 'email',
            targetField: 'author',
            transform: 'lowercase',
            required: true,
          },
          {
            id: '2',
            sourceField: 'subject',
            targetField: 'title',
            transform: 'none',
            required: true,
          },
        ],
        autoSync: true,
        syncInterval: 15,
        lastSyncAt: new Date('2025-01-20T10:00:00Z'),
        nextSyncAt: new Date('2025-01-20T10:15:00Z'),
        lastSyncError: null,
        syncHistoryIds: [],
        itemsCount: 1547,
        totalSize: 5000000,
        lastSyncDuration: 4523,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-20T10:30:00Z'),
        createdBy: 'user-123',
        metadata: { color: 'blue' },
        schemaVersion: 1,
        checksum: 'abc123',
      };

      const dataSource = unifiedToDataSource(unified);

      // Vérifier champs copiés
      expect(dataSource.id).toBe('789');
      expect(dataSource.name).toBe('Test Source');
      expect(dataSource.connectorType).toBe('gmail');
      expect(dataSource.status).toBe('active');
      expect(dataSource.config).toEqual({ userId: 'user@gmail.com' });
      expect(dataSource.lastSync).toBeInstanceOf(Date);
      expect(dataSource.nextSync).toBeInstanceOf(Date);
      expect(dataSource.itemsCount).toBe(1547);

      // Vérifier mappings convertis (FieldMappings → simple Record)
      expect(dataSource.mappings).toEqual({
        email: 'author',
        subject: 'title',
      });

      // Vérifier champs absents de DataSource (ignorés)
      expect((dataSource as any).autoSync).toBeUndefined();
      expect((dataSource as any).syncInterval).toBeUndefined();
      expect((dataSource as any).totalSize).toBeUndefined();
    });
  });

  // ========== MIGRATION BIDIRECTIONNELLE (IDEMPOTENCE) ==========

  describe('Migration bidirectionnelle - Idempotence', () => {
    it('SourceConfig → Unified → SourceConfig should be idempotent (no data loss)', () => {
      const original: SourceConfig = {
        id: '123',
        name: 'Original Source',
        connectorType: 'office365-mail',
        config: { apiUrl: 'https://example.com' },
        status: 'active',
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-20T10:30:00Z'),
        lastSyncAt: new Date('2025-01-20T10:00:00Z'),
        lastSyncError: 'Test error',
        autoSync: true,
        syncInterval: 15,
        fieldMappings: [
          {
            id: 'map-1',
            sourceField: 'email',
            targetField: 'author',
            transform: 'lowercase',
            required: true,
          },
        ],
        metadata: { color: 'blue', priority: 'high' },
      };

      // Original → Unified → Back
      const unified = sourceConfigToUnified(original);
      const back = unifiedToSourceConfig(unified);

      // Vérifier tous les champs sont identiques
      expect(back.id).toBe(original.id);
      expect(back.name).toBe(original.name);
      expect(back.connectorType).toBe(original.connectorType);
      expect(back.config).toEqual(original.config);
      expect(back.status).toBe(original.status);
      expect(back.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(back.updatedAt.getTime()).toBe(original.updatedAt.getTime());
      expect(back.lastSyncAt?.getTime()).toBe(original.lastSyncAt?.getTime());
      expect(back.lastSyncError).toBe(original.lastSyncError);
      expect(back.autoSync).toBe(original.autoSync);
      expect(back.syncInterval).toBe(original.syncInterval);
      expect(back.fieldMappings).toEqual(original.fieldMappings);
      expect(back.metadata).toEqual(original.metadata);
    });

    it('DataSource → Unified → DataSource should preserve essential data', () => {
      const original: DataSource = {
        id: '456',
        name: 'Original DataSource',
        connectorType: 'gmail',
        status: 'active',
        config: { userId: 'user@gmail.com' },
        mappings: {
          email: 'author',
          subject: 'title',
        },
        lastSync: new Date('2025-01-20T10:00:00Z'),
        nextSync: new Date('2025-01-20T10:15:00Z'),
        itemsCount: 1547,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-20T10:30:00Z'),
      };

      // Original → Unified → Back
      const unified = dataSourceToUnified(original);
      const back = unifiedToDataSource(unified);

      // Vérifier champs essentiels sont identiques
      expect(back.id).toBe(original.id);
      expect(back.name).toBe(original.name);
      expect(back.connectorType).toBe(original.connectorType);
      expect(back.status).toBe(original.status);
      expect(back.config).toEqual(original.config);
      expect(back.mappings).toEqual(original.mappings);
      expect(back.lastSync?.getTime()).toBe(original.lastSync?.getTime());
      expect(back.nextSync?.getTime()).toBe(original.nextSync?.getTime());
      expect(back.itemsCount).toBe(original.itemsCount);
      expect(back.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(back.updatedAt.getTime()).toBe(original.updatedAt.getTime());
    });
  });

  // ========== HELPERS ==========

  describe('convertMappingsToFieldMappings', () => {
    it('should convert simple mappings to FieldMappings', () => {
      const simple = {
        'from.emailAddress': 'author',
        subject: 'title',
        receivedDateTime: 'timestamp',
      };

      const fieldMappings = convertMappingsToFieldMappings(simple);

      expect(fieldMappings).toHaveLength(3);
      expect(fieldMappings[0]).toMatchObject({
        id: 'mapping-0',
        sourceField: 'from.emailAddress',
        targetField: 'author',
        transform: 'none',
        required: false,
      });
      expect(fieldMappings[1]).toMatchObject({
        id: 'mapping-1',
        sourceField: 'subject',
        targetField: 'title',
      });
    });

    it('should handle empty mappings', () => {
      const fieldMappings = convertMappingsToFieldMappings({});
      expect(fieldMappings).toHaveLength(0);
    });
  });

  describe('convertFieldMappingsToMappings', () => {
    it('should convert FieldMappings to simple mappings', () => {
      const fieldMappings: FieldMapping[] = [
        {
          id: '1',
          sourceField: 'email',
          targetField: 'author',
          transform: 'lowercase',
          required: true,
        },
        {
          id: '2',
          sourceField: 'subject',
          targetField: 'title',
          transform: 'none',
          required: true,
        },
      ];

      const simple = convertFieldMappingsToMappings(fieldMappings);

      expect(simple).toEqual({
        email: 'author',
        subject: 'title',
      });
    });

    it('should handle empty FieldMappings', () => {
      const simple = convertFieldMappingsToMappings([]);
      expect(simple).toEqual({});
    });
  });

  describe('calculateNextSync', () => {
    it('should calculate next sync from last sync + interval', () => {
      const lastSync = new Date('2025-01-20T10:00:00Z');
      const interval = 15; // 15 minutes

      const nextSync = calculateNextSync(lastSync, interval, 'active', true);

      expect(nextSync).toBeInstanceOf(Date);
      expect(nextSync?.getTime()).toBe(
        lastSync.getTime() + 15 * 60 * 1000
      );
    });

    it('should return null if autoSync disabled', () => {
      const lastSync = new Date('2025-01-20T10:00:00Z');
      const interval = 15;

      const nextSync = calculateNextSync(lastSync, interval, 'active', false);

      expect(nextSync).toBeNull();
    });

    it('should return null if status is paused', () => {
      const lastSync = new Date('2025-01-20T10:00:00Z');
      const interval = 15;

      const nextSync = calculateNextSync(lastSync, interval, 'paused', true);

      expect(nextSync).toBeNull();
    });

    it('should return null if no lastSyncAt', () => {
      const nextSync = calculateNextSync(undefined, 15, 'active', true);

      expect(nextSync).toBeNull();
    });

    it('should return null if no syncInterval', () => {
      const lastSync = new Date('2025-01-20T10:00:00Z');

      const nextSync = calculateNextSync(lastSync, undefined, 'active', true);

      expect(nextSync).toBeNull();
    });
  });

  describe('generateChecksum', () => {
    it('should generate SHA-256 checksum for SourceConfig', () => {
      const config: SourceConfig = {
        id: '123',
        name: 'Test',
        connectorType: 'gmail',
        config: { apiUrl: 'https://example.com' },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoSync: false,
        fieldMappings: [],
      };

      const checksum = generateChecksum(config);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should generate different checksums for different data', () => {
      const config1: SourceConfig = {
        id: '123',
        name: 'Test 1',
        connectorType: 'gmail',
        config: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoSync: false,
        fieldMappings: [],
      };

      const config2: SourceConfig = {
        ...config1,
        name: 'Test 2', // Différent
      };

      const checksum1 = generateChecksum(config1);
      const checksum2 = generateChecksum(config2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should generate same checksum for identical data', () => {
      const config: SourceConfig = {
        id: '123',
        name: 'Test',
        connectorType: 'gmail',
        config: { apiUrl: 'https://example.com' },
        status: 'active',
        createdAt: new Date('2025-01-20T10:00:00Z'),
        updatedAt: new Date('2025-01-20T10:00:00Z'),
        autoSync: false,
        fieldMappings: [],
      };

      const checksum1 = generateChecksum(config);
      const checksum2 = generateChecksum(config);

      expect(checksum1).toBe(checksum2);
    });
  });
});
