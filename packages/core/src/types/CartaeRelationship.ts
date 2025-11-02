/**
 * CartaeRelationship - Relations entre CartaeItems
 *
 * Permet de créer un graphe de relations entre items,
 * qu'elles soient définies manuellement ou détectées par AI.
 *
 * @module types/CartaeRelationship
 */

/**
 * Types de relations standards
 */
export type RelationshipType =
  | 'parent' // Item parent dans hiérarchie
  | 'child' // Item enfant dans hiérarchie
  | 'related' // Relation générique
  | 'references' // Référence un autre item
  | 'blocks' // Bloque un autre item
  | 'blockedBy' // Est bloqué par un autre item
  | 'duplicates' // Est un doublon d'un autre item
  | 'duplicatedBy' // A un doublon
  | 'replaces' // Remplace un autre item
  | 'replacedBy' // Est remplacé par un autre item
  | 'dependsOn' // Dépend d'un autre item
  | 'requiredBy'; // Est requis par un autre item

/**
 * Source d'une relation (qui l'a créée)
 */
export type RelationshipCreator = 'user' | 'ai' | 'system';

/**
 * Métadonnées d'une relation
 */
export interface RelationshipMetadata {
  /**
   * Force de la relation (0 à 1)
   * Utilisé principalement pour relations AI
   * @example 0.95 = forte connexion, 0.3 = connexion faible
   */
  strength?: number;

  /**
   * Qui a créé cette relation ?
   * - 'user' : Créée manuellement par l'utilisateur
   * - 'ai' : Détectée automatiquement par l'AI
   * - 'system' : Créée par le système (ex: parent/child hiérarchique)
   * @default 'user'
   */
  createdBy?: RelationshipCreator;

  /**
   * Date de création de la relation
   */
  createdAt?: Date;

  /**
   * Raison de la relation (optionnel)
   * Utile pour relations AI pour expliquer la détection
   * @example "Mentionnent tous deux le projet X", "Même participants"
   */
  reason?: string;

  /**
   * Niveau de confiance (0 à 1) - pour relations AI
   * @example 0.9 = haute confiance, 0.4 = faible confiance
   */
  confidence?: number;

  /**
   * Données extensibles
   */
  [key: string]: unknown;
}

/**
 * CartaeRelationship - Lien entre deux CartaeItems
 *
 * Représente une relation directionnelle d'un item source
 * vers un item cible (identifié par targetId).
 */
export interface CartaeRelationship {
  /**
   * Type de relation
   */
  type: RelationshipType;

  /**
   * ID du CartaeItem cible
   * @example "uuid-of-target-item"
   */
  targetId: string;

  /**
   * Métadonnées de la relation (optionnel)
   */
  metadata?: RelationshipMetadata;

  /**
   * Est-ce une relation bidirectionnelle ?
   * Si true, la relation inverse est automatiquement créée
   * @default false
   * @example Si A -> B est "related", alors B -> A est aussi "related"
   */
  bidirectional?: boolean;
}

/**
 * Type guard pour vérifier si un objet est une CartaeRelationship valide
 */
export function isCartaeRelationship(obj: unknown): obj is CartaeRelationship {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const rel = obj as Partial<CartaeRelationship>;

  return typeof rel.type === 'string' && typeof rel.targetId === 'string';
}

/**
 * Obtenir le type de relation inverse
 *
 * @param type - Type de relation
 * @returns Type de relation inverse
 *
 * @example
 * getInverseRelationType('parent') // returns 'child'
 * getInverseRelationType('blocks') // returns 'blockedBy'
 */
export function getInverseRelationType(type: RelationshipType): RelationshipType | null {
  const inverseMap: Partial<Record<RelationshipType, RelationshipType>> = {
    parent: 'child',
    child: 'parent',
    blocks: 'blockedBy',
    blockedBy: 'blocks',
    duplicates: 'duplicatedBy',
    duplicatedBy: 'duplicates',
    replaces: 'replacedBy',
    replacedBy: 'replaces',
    dependsOn: 'requiredBy',
    requiredBy: 'dependsOn',
  };

  return inverseMap[type] ?? null;
}
