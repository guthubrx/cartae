/**
 * FieldMappingEngine - Moteur de transformation de champs
 *
 * Applique les transformations définies dans FieldMapping pour mapper
 * les données source vers CartaeItem.
 *
 * @packageDocumentation
 * @module sources
 * @version 1.0.0
 * @since Session 128
 */

import type {
  FieldMapping,
  TransformType,
  FieldValidation,
} from './types/UnifiedSource';

/**
 * Erreur de mapping
 *
 * Lancée quand une transformation ou validation échoue.
 */
export class FieldMappingError extends Error {
  constructor(
    message: string,
    public readonly mappingId: string,
    public readonly sourceField: string,
    public readonly targetField: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FieldMappingError';
  }
}

/**
 * Moteur de transformation de champs
 *
 * Applique les transformations FieldMapping pour convertir données source → CartaeItem.
 *
 * **Features:**
 * - 20+ transformations built-in (string, date, array, etc.)
 * - Transformations custom (fonctions TypeScript)
 * - Validation de champs (regex, min/max, enum)
 * - Gestion d'erreurs détaillée
 * - Support champs imbriqués (notation pointée)
 * - Valeurs par défaut
 *
 * @example Usage basique
 * ```typescript
 * const engine = new FieldMappingEngine();
 *
 * const emailData = {
 *   from: { emailAddress: { address: 'CEO@Company.com' } },
 *   subject: 'Q1 Budget',
 *   receivedDateTime: '2025-01-20T10:30:00Z'
 * };
 *
 * const mappings: FieldMapping[] = [
 *   {
 *     id: '1',
 *     sourceField: 'from.emailAddress.address',
 *     targetField: 'metadata.author',
 *     transform: 'lowercase',
 *     required: true
 *   },
 *   {
 *     id: '2',
 *     sourceField: 'receivedDateTime',
 *     targetField: 'timestamp',
 *     transform: 'date',
 *     required: true
 *   }
 * ];
 *
 * const result = engine.applyMappings(emailData, mappings);
 * // {
 * //   metadata: { author: 'ceo@company.com' },
 * //   timestamp: Date(2025-01-20T10:30:00Z)
 * // }
 * ```
 */
