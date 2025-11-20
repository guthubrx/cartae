/**
 * LegacyAdapters - Adapters backward compatibility
 *
 * Permet la migration graduelle de SourceConfig/DataSource → UnifiedSource
 * pendant la période de transition (3-6 mois).
 *
 * **Stratégie:**
 * - Phase 1 (Session 128): Créer adapters
 * - Phase 2 (Sessions 129-131): Nouveau code utilise UnifiedSource
 * - Phase 3 (Mois 1-4): Migration progressive services + UI
 * - Phase 4 (Mois 5-6): Supprimer adapters + anciens types
 *
 * @packageDocumentation
 * @module sources/adapters
 * @version 1.0.0
 * @since Session 128
 * @deprecated Ces adapters seront supprimés après migration complète (Q3 2025)
 */

import crypto from 'crypto';
import type { UnifiedSource } from '../types/UnifiedSource';
import type { FieldMapping } from '../types/UnifiedSource';
import type {
  SourceConfig,
  ConnectorType,
  SourceStatus,
} from '../types';

/**
 * Type DataSource (de packages/ui)
 *
 * Copie locale pour éviter dépendance circulaire.
 * À supprimer quand UI migre vers UnifiedSource.
 *
 * @deprecated Utiliser UnifiedSource
 */
export interface DataSource {
  id: string;
  name: string;
  connectorType: ConnectorType;
  status: SourceStatus;
  config: Record<string, any>;
  mappings: Record<string, string>; // Simple clé-valeur
  lastSync?: Date;
  nextSync?: Date;
  itemsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ========== CONVERSIONS VERS UnifiedSource ==========

/**
 * Convertit SourceConfig → UnifiedSource
 *
 * Utilisé pour migrer backend (SourceManager, IndexedDBSourceStorage, etc.)
 * vers le nouveau type unifié.
 *
 * **Transformations:**
 * - Copie champs communs (id, name, connectorType, status, etc.)
 * - syncInterval: `number | undefined` → `number | null`
 * - lastSyncAt: `Date | undefined` → `Date | null`
 * - fieldMappings: conservés tels quels (déjà bon format)
 * - nextSyncAt: calculé depuis lastSyncAt + syncInterval
 * - itemsCount: initialisé à 0 (calculé depuis DB ensuite)
 * - createdBy: 'unknown' (migration legacy)
 * - schemaVersion: 1
 * - checksum: généré
 *
 * @param config - SourceConfig à convertir
 * @returns UnifiedSource équivalent
 *
 * @example
 * ```typescript
 * const legacy: SourceConfig = {
 *   id: '123',
 *   name: 'My Office365',
 *   connectorType: 'office365-mail',
 *   status: 'active',
 *   config: { apiUrl: '...' },
 *   autoSync: true,
 *   syncInterval: 15,
 *   fieldMappings: [...],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   lastSyncAt: new Date(),
 * };
 *
 * const unified = sourceConfigToUnified(legacy);
 * // Type UnifiedSource avec tous les champs
 * ```
 *
 * @deprecated Utiliser UnifiedSource directement dans nouveau code
 */
export function sourceConfigToUnified(config: SourceConfig): UnifiedSource {
  // Calculer nextSyncAt
  const nextSyncAt = calculateNextSync(
    config.lastSyncAt,
    config.syncInterval,
    config.status,
    config.autoSync
  );

  const unified: UnifiedSource = {
    // ===== IDENTITÉ =====
    id: config.id,
    name: config.name,
    connectorType: config.connectorType,
    status: config.status,

    // ===== CONFIGURATION =====
    config: config.config,
    fieldMappings: config.fieldMappings,

    // ===== SYNCHRONISATION =====
    autoSync: config.autoSync,
    syncInterval: config.syncInterval ?? null,
    lastSyncAt: config.lastSyncAt ?? null,
    nextSyncAt,
    lastSyncError: config.lastSyncError ?? null,
    syncHistoryIds: [], // À remplir depuis DB si nécessaire

    // ===== STATISTIQUES =====
    // itemsCount doit être calculé depuis DB après conversion
    itemsCount: 0,
    totalSize: 0,
    lastSyncDuration: null,

    // ===== MÉTADONNÉES =====
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    createdBy: 'unknown', // Migration legacy - pas d'info user
    metadata: config.metadata ?? {},

    // ===== SÉCURITÉ & AUDIT =====
    schemaVersion: 1,
    checksum: generateChecksum(config),
  };

  return unified;
}

/**
 * Convertit DataSource → UnifiedSource
 *
 * Utilisé pour migrer UI components vers le nouveau type unifié.
 *
 * **Transformations:**
 * - Copie champs communs (id, name, connectorType, status, etc.)
 * - mappings: `Record<string, string>` → `FieldMapping[]`
 * - lastSync: `Date | undefined` → lastSyncAt: `Date | null`
 * - nextSync: `Date | undefined` → nextSyncAt: `Date | null`
 * - itemsCount: conservé
 * - autoSync: `false` (DataSource n'a pas cette info)
 * - syncInterval: `null`
 * - createdBy: 'unknown'
 * - schemaVersion: 1
 * - checksum: généré
 *
 * @param dataSource - DataSource à convertir
 * @returns UnifiedSource équivalent
 *
 * @example
 * ```typescript
 * const uiSource: DataSource = {
 *   id: '456',
 *   name: 'My Gmail',
 *   connectorType: 'gmail',
 *   status: 'active',
 *   config: {},
 *   mappings: {
 *     'from.emailAddress': 'author',
 *     'subject': 'title'
 *   },
 *   itemsCount: 1547,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 *
 * const unified = dataSourceToUnified(uiSource);
 * // fieldMappings: [
 * //   { id: 'mapping-0', sourceField: 'from.emailAddress', targetField: 'author', ... },
 * //   { id: 'mapping-1', sourceField: 'subject', targetField: 'title', ... }
 * // ]
 * ```
 *
 * @deprecated Utiliser UnifiedSource directement dans nouveau code
 */
export function dataSourceToUnified(dataSource: DataSource): UnifiedSource {
  const unified: UnifiedSource = {
    // ===== IDENTITÉ =====
    id: dataSource.id,
    name: dataSource.name,
    connectorType: dataSource.connectorType,
    status: dataSource.status,

    // ===== CONFIGURATION =====
    config: dataSource.config,
    // Convertir mappings simples → FieldMappings
    fieldMappings: convertMappingsToFieldMappings(dataSource.mappings),

    // ===== SYNCHRONISATION =====
    // DataSource n'a pas ces infos, utiliser defaults
    autoSync: false,
    syncInterval: null,
    lastSyncAt: dataSource.lastSync ?? null,
    nextSyncAt: dataSource.nextSync ?? null,
    lastSyncError: null,
    syncHistoryIds: [],

    // ===== STATISTIQUES =====
    itemsCount: dataSource.itemsCount,
    totalSize: 0, // DataSource n'a pas cette info
    lastSyncDuration: null,

    // ===== MÉTADONNÉES =====
    createdAt: dataSource.createdAt,
    updatedAt: dataSource.updatedAt,
    createdBy: 'unknown', // DataSource n'a pas cette info
    metadata: {},

    // ===== SÉCURITÉ & AUDIT =====
    schemaVersion: 1,
    checksum: generateChecksum(dataSource),
  };

  return unified;
}

// ========== CONVERSIONS DEPUIS UnifiedSource (REVERSE) ==========

/**
 * Convertit UnifiedSource → SourceConfig
 *
 * Conversion reverse pour compatibilité avec code legacy backend.
 *
 * **Transformations:**
 * - Copie champs communs
 * - syncInterval: `number | null` → `number | undefined`
 * - lastSyncAt: `Date | null` → `Date | undefined`
 * - fieldMappings: conservés
 * - Ignore: nextSyncAt, itemsCount, totalSize, etc. (pas dans SourceConfig)
 *
 * @param unified - UnifiedSource à convertir
 * @returns SourceConfig équivalent
 *
 * @example
 * ```typescript
 * const unified: UnifiedSource = { ... };
 * const legacy = unifiedToSourceConfig(unified);
 * // Type SourceConfig compatible avec code existant
 * ```
 *
 * @deprecated À supprimer après migration complète
 */
export function unifiedToSourceConfig(unified: UnifiedSource): SourceConfig {
  const config: SourceConfig = {
    id: unified.id,
    name: unified.name,
    connectorType: unified.connectorType,
    config: unified.config,
    status: unified.status,
    createdAt: unified.createdAt,
    updatedAt: unified.updatedAt,
    lastSyncAt: unified.lastSyncAt ?? undefined,
    lastSyncError: unified.lastSyncError ?? undefined,
    autoSync: unified.autoSync,
    syncInterval: unified.syncInterval ?? undefined,
    fieldMappings: unified.fieldMappings,
    metadata: unified.metadata,
  };

  return config;
}

/**
 * Convertit UnifiedSource → DataSource
 *
 * Conversion reverse pour compatibilité avec code legacy UI.
 *
 * **Transformations:**
 * - Copie champs communs
 * - fieldMappings: `FieldMapping[]` → mappings: `Record<string, string>`
 * - lastSyncAt: `Date | null` → lastSync: `Date | undefined`
 * - nextSyncAt: `Date | null` → nextSync: `Date | undefined`
 * - itemsCount: conservé
 * - Ignore: autoSync, syncInterval, etc. (pas dans DataSource)
 *
 * @param unified - UnifiedSource à convertir
 * @returns DataSource équivalent
 *
 * @example
 * ```typescript
 * const unified: UnifiedSource = { ... };
 * const uiSource = unifiedToDataSource(unified);
 * // Type DataSource compatible avec composants UI existants
 * ```
 *
 * @deprecated À supprimer après migration complète
 */
export function unifiedToDataSource(unified: UnifiedSource): DataSource {
  const dataSource: DataSource = {
    id: unified.id,
    name: unified.name,
    connectorType: unified.connectorType,
    status: unified.status,
    config: unified.config,
    // Convertir FieldMappings → mappings simples
    mappings: convertFieldMappingsToMappings(unified.fieldMappings),
    lastSync: unified.lastSyncAt ?? undefined,
    nextSync: unified.nextSyncAt ?? undefined,
    itemsCount: unified.itemsCount,
    createdAt: unified.createdAt,
    updatedAt: unified.updatedAt,
  };

  return dataSource;
}

// ========== HELPERS ==========

/**
 * Convertit mappings simples → FieldMappings
 *
 * Transforme `Record<string, string>` en `FieldMapping[]` complet.
 *
 * **Transformations:**
 * - Chaque clé/valeur devient un FieldMapping
 * - id: `mapping-{index}`
 * - transform: `'none'` (pas de transformation)
 * - required: `false` (par défaut optionnel)
 * - defaultValue: `undefined`
 * - validation: `undefined`
 *
 * @param mappings - Mappings simples (ex: `{ 'from.email': 'author' }`)
 * @returns Array de FieldMappings
 *
 * @example
 * ```typescript
 * const simple = {
 *   'from.emailAddress.address': 'metadata.author',
 *   'subject': 'title',
 *   'receivedDateTime': 'timestamp'
 * };
 *
 * const fieldMappings = convertMappingsToFieldMappings(simple);
 * // [
 * //   { id: 'mapping-0', sourceField: 'from.emailAddress.address', targetField: 'metadata.author', transform: 'none', required: false },
 * //   { id: 'mapping-1', sourceField: 'subject', targetField: 'title', transform: 'none', required: false },
 * //   { id: 'mapping-2', sourceField: 'receivedDateTime', targetField: 'timestamp', transform: 'none', required: false }
 * // ]
 * ```
 */
export function convertMappingsToFieldMappings(
  mappings: Record<string, string>
): FieldMapping[] {
  return Object.entries(mappings).map(([sourceField, targetField], index) => ({
    id: `mapping-${index}`,
    sourceField,
    targetField,
    transform: 'none' as const,
    transformParams: undefined,
    defaultValue: undefined,
    required: false,
    validation: undefined,
  }));
}

/**
 * Convertit FieldMappings → mappings simples (reverse)
 *
 * Transforme `FieldMapping[]` en `Record<string, string>`.
 *
 * **ATTENTION - Perte d'information:**
 * - Les transformations sont perdues !
 * - Les validations sont perdues !
 * - Les defaultValues sont perdus !
 * - Seuls sourceField → targetField sont conservés
 *
 * Cette fonction est uniquement pour backward compatibility temporaire.
 *
 * @param fieldMappings - Array de FieldMappings
 * @returns Mappings simples
 *
 * @example
 * ```typescript
 * const fieldMappings: FieldMapping[] = [
 *   { id: '1', sourceField: 'email', targetField: 'author', transform: 'lowercase', required: true },
 *   { id: '2', sourceField: 'subject', targetField: 'title', transform: 'none', required: true }
 * ];
 *
 * const simple = convertFieldMappingsToMappings(fieldMappings);
 * // { 'email': 'author', 'subject': 'title' }
 * // ⚠️ Transformations perdues !
 * ```
 */
export function convertFieldMappingsToMappings(
  fieldMappings: FieldMapping[]
): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const mapping of fieldMappings) {
    mappings[mapping.sourceField] = mapping.targetField;
  }

  return mappings;
}

