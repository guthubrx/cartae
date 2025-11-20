/**
 * UnifiedSource - Type unifié pour les sources de données
 *
 * Remplace SourceConfig (backend) et DataSource (UI) par une source de vérité unique
 *
 * @packageDocumentation
 * @module sources/types
 * @version 1.0.0
 * @since Session 128
 */

import type { ConnectorType, SourceStatus } from '../types';

/**
 * Source de données unifiée - Type unique pour toute l'application
 *
 * Ce type remplace:
 * - SourceConfig (packages/core) - Utilisé par backend/services
 * - DataSource (packages/ui) - Utilisé par composants UI
 *
 * Bénéfices:
 * - Source de vérité unique (zero conversion)
 * - Extensibilité facile (ajout champs)
 * - Tests exhaustifs (1 seul type)
 * - Backward compatibility via adapters
 *
 * @example
 * ```typescript
 * const source: UnifiedSource = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "Mon compte Office 365 Pro",
 *   connectorType: "office365-mail",
 *   status: "active",
 *   config: {
 *     apiUrl: "https://graph.microsoft.com/v1.0",
 *     userId: "user@company.com"
 *   },
 *   fieldMappings: [
 *     {
 *       id: "map-1",
 *       sourceField: "from.emailAddress.address",
 *       targetField: "metadata.author",
 *       transform: "lowercase",
 *       required: true
 *     }
 *   ],
 *   autoSync: true,
 *   syncInterval: 15,
 *   // ... autres champs
 * };
 * ```
 *
 * @see FieldMapping pour les transformations de champs
 * @see SourceConfigData pour la configuration spécifique au connecteur
 * @version 1.0.0
 * @since Session 128
 */
export interface UnifiedSource {
  // ========== IDENTITÉ ==========

  /**
   * ID unique (UUID v4)
   *
   * Identifiant unique de la source, utilisé pour toutes les références
   * dans la base de données et l'application.
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;

  /**
   * Nom de la source (éditable par l'utilisateur)
   *
   * Nom descriptif donné par l'utilisateur pour identifier facilement
   * cette source parmi toutes ses sources configurées.
   *
   * @example "Mon compte Office 365 Pro"
   * @example "Gmail Personnel"
   * @example "Slack Équipe Marketing"
   */
  name: string;

  /**
   * Type de connecteur
   *
   * Détermine quel connecteur sera utilisé pour synchroniser
   * les données de cette source.
   *
   * @see ConnectorType
   * @example "office365-mail"
   * @example "gmail"
   * @example "slack"
   */
  connectorType: ConnectorType;

  /**
   * Statut actuel de la source
   *
   * Indique l'état de fonctionnement de la source:
   * - `active`: Source active et synchronisée
   * - `paused`: Source en pause (désactivée temporairement par l'utilisateur)
   * - `error`: Erreur de connexion ou de synchronisation
   * - `configuring`: En cours de configuration initiale (pas encore prête)
   *
   * @see SourceStatus
   * @example "active"
   */
  status: SourceStatus;

  // ========== CONFIGURATION ==========

  /**
   * Configuration spécifique au connecteur
   *
   * Contient les paramètres de configuration propres à chaque type de connecteur.
   *
   * **IMPORTANT - Sécurité:**
   * - Ne JAMAIS stocker de credentials (tokens, secrets) ici côté client
   * - Les credentials sont stockés backend uniquement via Vault
   * - Ce champ contient uniquement des paramètres non-sensibles
   *
   * @see SourceConfigData
   * @example Office365: { apiUrl: "https://...", userId: "user@...", folder: "Inbox" }
   * @example Obsidian: { vaultPath: "/path/to/vault", parseWikiLinks: true }
   */
  config: SourceConfigData;

