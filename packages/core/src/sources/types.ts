/**
 * Types pour le système de sources de données
 *
 * Définit les types partagés pour la gestion des sources externes
 * (Office365, Gmail, Slack, GitHub, etc.)
 */

/**
 * Type de connecteur supporté
 */
export type ConnectorType =
  | 'office365-mail'
  | 'office365-calendar'
  | 'office365-onedrive'
  | 'gmail'
  | 'google-drive'
  | 'slack'
  | 'github'
  | 'custom';

/**
 * Statut d'une source de données
 */
export type SourceStatus =
  | 'active'        // Source active et synchronisée
  | 'paused'        // Source en pause (désactivée temporairement)
  | 'error'         // Erreur de connexion/sync
  | 'configuring';  // En cours de configuration initiale

/**
 * Statut de synchronisation
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Configuration d'une source de données
 *
 * @deprecated Utiliser UnifiedSource à la place (packages/core/src/sources/types/UnifiedSource.ts)
 * @see UnifiedSource
 *
 * Migration:
 * ```typescript
 * // Avant (déprécié)
 * import { SourceConfig } from '@cartae/core/sources';
 * const source: SourceConfig = { ... };
 *
 * // Après (recommandé)
 * import { UnifiedSource } from '@cartae/core/sources/types';
 * const source: UnifiedSource = { ... };
 *
 * // OU utiliser adapter temporaire
 * import { sourceConfigToUnified } from '@cartae/core/sources/adapters/LegacyAdapters';
 * const unified = sourceConfigToUnified(legacySource);
 * ```
 *
 * Ce type sera supprimé en Q3 2025 après migration complète.
 */
export interface SourceConfig {
  /** ID unique de la source */
  id: string;

  /** Nom donné par l'utilisateur */
  name: string;

  /** Type de connecteur */
  connectorType: ConnectorType;

  /** Configuration spécifique au connecteur (credentials, endpoints, etc.) */
  config: Record<string, any>;

  /** Statut actuel de la source */
  status: SourceStatus;

  /** Date de création */
  createdAt: Date;

  /** Date de dernière modification */
  updatedAt: Date;

  /** Date de dernière synchronisation réussie */
  lastSyncAt?: Date;

  /** Erreur de dernière synchronisation (si échec) */
  lastSyncError?: string;

  /** Activer la synchronisation automatique */
  autoSync: boolean;

  /** Intervalle de synchronisation automatique (en minutes) */
  syncInterval?: number;

  /** Field mappings (transformation données source → CartaeItem) */
  fieldMappings: FieldMapping[];

  /** Metadata additionnelles */
  metadata?: Record<string, any>;
}

/**
 * Field mapping - Association champ source → champ CartaeItem
 *
 * @deprecated Utiliser FieldMapping de UnifiedSource.ts (plus complet avec transformParams et validation)
 * @see FieldMapping (packages/core/src/sources/types/UnifiedSource.ts)
 *
 * Migration:
 * ```typescript
 * // Avant (déprécié)
 * import { FieldMapping } from '@cartae/core/sources';
 *
 * // Après (recommandé)
 * import { FieldMapping } from '@cartae/core/sources/types';
 * // La nouvelle version inclut:
 * // - transformParams (pour transformations complexes)
 * // - validation (regex, min/max, enum)
 * // - Documentation TypeDoc exhaustive
 * ```
 *
 * Ce type sera supprimé en Q3 2025 après migration complète.
 */
export interface FieldMapping {
  /** ID unique du mapping */
  id: string;

  /** Chemin du champ dans la source (ex: "from.emailAddress.address") */
  sourceField: string;

  /** Champ cible dans CartaeItem (ex: "metadata.author") */
  targetField: string;

  /** Transformation à appliquer (optionnel) */
  transform?: TransformType;

  /** Valeur par défaut si champ source manquant */
  defaultValue?: any;

  /** Requis ou optionnel */
  required?: boolean;
}

