/**
 * CartaeMetadata - Métadonnées enrichies pour CartaeItem
 *
 * Contient les informations contextuelles, l'enrichissement AI,
 * et les champs extensibles spécifiques à chaque type d'item.
 *
 * @module types/CartaeMetadata
 */
/**
 * Type guard pour vérifier si un objet est un AIInsights valide
 */
export function isAIInsights(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const insights = obj;
    // Validation basique : au moins un champ AI présent
    return (insights.sentiment !== undefined ||
        insights.priorityScore !== undefined ||
        insights.suggestedTags !== undefined ||
        insights.connections !== undefined ||
        insights.confidence !== undefined);
}
/**
 * Type guard pour vérifier si un objet est un CartaeMetadata valide
 */
export function isCartaeMetadata(obj) {
    // Métadonnées sont optionnelles, donc un objet vide est valide
    return typeof obj === 'object' && obj !== null;
}
//# sourceMappingURL=CartaeMetadata.js.map