  /**
   * Mappings de champs avec transformations
   *
   * Définit comment mapper les champs de la source externe vers les champs
   * CartaeItem, avec transformations optionnelles (lowercase, date, etc.).
   *
   * Permet de transformer les données à la volée lors de la synchronisation:
   * - Champs source → champs cibles
   * - Transformations (uppercase, lowercase, date, array, etc.)
   * - Validations (required, pattern, min/max)
   * - Valeurs par défaut
   *
   * @see FieldMapping
   * @example
   * ```typescript
   * [
   *   {
   *     id: "map-1",
   *     sourceField: "from.emailAddress.address",
   *     targetField: "metadata.author",
   *     transform: "lowercase", // CEO@Company.com → ceo@company.com
   *     required: true
   *   },
   *   {
   *     id: "map-2",
   *     sourceField: "receivedDateTime",
   *     targetField: "timestamp",
   *     transform: "date", // String ISO → Date object
   *     required: true
   *   }
   * ]
   * ```
   */
  fieldMappings: FieldMapping[];

  // ========== SYNCHRONISATION ==========

  /**
   * Auto-synchronisation activée ?
   *
   * Si `true`, la source sera automatiquement synchronisée selon
   * l'intervalle défini dans `syncInterval`.
   *
   * @example true
   */
  autoSync: boolean;

  /**
   * Intervalle de synchronisation automatique (en minutes)
   *
   * Définit la fréquence de synchronisation automatique.
   *
   * - `null` = Auto-sync désactivé (synchronisation manuelle uniquement)
   * - Nombre = Intervalle en minutes entre chaque synchronisation
   *
   * @example 15 // Sync toutes les 15 minutes
   * @example 60 // Sync toutes les heures
   * @example null // Sync manuelle uniquement
   */
  syncInterval: number | null;

  /**
   * Date de dernière synchronisation réussie
   *
   * Timestamp de la dernière synchronisation complète et réussie.
   * `null` si aucune synchronisation n'a encore été effectuée.
   *
   * @example new Date("2025-01-20T10:30:00Z")
   * @example null
   */
  lastSyncAt: Date | null;

  /**
   * Date de prochaine synchronisation planifiée
   *
   * Timestamp calculé de la prochaine synchronisation automatique.
   *
   * Calculé avec: `lastSyncAt + syncInterval`
   *
   * `null` si:
   * - Auto-sync désactivé (`autoSync = false`)
   * - Aucune sync précédente (`lastSyncAt = null`)
   * - Source en pause (`status = 'paused'`)
   *
   * @example new Date("2025-01-20T10:45:00Z")
   * @example null
   */
  nextSyncAt: Date | null;

  /**
   * Dernière erreur de synchronisation
   *
   * Message d'erreur de la dernière synchronisation échouée.
   * `null` si dernière synchronisation réussie ou aucune sync.
   *
   * @example "Authentication failed: Invalid token"
   * @example "Network error: Timeout after 30s"
   * @example null
   */
  lastSyncError: string | null;

  /**
   * Historique de synchronisation (IDs seulement)
   *
   * Array des IDs d'historique de sync (table séparée pour détails complets).
   * Limité aux 100 dernières synchronisations pour performance.
   *
   * Les détails complets (items processés, erreurs, durée, etc.) sont
   * stockés dans une table `sync_history` séparée.
   *
   * @example ["sync-123", "sync-122", "sync-121"]
   */
  syncHistoryIds: string[];

  // ========== STATISTIQUES ==========

  /**
   * Nombre total d'items synchronisés
   *
   * Compteur total d'items CartaeItem créés depuis cette source.
   * Mis à jour après chaque synchronisation réussie.
   *
   * @example 1547 // 1547 emails/documents/messages importés
   */
  itemsCount: number;

  /**
   * Taille totale des données (en bytes)
   *
   * Taille cumulée de tous les items synchronisés depuis cette source.
   * Utilisé pour quotas et monitoring.
   *
   * @example 52428800 // 50 MB
   */
  totalSize: number;

  /**
   * Durée de la dernière synchronisation (en millisecondes)
   *
   * Performance de la dernière sync, utilisée pour monitoring et optimisation.
   * `null` si aucune sync effectuée.
   *
   * @example 4523 // 4.5 secondes
   * @example null
   */
  lastSyncDuration: number | null;

  // ========== MÉTADONNÉES ==========

  /**
   * Date de création de la source
   *
   * Timestamp de création de cette configuration de source.
   *
   * @example new Date("2025-01-15T08:00:00Z")
   */
  createdAt: Date;

