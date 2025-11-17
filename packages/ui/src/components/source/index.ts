/**
 * Source Management Components - Gestion des sources de données
 *
 * @module components/source
 */

// Types partagés
export type { ConnectorType, SourceStatus, DataSource } from './SourceList';
export type { FieldMapping } from './SourceMappingEditor';
export type { SyncStatus } from './SourceSyncStatus';
export type { SyncHistoryEntry } from './SourceSyncHistory';
export type { TestConnectionResult } from './SourceTestConnection';

// SourceList - Liste des sources configurées
export { SourceList } from './SourceList';
export type { SourceListProps } from './SourceList';

// SourceDetail - Vue détaillée d'une source
export { SourceDetail } from './SourceDetail';
export type { SourceDetailProps } from './SourceDetail';

// SourceConfigForm - Formulaire de configuration
export { SourceConfigForm } from './SourceConfigForm';
export type { SourceConfigFormProps, ConfigField } from './SourceConfigForm';

// SourceMappingEditor - Éditeur de field mappings
export { SourceMappingEditor } from './SourceMappingEditor';
export type { SourceMappingEditorProps } from './SourceMappingEditor';

// SourceSyncStatus - Statut de sync en temps réel
export { SourceSyncStatus } from './SourceSyncStatus';
export type { SourceSyncStatusProps } from './SourceSyncStatus';

// SourceSyncHistory - Historique des synchronisations
export { SourceSyncHistory } from './SourceSyncHistory';
export type { SourceSyncHistoryProps } from './SourceSyncHistory';

// SourceTestConnection - Test de connexion
export { SourceTestConnection } from './SourceTestConnection';
export type { SourceTestConnectionProps } from './SourceTestConnection';