/**
 * Calcule nextSyncAt depuis lastSyncAt + syncInterval
 *
 * **Logique:**
 * - Si autoSync = false → `null`
 * - Si status = 'paused' → `null`
 * - Si lastSyncAt = null → `null`
 * - Si syncInterval = null → `null`
 * - Sinon: `lastSyncAt + syncInterval (minutes)`
 *
 * @param lastSyncAt - Dernière sync (ou undefined)
 * @param syncInterval - Intervalle en minutes (ou undefined/null)
 * @param status - Statut source
 * @param autoSync - Auto-sync activé ?
 * @returns Date de prochaine sync ou null
 *
 * @example
 * ```typescript
 * const lastSync = new Date('2025-01-20T10:00:00Z');
 * const interval = 15; // 15 minutes
 * const nextSync = calculateNextSync(lastSync, interval, 'active', true);
 * // new Date('2025-01-20T10:15:00Z')
 *
 * const noSync = calculateNextSync(lastSync, interval, 'paused', true);
 * // null (source en pause)
 * ```
 */
export function calculateNextSync(
  lastSyncAt: Date | undefined,
  syncInterval: number | undefined,
  status: SourceStatus,
  autoSync: boolean
): Date | null {
  // Conditions pour ne PAS calculer nextSync
  if (!autoSync) return null;
  if (status === 'paused') return null;
  if (!lastSyncAt) return null;
  if (!syncInterval) return null;

  // Calculer nextSyncAt = lastSyncAt + syncInterval (minutes)
  const nextSyncMs = lastSyncAt.getTime() + syncInterval * 60 * 1000;
  return new Date(nextSyncMs);
}