  /**
   * Date de dernière modification
   *
   * Timestamp de dernière modification de la configuration.
   * Mis à jour à chaque changement (nom, mappings, config, etc.).
   *
   * @example new Date("2025-01-20T10:30:00Z")
   */
  updatedAt: Date;

  /**
   * Utilisateur qui a créé la source
   *
   * ID de l'utilisateur ayant créé cette source (pour multi-tenant).
   *
   * Dans contexte multi-utilisateur:
   * - Permet d'isoler les sources par utilisateur
   * - Utilisé pour permissions et quotas
   *
   * @example "user-abc-123"
   * @example "unknown" // Migration legacy
   */
  createdBy: string;

  /**
   * Métadonnées additionnelles (extensibilité)
   *
   * Permet de stocker des données custom sans modifier le schéma principal.
   *
   * Use cases:
   * - Tags personnalisés
   * - Couleur d'affichage UI
   * - Préférences utilisateur
   * - Données plugin custom
   *
   * @example { tags: ["work", "important"], color: "#ff0000", priority: "high" }
   */
  metadata: Record<string, any>;

  // ========== SÉCURITÉ & AUDIT ==========

  /**
   * Version du schéma (pour migrations)
   *
   * Permet de gérer les migrations de schéma lors d'évolutions futures.
   *
   * Incrémenté à chaque changement breaking du schéma:
   * - v1 = Schema initial (Session 128)
   * - v2 = Ajout champs futurs
   * - etc.
   *
   * @example 1
   */
  schemaVersion: number;

  /**
   * Hash de vérification d'intégrité
   *
   * Hash SHA-256 des données sensibles pour détecter corruption/altération.
   *
   * Calculé sur: id + name + connectorType + config + fieldMappings
   *
   * Permet de détecter:
   * - Corruption de données
   * - Modifications non-autorisées
   * - Bugs de migration
   *
   * @example "a7f3b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3a6"
   */
  checksum: string;
}

/**
 * Configuration spécifique au connecteur
 *
 * Contient les paramètres de configuration propres à chaque type de connecteur.
 *
 * **IMPORTANT - Sécurité:**
 * - JAMAIS de credentials (tokens, secrets, passwords) ici
 * - Credentials stockés backend uniquement via Vault
 * - Ce type contient uniquement des paramètres non-sensibles
 *
 * **Paramètres communs:**
 * - `apiUrl`: URL de l'API (si applicable)
 * - `userId`: ID utilisateur (référence backend)
 *
 * **Paramètres spécifiques par connecteur:**
 * - Office365: `{ tenantId, folder: "Inbox" }`
 * - Obsidian: `{ vaultPath, parseWikiLinks: true }`
 * - Gmail: `{ labelIds: ["INBOX", "STARRED"] }`
 * - Slack: `{ channelIds: ["C123", "C456"] }`
 *
 * @example Office365
 * ```typescript
 * {
 *   apiUrl: "https://graph.microsoft.com/v1.0",
 *   userId: "user@company.com",
 *   tenantId: "abc-123",
 *   folder: "Inbox"
 * }
 * ```
 *
 * @example Obsidian
 * ```typescript
 * {
 *   vaultPath: "/Users/me/Documents/MyVault",
 *   parseWikiLinks: true,
 *   includeFolders: ["Projects", "Notes"]
 * }
 * ```
 */
export interface SourceConfigData {
  /**
   * URL de l'API backend (si applicable)
   *
   * @example "https://graph.microsoft.com/v1.0"
   * @example "https://api.github.com"
   */
  apiUrl?: string;

  /**
   * ID utilisateur (référence backend)
   *
   * @example "user@company.com"
   * @example "user-abc-123"
   */
  userId?: string;

  /**
   * Paramètres spécifiques au connecteur
   *
   * Chaque connecteur peut ajouter ses propres paramètres:
   * - Office365: tenantId, folder, categories, etc.
   * - Obsidian: vaultPath, parseWikiLinks, includeFolders, etc.
   * - Gmail: labelIds, query, etc.
   * - Slack: channelIds, teamId, etc.
   */
  [key: string]: any;
}

