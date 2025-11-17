/**
 * EventTypes - Types d'événements standards pour Cartae
 *
 * Définit tous les événements émis par le core et les plugins.
 * Utilise un naming pattern : "cartae:domain:action"
 *
 * @module events/EventTypes
 */
import type { CartaeItem } from '../types';
/**
 * Source d'un événement
 */
export type EventSource = 'core' | 'user' | 'plugin' | 'storage' | 'sync' | 'ai';
/**
 * Base Event - Tous les événements héritent de cette interface
 */
export interface BaseEvent {
    /** Type de l'événement (ex: "cartae:item:created") */
    type: string;
    /** Timestamp de l'événement */
    timestamp: Date;
    /** Source de l'événement */
    source: EventSource;
    /** ID de corrélation (pour tracer causality) */
    correlationId?: string;
    /** Métadonnées additionnelles */
    metadata?: Record<string, unknown>;
}
/**
 * Event: Un CartaeItem a été créé
 */
export interface CartaeItemCreatedEvent extends BaseEvent {
    type: 'cartae:item:created';
    item: CartaeItem;
    /** Connector source (ex: "office365", "gmail") */
    connector?: string;
}
/**
 * Event: Un CartaeItem a été mis à jour
 */
export interface CartaeItemUpdatedEvent extends BaseEvent {
    type: 'cartae:item:updated';
    item: CartaeItem;
    /** Changements appliqués */
    changes: Partial<CartaeItem>;
    /** Champs modifiés */
    modifiedFields: string[];
}
/**
 * Event: Un CartaeItem a été supprimé
 */
export interface CartaeItemDeletedEvent extends BaseEvent {
    type: 'cartae:item:deleted';
    itemId: string;
    /** Item supprimé (si disponible) */
    item?: CartaeItem;
}
/**
 * Event: Plusieurs CartaeItems créés en bulk
 */
export interface CartaeItemsBulkCreatedEvent extends BaseEvent {
    type: 'cartae:items:bulk:created';
    items: CartaeItem[];
    count: number;
    connector?: string;
}
/**
 * Event: Plusieurs CartaeItems supprimés en bulk
 */
export interface CartaeItemsBulkDeletedEvent extends BaseEvent {
    type: 'cartae:items:bulk:deleted';
    itemIds: string[];
    count: number;
}
/**
 * Event: Storage initialisé
 */
export interface StorageInitializedEvent extends BaseEvent {
    type: 'cartae:storage:initialized';
    version: number;
    itemCount: number;
}
/**
 * Event: Synchronisation storage complétée
 */
export interface StorageSyncedEvent extends BaseEvent {
    type: 'cartae:storage:synced';
    itemsSynced: number;
    duration: number;
}
/**
 * Event: Storage vidé
 */
export interface StorageClearedEvent extends BaseEvent {
    type: 'cartae:storage:cleared';
    itemsDeleted: number;
}
/**
 * Event: Migration schema effectuée
 */
export interface StorageMigratedEvent extends BaseEvent {
    type: 'cartae:storage:migrated';
    fromVersion: number;
    toVersion: number;
    duration: number;
}
/**
 * Event: Erreur storage
 */
export interface StorageErrorEvent extends BaseEvent {
    type: 'cartae:storage:error';
    error: Error;
    operation: 'create' | 'read' | 'update' | 'delete' | 'migrate';
}
/**
 * Event: Plugin chargé
 */
export interface PluginLoadedEvent extends BaseEvent {
    type: 'cartae:plugin:loaded';
    pluginId: string;
    pluginName: string;
    pluginType: 'data' | 'viz' | 'ai' | 'transform' | 'action' | 'workflow';
    version: string;
}
/**
 * Event: Plugin déchargé
 */
export interface PluginUnloadedEvent extends BaseEvent {
    type: 'cartae:plugin:unloaded';
    pluginId: string;
    reason?: string;
}
/**
 * Event: Erreur plugin
 */
export interface PluginErrorEvent extends BaseEvent {
    type: 'cartae:plugin:error';
    pluginId: string;
    error: Error;
    phase: 'load' | 'execute' | 'unload';
}
/**
 * Event: Item indexé pour recherche
 */