/**
 * Génère checksum SHA-256 pour vérification intégrité
 *
 * Calcule hash sur les champs critiques pour détecter corruption/altération.
 *
 * **Champs inclus dans hash:**
 * - id
 * - name
 * - connectorType
 * - config (JSON.stringify)
 * - fieldMappings (JSON.stringify) OU mappings (selon type)
 *
 * **Utilisation:**
 * - Détection corruption de données
 * - Validation migration (checksum avant = checksum après)
 * - Audit trail
 *
 * @param source - SourceConfig ou DataSource
 * @returns Hash SHA-256 (hex)
 *
 * @example
 * ```typescript
 * const source: SourceConfig = { ... };
 * const checksum = generateChecksum(source);
 * // "a7f3b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3a6"
 *
 * // Vérifier intégrité après migration
 * const unified = sourceConfigToUnified(source);
 * const checksumAfter = generateChecksum(source);
 * assert(checksum === checksumAfter); // Aucune perte de données
 * ```
 */
export function generateChecksum(source: SourceConfig | DataSource): string {
  // Données à hasher (ordre déterministe)
  const data = {
    id: source.id,
    name: source.name,
    connectorType: source.connectorType,
    config: source.config,
    // SourceConfig a fieldMappings, DataSource a mappings
    fields:
      'fieldMappings' in source
        ? source.fieldMappings
        : 'mappings' in source
          ? source.mappings
          : {},
  };

  // JSON.stringify avec ordre des clés stable
  const json = JSON.stringify(data, Object.keys(data).sort());

  // Hash SHA-256
  const hash = crypto.createHash('sha256');
  hash.update(json);
  return hash.digest('hex');
}

// ========== DEPRECATION WARNINGS ==========

/**
 * Log deprecation warning en dev mode
 *
 * Affiche warning console pour informer développeurs d'utiliser UnifiedSource.
 *
 * @param oldType - Type legacy utilisé ('SourceConfig' ou 'DataSource')
 * @param location - Fichier/fonction où le warning apparaît
 *
 * @example
 * ```typescript
 * function myLegacyFunction(config: SourceConfig) {
 *   logDeprecationWarning('SourceConfig', 'myLegacyFunction');
 *   // ...
 * }
 * ```
 */
export function logDeprecationWarning(
  oldType: 'SourceConfig' | 'DataSource',
  location: string
): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[DEPRECATED] ${oldType} est déprécié et sera supprimé en Q3 2025.\n` +
        `Utilisez UnifiedSource à la place.\n` +
        `Location: ${location}\n` +
        `Migration guide: docs/guides/MIGRATION_UNIFIED_SOURCE.md`
    );
  }
}