/**
 * Mapping d'un champ source → CartaeItem
 *
 * Définit comment mapper un champ de la source externe vers un champ CartaeItem,
 * avec transformation optionnelle et validation.
 *
 * **Use cases réels:**
 *
 * 1. **Email → Author (lowercase):**
 * ```typescript
 * {
 *   sourceField: "from.emailAddress.address",
 *   targetField: "metadata.author",
 *   transform: "lowercase" // CEO@Company.com → ceo@company.com
 * }
 * ```
 *
 * 2. **Date ISO → Date object:**
 * ```typescript
 * {
 *   sourceField: "receivedDateTime",
 *   targetField: "timestamp",
 *   transform: "date" // "2025-01-20T10:30:00Z" → Date object
 * }
 * ```
 *
 * 3. **Categories array → Tags:**
 * ```typescript
 * {
 *   sourceField: "categories",
 *   targetField: "tags",
 *   transform: "array" // ["Work", "Important"] → ["Work", "Important"]
 * }
 * ```
 *
 * @see TransformType pour les transformations disponibles
 * @see FieldValidation pour la validation
 */
export interface FieldMapping {
  /**
   * ID unique du mapping
   *
   * Identifiant unique pour référencer ce mapping.
   *
   * @example "map-1"
   * @example "mapping-email-author"
   */
  id: string;

  /**
   * Chemin du champ dans la source (notation pointée)
   *
   * Notation pointée pour accéder aux champs imbriqués.
   * Supporte aussi les tableaux avec `[index]` ou `[*]` pour tous.
   *
   * @example "from.emailAddress.address" // Champ imbriqué
   * @example "body.content" // Champ simple
   * @example "categories[0]" // Premier élément array
   * @example "attachments[*].name" // Tous les noms attachments
   */
  sourceField: string;

  /**
   * Chemin du champ cible dans CartaeItem
   *
   * Notation pointée pour le champ destination dans CartaeItem.
   *
   * @example "metadata.author"
   * @example "content"
   * @example "tags"
   * @example "metadata.customFields.priority"
   */
  targetField: string;

  /**
   * Transformation à appliquer
   *
   * Type de transformation à appliquer au champ source avant
   * de l'assigner au champ cible.
   *
   * @see TransformType
   * @default "none"
   * @example "lowercase"
   * @example "date"
   * @example "uppercase"
   */
  transform: TransformType;

  /**
   * Paramètres de transformation (pour transformations complexes)
   *
   * Paramètres additionnels pour transformations nécessitant config:
   * - `split`: `{ separator: "," }`
   * - `join`: `{ separator: ", " }`
   * - `date-format`: `{ format: "YYYY-MM-DD" }`
   * - `custom`: `{ function: "(val) => val.toUpperCase()" }`
   *
   * @example { separator: "," } // Pour transform: "split"
   * @example { format: "YYYY-MM-DD" } // Pour transform: "date-format"
   */
  transformParams?: Record<string, any>;

  /**
   * Valeur par défaut si champ source null/undefined
   *
   * Valeur à utiliser si le champ source est absent ou null.
   * Utile pour champs optionnels avec fallback.
   *
   * @example "unknown@example.com" // Pour author
   * @example [] // Pour tags vide
   * @example new Date() // Pour timestamp actuel
   */
  defaultValue?: any;

  /**
   * Champ requis ? (erreur si absent)
   *
   * Si `true`, la synchronisation échouera si ce champ est absent
   * dans la source et qu'aucune `defaultValue` n'est définie.
   *
   * @example true // Champ obligatoire
   * @example false // Champ optionnel
   */
  required: boolean;

  /**
   * Validation du champ (optionnel)
   *
   * Règles de validation à appliquer après transformation.
   * Si validation échoue, utilise `defaultValue` ou rejette item.
   *
   * @see FieldValidation
   * @example { pattern: "^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$" } // Email regex
   * @example { min: 1, max: 100 } // String length 1-100
   */
  validation?: FieldValidation;
}

