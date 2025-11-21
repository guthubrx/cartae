/**
 * Storage - Module de stockage hybride pour sources
 *
 * Exports:
 * - HybridStorage: Service principal (cache IndexedDB + PostgreSQL)
 * - SourcesAPIClient: Client HTTP pour backend
 */

export { HybridStorage } from './HybridStorage';
export type { HybridStorageConfig } from './HybridStorage';

export { SourcesAPIClient } from './SourcesAPIClient';
export type {
  SourcesAPIClientConfig,
  APIResponse,
  SyncQueueItem,
} from './SourcesAPIClient';