export interface SearchIndexedEvent extends BaseEvent {
    type: 'cartae:search:indexed';
    itemId: string;
    fieldsIndexed: string[];
}
/**
 * Event: Index de recherche reconstruit
 */
export interface SearchReindexedEvent extends BaseEvent {
    type: 'cartae:search:reindexed';
    itemsIndexed: number;
    duration: number;
}
/**
 * Event: Analyse AI complétée
 */
export interface AIAnalysisCompletedEvent extends BaseEvent {
    type: 'cartae:ai:analysis:completed';
    itemId: string;
    analysisType: 'sentiment' | 'priority' | 'connections' | 'entities' | 'topics';
    confidence: number;
    duration: number;
}
/**
 * Event: Connexion détectée par AI
 */
export interface AIConnectionDetectedEvent extends BaseEvent {
    type: 'cartae:ai:connection:detected';
    sourceItemId: string;
    targetItemId: string;
    strength: number;
    confidence: number;
    reason: string;
}
/**
 * Event: Item sélectionné dans UI
 */
export interface UIItemSelectedEvent extends BaseEvent {
    type: 'cartae:ui:item:selected';
    itemId: string;
    viewType: 'mindmap' | 'kanban' | 'table' | 'timeline' | 'graph';
}
/**
 * Event: Vue changée
 */
export interface UIViewChangedEvent extends BaseEvent {
    type: 'cartae:ui:view:changed';
    fromView: string;
    toView: string;
}
/**
 * Tous les types d'événements CartaeItem
 */
export type CartaeItemEvent = CartaeItemCreatedEvent | CartaeItemUpdatedEvent | CartaeItemDeletedEvent | CartaeItemsBulkCreatedEvent | CartaeItemsBulkDeletedEvent;
/**
 * Tous les types d'événements Storage
 */
export type StorageEvent = StorageInitializedEvent | StorageSyncedEvent | StorageClearedEvent | StorageMigratedEvent | StorageErrorEvent;
/**
 * Tous les types d'événements Plugin
 */
export type PluginEvent = PluginLoadedEvent | PluginUnloadedEvent | PluginErrorEvent;
/**
 * Tous les types d'événements Search
 */
export type SearchEvent = SearchIndexedEvent | SearchReindexedEvent;
/**
 * Tous les types d'événements AI
 */
export type AIEvent = AIAnalysisCompletedEvent | AIConnectionDetectedEvent;
/**
 * Tous les types d'événements UI
 */
export type UIEvent = UIItemSelectedEvent | UIViewChangedEvent;
/**
 * Union de TOUS les événements Cartae
 */
export type CartaeEvent = CartaeItemEvent | StorageEvent | PluginEvent | SearchEvent | AIEvent | UIEvent;
/**
 * Map type → event data
 * Permet de faire event.on<CartaeEventMap['cartae:item:created']>(...)
 */
export interface CartaeEventMap {
    'cartae:item:created': CartaeItemCreatedEvent;
    'cartae:item:updated': CartaeItemUpdatedEvent;
    'cartae:item:deleted': CartaeItemDeletedEvent;
    'cartae:items:bulk:created': CartaeItemsBulkCreatedEvent;
    'cartae:items:bulk:deleted': CartaeItemsBulkDeletedEvent;
    'cartae:storage:initialized': StorageInitializedEvent;
    'cartae:storage:synced': StorageSyncedEvent;
    'cartae:storage:cleared': StorageClearedEvent;
    'cartae:storage:migrated': StorageMigratedEvent;
    'cartae:storage:error': StorageErrorEvent;
    'cartae:plugin:loaded': PluginLoadedEvent;
    'cartae:plugin:unloaded': PluginUnloadedEvent;
    'cartae:plugin:error': PluginErrorEvent;
    'cartae:search:indexed': SearchIndexedEvent;
    'cartae:search:reindexed': SearchReindexedEvent;
    'cartae:ai:analysis:completed': AIAnalysisCompletedEvent;
    'cartae:ai:connection:detected': AIConnectionDetectedEvent;
    'cartae:ui:item:selected': UIItemSelectedEvent;
    'cartae:ui:view:changed': UIViewChangedEvent;
}
/**
 * Extract event type string from event data
 */
export type EventType<T extends CartaeEvent> = T['type'];
//# sourceMappingURL=EventTypes.d.ts.map