export class FieldMappingEngine {
  /**
   * Applique un mapping unique
   *
   * Transforme une valeur source selon le mapping défini.
   *
   * **Process:**
   * 1. Extraire valeur source (notation pointée)
   * 2. Appliquer transformation
   * 3. Valider résultat (si validation définie)
   * 4. Utiliser defaultValue si valeur null/undefined
   * 5. Vérifier required si valeur absente
   *
   * @param data - Données source (object)
   * @param mapping - Mapping à appliquer
   * @returns Object avec champ cible assigné
   * @throws {FieldMappingError} Si transformation échoue ou champ required manquant
   *
   * @example Email lowercase
   * ```typescript
   * const result = engine.applyMapping(
   *   { email: 'CEO@COMPANY.COM' },
   *   {
   *     id: '1',
   *     sourceField: 'email',
   *     targetField: 'author',
   *     transform: 'lowercase',
   *     required: true
   *   }
   * );
   * // { author: 'ceo@company.com' }
   * ```
   */
  applyMapping(data: any, mapping: FieldMapping): any {
    try {
      // 1. Extraire valeur source
      let value = this.getNestedValue(data, mapping.sourceField);

      // 2. Gérer valeur absente
      if (value === null || value === undefined) {
        if (mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        } else if (mapping.required) {
          throw new Error(
            `Required field "${mapping.sourceField}" is missing and no defaultValue provided`
          );
        } else {
          // Champ optionnel absent, retourner object vide
          return {};
        }
      }

      // 3. Appliquer transformation
      const transformed = this.applyTransform(
        value,
        mapping.transform,
        mapping.transformParams
      );

      // 4. Valider résultat (si validation définie)
      if (mapping.validation) {
        this.validateValue(transformed, mapping.validation, mapping);
      }

      // 5. Assigner au champ cible
      return this.setNestedValue({}, mapping.targetField, transformed);
    } catch (error) {
      throw new FieldMappingError(
        error instanceof Error ? error.message : String(error),
        mapping.id,
        mapping.sourceField,
        mapping.targetField,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Applique plusieurs mappings
   *
   * Applique tous les mappings et fusionne les résultats.
   *
   * **Process:**
   * 1. Valider tous les mappings d'abord
   * 2. Appliquer chaque mapping individuellement
   * 3. Fusionner résultats (deep merge)
   * 4. Retourner object final
   *
   * **Note:** Si plusieurs mappings ciblent le même champ, le dernier gagne.
   *
   * @param data - Données source
   * @param mappings - Array de mappings à appliquer
   * @returns Object avec tous les champs cibles assignés
   * @throws {FieldMappingError} Si un mapping échoue
   *
   * @example Multiple fields
   * ```typescript
   * const result = engine.applyMappings(emailData, [
   *   { sourceField: 'from.emailAddress.address', targetField: 'metadata.author', transform: 'lowercase', required: true },
   *   { sourceField: 'subject', targetField: 'title', transform: 'none', required: true },
   *   { sourceField: 'receivedDateTime', targetField: 'timestamp', transform: 'date', required: true }
   * ]);
   * ```
   */
  applyMappings(data: any, mappings: FieldMapping[]): any {
    // Valider tous les mappings d'abord
    mappings.forEach(mapping => this.validateMapping(mapping));

    // Appliquer chaque mapping et fusionner résultats
    return mappings.reduce((result, mapping) => {
      const mapped = this.applyMapping(data, mapping);
      return this.deepMerge(result, mapped);
    }, {});
  }

  /**
   * Valide un mapping
   *
   * Vérifie qu'un mapping est bien formé avant utilisation.
   *
   * **Validations:**
   * - `id` non vide
   * - `sourceField` non vide
   * - `targetField` non vide
   * - `transform` est un TransformType valide
   * - `transformParams` valide si transform nécessite params
   *
   * @param mapping - Mapping à valider
   * @throws {Error} Si mapping invalide
   *
   * @example
   * ```typescript
   * engine.validateMapping({
   *   id: '1',
   *   sourceField: 'email',
   *   targetField: 'author',
   *   transform: 'lowercase',
   *   required: true
   * }); // OK
   *
   * engine.validateMapping({
   *   id: '',
   *   sourceField: 'email',
   *   // ...
   * }); // Throw Error: "Mapping ID cannot be empty"
   * ```
   */
  validateMapping(mapping: FieldMapping): void {
    if (!mapping.id || mapping.id.trim() === '') {
      throw new Error('Mapping ID cannot be empty');
    }

    if (!mapping.sourceField || mapping.sourceField.trim() === '') {
      throw new Error(`Mapping ${mapping.id}: sourceField cannot be empty`);
    }

    if (!mapping.targetField || mapping.targetField.trim() === '') {
      throw new Error(`Mapping ${mapping.id}: targetField cannot be empty`);
    }

    // Valider transform est un type valide
    const validTransforms: TransformType[] = [
      'none',
      'string',
      'number',
      'boolean',
      'date',
      'array',
      'json',
      'uppercase',
      'lowercase',
      'trim',
      'capitalize',
      'slug',
      'split',
      'join',
      'first',
      'last',
      'date-iso',
      'date-unix',
      'date-format',
      'extract-email',
      'extract-urls',
      'markdown-to-text',
      'html-to-text',
      'custom',
    ];

    if (!validTransforms.includes(mapping.transform)) {
      throw new Error(
        `Mapping ${mapping.id}: Invalid transform type "${mapping.transform}"`
      );
    }

    // Valider params si nécessaires
    if (['split', 'join'].includes(mapping.transform)) {
      if (
        !mapping.transformParams ||
        !mapping.transformParams.separator
      ) {
        throw new Error(
          `Mapping ${mapping.id}: Transform "${mapping.transform}" requires transformParams.separator`
        );
      }
    }

    if (mapping.transform === 'date-format') {
      if (!mapping.transformParams || !mapping.transformParams.format) {
        throw new Error(
          `Mapping ${mapping.id}: Transform "date-format" requires transformParams.format`
        );
      }
    }

    if (mapping.transform === 'custom') {
      if (!mapping.transformParams || !mapping.transformParams.function) {
        throw new Error(
          `Mapping ${mapping.id}: Transform "custom" requires transformParams.function`
        );
      }
    }
  }

  // ========== TRANSFORMATIONS ==========

  /**
   * Applique une transformation à une valeur
   *
   * @param value - Valeur à transformer
   * @param transform - Type de transformation
   * @param params - Paramètres de transformation (optionnel)
   * @returns Valeur transformée
   * @throws {Error} Si transformation échoue
   */
  private applyTransform(
    value: any,
    transform: TransformType,
    params?: Record<string, any>
  ): any {
    switch (transform) {
      // ===== AUCUNE TRANSFORMATION =====
      case 'none':
        return value;

      // ===== CONVERSIONS DE TYPES =====
      case 'string':
        return String(value);

      case 'number': {
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot convert "${value}" to number`);
        }
        return num;
      }

      case 'boolean':
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true') return true;
          if (lower === 'false') return false;
        }
        return Boolean(value);

      case 'date': {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot parse "${value}" as date`);
        }
        return date;
      }

      case 'array':
        return Array.isArray(value) ? value : [value];

      case 'json': {
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            throw new Error(`Cannot parse "${value}" as JSON`);
          }
        }
        return value;
      }

      // ===== TRANSFORMATIONS STRING =====
      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'trim':
        return String(value).trim();

      case 'capitalize': {
        const str = String(value);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      }

      case 'slug':
        return this.toSlug(String(value));

      // ===== TRANSFORMATIONS ARRAY =====
      case 'split':
        if (!params?.separator) {
          throw new Error('Transform "split" requires separator parameter');
        }
        return String(value).split(params.separator);

      case 'join':
        if (!params?.separator) {
          throw new Error('Transform "join" requires separator parameter');
        }
        if (!Array.isArray(value)) {
          throw new Error('Transform "join" requires array value');
        }
        return value.join(params.separator);

      case 'first':
        if (!Array.isArray(value)) {
          throw new Error('Transform "first" requires array value');
        }
        return value[0];

      case 'last':
        if (!Array.isArray(value)) {
          throw new Error('Transform "last" requires array value');
        }
        return value[value.length - 1];

      // ===== TRANSFORMATIONS DATE =====
      case 'date-iso': {
        const dateIso = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(dateIso.getTime())) {
          throw new Error(`Cannot parse "${value}" as date`);
        }
        return dateIso.toISOString();
      }