/**
 * Types de transformations supportées
 *
 * Transformations appliquées aux champs source avant mapping vers CartaeItem.
 *
 * **Catégories:**
 *
 * 1. **Conversions de types:** `string`, `number`, `boolean`, `date`, `array`, `json`
 * 2. **Transformations string:** `uppercase`, `lowercase`, `trim`, `capitalize`, `slug`
 * 3. **Transformations array:** `split`, `join`, `first`, `last`
 * 4. **Transformations date:** `date-iso`, `date-unix`, `date-format`
 * 5. **Transformations avancées:** `extract-email`, `extract-urls`, `markdown-to-text`, `html-to-text`
 * 6. **Custom:** `custom` (fonction TypeScript personnalisée)
 *
 * @example "lowercase" - Convertit string en minuscules
 * @example "date" - Parse string ISO en Date object
 * @example "split" - Divise string en array (params: separator)
 */
export type TransformType =
  // ========== AUCUNE TRANSFORMATION ==========

  /**
   * Aucune transformation - Valeur brute
   *
   * Copie la valeur telle quelle sans modification.
   *
   * @example "Hello World" → "Hello World"
   */
  | 'none'

  // ========== CONVERSIONS DE TYPES ==========

  /**
   * Conversion en string
   *
   * Convertit n'importe quelle valeur en string.
   *
   * @example 123 → "123"
   * @example true → "true"
   * @example { a: 1 } → "[object Object]"
   */
  | 'string'

  /**
   * Conversion en number
   *
   * Parse string en number. NaN si invalide.
   *
   * @example "123" → 123
   * @example "12.34" → 12.34
   * @example "abc" → NaN
   */
  | 'number'

  /**
   * Conversion en boolean
   *
   * Convertit valeur en boolean selon règles JavaScript.
   *
   * @example "true" → true
   * @example "false" → false
   * @example 1 → true
   * @example 0 → false
   * @example "" → false
   */
  | 'boolean'

  /**
   * Conversion en Date object
   *
   * Parse string ISO ou timestamp en Date object.
   *
   * @example "2025-01-20T10:30:00Z" → Date object
   * @example 1737371400000 → Date object
   */
  | 'date'

  /**
   * Conversion en array
   *
   * Convertit valeur en array. Si déjà array, retourne tel quel.
   *
   * @example "hello" → ["hello"]
   * @example 123 → [123]
   * @example ["a", "b"] → ["a", "b"]
   */
  | 'array'

  /**
   * Parse JSON string en object
   *
   * Parse string JSON en object JavaScript.
   *
   * @example '{"a": 1}' → { a: 1 }
   * @example '[1, 2, 3]' → [1, 2, 3]
   */
  | 'json'

  // ========== TRANSFORMATIONS STRING ==========

  /**
   * Convertit string en majuscules
   *
   * @example "Hello World" → "HELLO WORLD"
   * @example "ceo@company.com" → "CEO@COMPANY.COM"
   */
  | 'uppercase'

  /**
   * Convertit string en minuscules
   *
   * @example "Hello World" → "hello world"
   * @example "CEO@COMPANY.COM" → "ceo@company.com"
   */
  | 'lowercase'

  /**
   * Supprime espaces début/fin
   *
   * @example "  hello  " → "hello"
   * @example "\n  world\t" → "world"
   */
  | 'trim'

  /**
   * Première lettre en majuscule
   *
   * @example "hello world" → "Hello world"
   * @example "IMPORTANT" → "Important"
   */
  | 'capitalize'

  /**
   * Convertit en slug URL-safe
   *
   * @example "Hello World!" → "hello-world"
   * @example "Ça va bien?" → "ca-va-bien"
   */
  | 'slug'

  // ========== TRANSFORMATIONS ARRAY ==========

  /**
   * Divise string en array
   *
   * Paramètres requis: `{ separator: string }`
   *
   * @example "a,b,c" → ["a", "b", "c"] (separator: ",")
   * @example "a b c" → ["a", "b", "c"] (separator: " ")
   */
  | 'split'

  /**
   * Fusionne array en string
   *
   * Paramètres requis: `{ separator: string }`
   *
   * @example ["a", "b", "c"] → "a, b, c" (separator: ", ")
   * @example ["a", "b"] → "a|b" (separator: "|")
   */
  | 'join'

  /**
   * Premier élément d'array
   *
   * @example ["a", "b", "c"] → "a"
   * @example [] → undefined
   */
  | 'first'

  /**
   * Dernier élément d'array
   *
   * @example ["a", "b", "c"] → "c"
   * @example [] → undefined
   */
  | 'last'

  // ========== TRANSFORMATIONS DATE ==========

  /**
   * Date → ISO string
   *
   * @example Date(2025-01-20) → "2025-01-20T10:30:00.000Z"
   */
  | 'date-iso'

  /**
   * Date → Unix timestamp (ms)
   *
   * @example Date(2025-01-20) → 1737371400000
   */
  | 'date-unix'

  /**
   * Date → Format custom
   *
   * Paramètres requis: `{ format: string }` (ex: "YYYY-MM-DD")
   *
   * @example Date(2025-01-20) → "2025-01-20" (format: "YYYY-MM-DD")
   */
  | 'date-format'

  // ========== TRANSFORMATIONS AVANCÉES ==========

  /**
   * Extrait email d'un string
   *
   * @example "Contact: john@company.com for info" → "john@company.com"
   * @example "No email here" → null
   */
  | 'extract-email'

  /**
   * Extrait URLs d'un string
   *
   * @example "Visit https://example.com and http://test.com" → ["https://example.com", "http://test.com"]
   */
  | 'extract-urls'

  /**
   * Supprime syntaxe Markdown (texte brut)
   *
   * @example "# Title\n\n**bold** text" → "Title\n\nbold text"
   */
  | 'markdown-to-text'

  /**
   * Supprime tags HTML (texte brut)
   *
   * @example "<p>Hello <strong>World</strong></p>" → "Hello World"
   */
  | 'html-to-text'

  // ========== CUSTOM ==========

  /**
   * Transformation custom (fonction TypeScript)
   *
   * Paramètres requis: `{ function: string }` (code TypeScript)
   *
   * @example { function: "(val) => val.toUpperCase().split(' ')" }
   */
  | 'custom';