/**
 * Type de transformation de données
 *
 * @deprecated Utiliser TransformType de UnifiedSource.ts (20+ transformations au lieu de 12)
 * @see TransformType (packages/core/src/sources/types/UnifiedSource.ts)
 *
 * Migration:
 * ```typescript
 * // Avant (déprécié - 12 transformations)
 * import { TransformType } from '@cartae/core/sources';
 *
 * // Après (recommandé - 20+ transformations)
 * import { TransformType } from '@cartae/core/sources/types';
 * // Nouvelles transformations disponibles:
 * // - capitalize, slug (string)
 * // - first, last (array)
 * // - date-iso, date-unix, date-format (date)
 * // - extract-email, extract-urls (avancé)
 * // - markdown-to-text, html-to-text (avancé)
 * ```
 *
 * Ce type sera supprimé en Q3 2025 après migration complète.
 */
export type TransformType =
  | 'none'
  | 'date'          // String → Date
  | 'array'         // String → Array
  | 'string'        // Any → String
  | 'number'        // String → Number
  | 'boolean'       // Any → Boolean
  | 'json'          // String JSON → Object
  | 'uppercase'     // String → UPPERCASE
  | 'lowercase'     // String → lowercase
  | 'trim'          // String → trimmed
  | 'split'         // String → Array (split by delimiter)
  | 'join'          // Array → String (join with delimiter)
  | 'custom';       // Fonction custom

/**
 * Résultat d'un test de connexion
 */
export interface TestConnectionResult {
  /** Test réussi ou échoué */
  success: boolean;

  /** Message de résultat */
  message: string;

  /** Détails additionnels */
  details?: {
    endpoint?: string;
    auth?: 'ok' | 'failed';
    permissions?: string[];
    sampleData?: any;
    latency?: number;
  };

  /** Liste des erreurs (si échec) */
  errors?: string[];
}

/**
 * Résultat d'une synchronisation
 */
export interface SyncResult {
  /** Sync réussie ou échouée */
  success: boolean;

  /** ID de la source */
  sourceId: string;

  /** Timestamp de début */
  startedAt: Date;

  /** Timestamp de fin */
  finishedAt: Date;

  /** Nombre d'items traités */
  itemsProcessed: number;

  /** Nombre d'items importés avec succès */
  itemsSuccess: number;

  /** Nombre d'items en erreur */
  itemsError: number;

  /** Durée totale (ms) */
  duration: number;

  /** Message d'erreur (si échec global) */
  error?: string;

  /** Détails des erreurs par item */
  itemErrors?: Array<{ itemId: string; error: string }>;
}

/**
 * Historique de synchronisation
 */
export interface SyncHistoryEntry {
  /** ID unique de l'entrée d'historique */
  id: string;

  /** ID de la source */
  sourceId: string;

  /** Timestamp de début */
  startedAt: Date;

  /** Timestamp de fin */
  finishedAt: Date;

  /** Statut du sync */
  status: 'success' | 'error' | 'cancelled';

  /** Nombre d'items traités */
  itemsProcessed: number;

  /** Nombre d'items réussis */
  itemsSuccess: number;

  /** Nombre d'items en erreur */
  itemsError: number;

  /** Durée (ms) */
  duration: number;

  /** Message d'erreur (si échec) */
  error?: string;
}

/**
 * Options pour la synchronisation
 */
export interface SyncOptions {
  /** Force la synchronisation même si récente */
  force?: boolean;

  /** Limite le nombre d'items à synchroniser */
  limit?: number;

  /** Synchronise uniquement les items depuis cette date */
  since?: Date;

  /** Callback de progression */
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * Progression de synchronisation
 */
export interface SyncProgress {
  /** Nombre d'items traités */
  processed: number;

  /** Nombre total d'items (estimation) */
  total: number;

  /** Pourcentage (0-100) */
  percentage: number;

  /** Vitesse (items/sec) */
  rate: number;

  /** Temps restant estimé (ms) */
  eta: number;

  /** Item en cours de traitement */
  currentItem?: string;
}

/**
 * Événements émis par SourceManager
 */
export interface SourceManagerEvents {
  'source:created': SourceConfig;
  'source:updated': SourceConfig;
  'source:deleted': string; // sourceId
  'source:sync:started': { sourceId: string };
  'source:sync:progress': { sourceId: string; progress: SyncProgress };
  'source:sync:completed': SyncResult;
  'source:sync:failed': { sourceId: string; error: string };
  'source:status:changed': { sourceId: string; status: SourceStatus };
}