      case 'date-unix': {
        const dateUnix = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(dateUnix.getTime())) {
          throw new Error(`Cannot parse "${value}" as date`);
        }
        return dateUnix.getTime();
      }

      case 'date-format': {
        if (!params?.format) {
          throw new Error('Transform "date-format" requires format parameter');
        }
        const dateFormat = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(dateFormat.getTime())) {
          throw new Error(`Cannot parse "${value}" as date`);
        }
        return this.formatDate(dateFormat, params.format);
      }

      // ===== TRANSFORMATIONS AVANCÉES =====
      case 'extract-email': {
        const emailMatch = String(value).match(
          /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
        );
        return emailMatch ? emailMatch[0] : null;
      }

      case 'extract-urls': {
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = String(value).match(urlRegex);
        return urls || [];
      }

      case 'markdown-to-text':
        return this.markdownToText(String(value));

      case 'html-to-text':
        return this.htmlToText(String(value));

      // ===== CUSTOM =====
      case 'custom':
        // TODO: Implémenter custom transformations avec sandbox sécurisé
        // Pour l'instant, désactivé pour raisons de sécurité (eval/Function)
        throw new Error(
          'Custom transformations not yet implemented (security: no eval/Function)'
        );

      default:
        throw new Error(`Unknown transform type: ${transform}`);
    }
  }

  // ========== VALIDATION ==========

  /**
   * Valide une valeur selon règles FieldValidation
   *
   * @param value - Valeur à valider
   * @param validation - Règles de validation
   * @param mapping - Mapping (pour erreur)
   * @throws {Error} Si validation échoue
   */
  private validateValue(
    value: any,
    validation: FieldValidation,
    mapping: FieldMapping
  ): void {
    // Regex pattern
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(String(value))) {
        throw new Error(
          validation.errorMessage ||
            `Value "${value}" does not match pattern ${validation.pattern}`
        );
      }
    }

    // Min/max pour numbers
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < Number(validation.min)) {
        throw new Error(
          validation.errorMessage ||
            `Value ${value} is less than minimum ${validation.min}`
        );
      }
      if (validation.max !== undefined && value > Number(validation.max)) {
        throw new Error(
          validation.errorMessage ||
            `Value ${value} is greater than maximum ${validation.max}`
        );
      }
    }

    // Min/max pour strings (longueur)
    if (typeof value === 'string') {
      if (
        validation.min !== undefined &&
        value.length < Number(validation.min)
      ) {
        throw new Error(
          validation.errorMessage ||
            `String length ${value.length} is less than minimum ${validation.min}`
        );
      }
      if (
        validation.max !== undefined &&
        value.length > Number(validation.max)
      ) {
        throw new Error(
          validation.errorMessage ||
            `String length ${value.length} is greater than maximum ${validation.max}`
        );
      }
    }

    // Min/max pour dates
    if (value instanceof Date) {
      if (validation.min !== undefined) {
        const minDate =
          validation.min instanceof Date
            ? validation.min
            : new Date(validation.min);
        if (value < minDate) {
          throw new Error(
            validation.errorMessage ||
              `Date ${value.toISOString()} is before minimum ${minDate.toISOString()}`
          );
        }
      }
      if (validation.max !== undefined) {
        const maxDate =
          validation.max instanceof Date
            ? validation.max
            : new Date(validation.max);
        if (value > maxDate) {
          throw new Error(
            validation.errorMessage ||
              `Date ${value.toISOString()} is after maximum ${maxDate.toISOString()}`
          );
        }
      }
    }

    // Enum (valeurs autorisées)
    if (validation.enum && validation.enum.length > 0) {
      if (!validation.enum.includes(value)) {
        throw new Error(
          validation.errorMessage ||
            `Value "${value}" is not in allowed values: ${validation.enum.join(', ')}`
        );
      }
    }
  }

  // ========== HELPERS ==========

  /**
   * Récupère valeur imbriquée via notation pointée
   *
   * @param obj - Object source
   * @param path - Chemin notation pointée (ex: "from.emailAddress.address")
   * @returns Valeur trouvée ou undefined
   *
   * @example
   * ```typescript
   * const data = { from: { emailAddress: { address: 'test@example.com' } } };
   * getNestedValue(data, 'from.emailAddress.address'); // "test@example.com"
   * ```
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Assigne valeur imbriquée via notation pointée
   *
   * @param obj - Object cible
   * @param path - Chemin notation pointée (ex: "metadata.author")
   * @param value - Valeur à assigner
   * @returns Object modifié
   *
   * @example
   * ```typescript
   * const obj = {};
   * setNestedValue(obj, 'metadata.author', 'john@example.com');
   * // { metadata: { author: 'john@example.com' } }
   * ```
   */
  private setNestedValue(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    return obj;
  }

  /**
   * Deep merge de 2 objects
   *
   * @param target - Object cible
   * @param source - Object source
   * @returns Object fusionné
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          !(source[key] instanceof Date)
        ) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Convertit string en slug URL-safe
   *
   * @param str - String à slugifier
   * @returns Slug
   *
   * @example
   * ```typescript
   * toSlug("Hello World!"); // "hello-world"
   * toSlug("Ça va bien?"); // "ca-va-bien"
   * ```
   */
  private toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD') // Décomposer accents
      .replace(/[\u0300-\u036f]/g, '') // Supprimer diacritiques
      .replace(/[^a-z0-9\s-]/g, '') // Garder alphanum + espaces + tirets
      .trim()
      .replace(/\s+/g, '-') // Espaces → tirets
      .replace(/-+/g, '-'); // Tirets multiples → tiret unique
  }

  /**
   * Supprime syntaxe Markdown (texte brut)
   *
   * @param markdown - String Markdown
   * @returns Texte brut
   *
   * @example
   * ```typescript
   * markdownToText("# Title\n\n**bold** text"); // "Title\n\nbold text"
   * ```
   */
  private markdownToText(markdown: string): string {
    return (
      markdown
        // Headers (# ## ###)
        .replace(/^#{1,6}\s+/gm, '')
        // Bold (**text** __text__)
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        // Italic (*text* _text_)
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        // Links [text](url)
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        // Images ![alt](url)
        .replace(/!\[.+?\]\(.+?\)/g, '')
        // Code `code`
        .replace(/`(.+?)`/g, '$1')
        // Code blocks ```code```
        .replace(/```[\s\S]+?```/g, '')
        .trim()
    );
  }

  /**
   * Supprime tags HTML (texte brut)
   *
   * @param html - String HTML
   * @returns Texte brut
   *
   * @example
   * ```typescript
   * htmlToText("<p>Hello <strong>World</strong></p>"); // "Hello World"
   * ```
   */
  private htmlToText(html: string): string {
    // Simple regex pour supprimer tags HTML
    // En production, utiliser une lib comme DOMParser ou cheerio
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Formate Date selon pattern
   *
   * Patterns supportés:
   * - YYYY: Année 4 chiffres
   * - MM: Mois 2 chiffres
   * - DD: Jour 2 chiffres
   * - HH: Heure 2 chiffres (24h)
   * - mm: Minute 2 chiffres
   * - ss: Seconde 2 chiffres
   *
   * @param date - Date à formater
   * @param format - Pattern (ex: "YYYY-MM-DD")
   * @returns String formatée
   *
   * @example
   * ```typescript
   * const date = new Date("2025-01-20T10:30:15Z");
   * formatDate(date, "YYYY-MM-DD"); // "2025-01-20"
   * formatDate(date, "DD/MM/YYYY HH:mm"); // "20/01/2025 10:30"
   * ```
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
}
