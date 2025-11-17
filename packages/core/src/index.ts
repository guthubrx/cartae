/**
 * @cartae/core
 *
 * Format universel CartaeItem et fonctions utilitaires
 * pour l'écosystème Cartae.
 *
 * Ce package fournit:
 * - Interfaces TypeScript pour CartaeItem (format universel)
 * - Schémas Zod pour validation runtime
 * - Factory functions pour créer des items facilement
 * - EventBus pour communication pub/sub
 * - Storage (IndexedDB) pour persistence locale
 *
 * @packageDocumentation
 */

// Types
export * from './types';

// Schemas Zod
export * from './schemas';

// Factories
export * from './factories';

// Events
export * from './events';

// Storage
export * from './storage';

// Sources (gestion des sources de données externes)
export * from './sources';

// Version
export const VERSION = '0.1.0';
