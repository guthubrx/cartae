/**
 * Types unifiés pour le système de sources de données
 *
 * @packageDocumentation
 * @module sources/types
 * @version 1.0.0
 * @since Session 128
 */

// ========== TYPES UNIFIÉS (SESSION 128) ==========

export type {
  UnifiedSource,
  SourceConfigData,
  FieldMapping,
  TransformType,
  FieldValidation,
} from './UnifiedSource';

// ========== RE-EXPORTS DEPUIS types.ts (BACKWARD COMPATIBILITY) ==========

/**
 * @deprecated Utiliser UnifiedSource à la place
 * @see UnifiedSource
 *
 * Migration:
 * ```typescript
 * // Avant
 * import { SourceConfig } from '@cartae/core/sources';
 * const source: SourceConfig = { ... };
 *
 * // Après
 * import { UnifiedSource } from '@cartae/core/sources/types';
 * const source: UnifiedSource = { ... };
 * ```
 */
export type {
  SourceConfig,
  ConnectorType,
  SourceStatus,
  SyncStatus,
  TestConnectionResult,
  SyncResult,
  SyncHistoryEntry,
  SyncOptions,
  SyncProgress,
  SourceManagerEvents,
} from '../types';