/**
 * Validation de champ
 *
 * Règles de validation appliquées après transformation du champ.
 * Si validation échoue:
 * - Utilise `defaultValue` si défini
 * - Sinon, rejette l'item entier (si `required = true`)
 *
 * **Use cases:**
 * - Valider format email
 * - Vérifier longueur string
 * - Valider range de nombres
 * - Valider dates dans période
 * - Enum de valeurs autorisées
 *
 * @example Email validation
 * ```typescript
 * {
 *   pattern: "^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$",
 *   errorMessage: "Invalid email format"
 * }
 * ```
 *
 * @example String length
 * ```typescript
 * {
 *   min: 1,
 *   max: 100,
 *   errorMessage: "Title must be between 1 and 100 characters"
 * }
 * ```
 */
export interface FieldValidation {
  /**
   * Regex de validation (pour strings)
   *
   * Expression régulière pour valider format string.
   *
   * @example "^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$" // Email
   * @example "^https?://" // URL
   * @example "^[A-Z]{2,4}$" // Code pays (2-4 lettres majuscules)
   */
  pattern?: string;

  /**
   * Valeur minimale
   *
   * Dépend du type:
   * - `number`: Valeur minimale
   * - `string`: Longueur minimale
   * - `Date`: Date minimale
   *
   * @example 0 // Number ≥ 0
   * @example 1 // String length ≥ 1
   * @example new Date("2025-01-01") // Date ≥ 2025-01-01
   */
  min?: number | string | Date;

  /**
   * Valeur maximale
   *
   * Dépend du type:
   * - `number`: Valeur maximale
   * - `string`: Longueur maximale
   * - `Date`: Date maximale
   *
   * @example 100 // Number ≤ 100
   * @example 500 // String length ≤ 500
   * @example new Date("2025-12-31") // Date ≤ 2025-12-31
   */
  max?: number | string | Date;

  /**
   * Valeurs autorisées (enum)
   *
   * Liste de valeurs autorisées. Valeur doit être dans cette liste.
   *
   * @example ["active", "paused", "error"] // Status valides
   * @example [1, 2, 3, 5, 10] // Priorités valides
   */
  enum?: any[];

  /**
   * Message d'erreur custom
   *
   * Message descriptif si validation échoue.
   * Utilisé pour logs et debugging.
   *
   * @example "Invalid email format"
   * @example "Title must be between 1 and 100 characters"
   * @example "Date must be after 2025-01-01"
   */
  errorMessage?: string;
}
