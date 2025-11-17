/**
 * CartaeItem - Format universel pour tous les items Cartae
 *
 * Ce format unifié permet de représenter n'importe quelle donnée provenant
 * de sources diverses (emails, tasks, documents, messages, events, notes)
 * de manière cohérente.
 *
 * Compatible JSON-LD pour interopérabilité W3C standards.
 *
 * @module types/CartaeItem
 */
/**
 * Type guard pour vérifier si un objet est un CartaeItem valide
 *
 * @param obj - Objet à vérifier
 * @returns true si l'objet respecte la structure CartaeItem
 */
export function isCartaeItem(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const item = obj;
    return (typeof item.id === 'string' &&
        typeof item.type === 'string' &&
        typeof item.title === 'string' &&
        typeof item.metadata === 'object' &&
        item.metadata !== null &&
        Array.isArray(item.tags) &&
        typeof item.source === 'object' &&
        item.source !== null &&
        item.createdAt instanceof Date &&
        item.updatedAt instanceof Date);
}
//# sourceMappingURL=CartaeItem.js.map