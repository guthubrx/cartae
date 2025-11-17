/**
 * CartaeRelationship - Relations entre CartaeItems
 *
 * Permet de créer un graphe de relations entre items,
 * qu'elles soient définies manuellement ou détectées par AI.
 *
 * @module types/CartaeRelationship
 */
/**
 * Type guard pour vérifier si un objet est une CartaeRelationship valide
 */
export function isCartaeRelationship(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const rel = obj;
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
export function getInverseRelationType(type) {
    const inverseMap = {
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
//# sourceMappingURL=CartaeRelationship.js.map