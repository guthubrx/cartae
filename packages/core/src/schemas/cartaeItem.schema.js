/**
 * Zod Schemas - Validation runtime pour CartaeItem
 *
 * Permet de valider les données provenant de sources externes
 * (API, fichiers, plugins) pour s'assurer qu'elles respectent
 * le format CartaeItem.
 *
 * @module schemas/cartaeItem
 */
import { z } from 'zod';
/**
 * Schema Zod pour CartaeItemType
 */
export const CartaeItemTypeSchema = z.enum([
    'email',
    'task',
    'document',
    'message',
    'event',
    'note',
    'contact',
    'file',
]);
/**
 * Schema Zod pour PriorityLevel
 */
export const PriorityLevelSchema = z.enum(['low', 'medium', 'high', 'urgent']);
/**
 * Schema Zod pour ItemStatus
 */
export const ItemStatusSchema = z.enum([
    'new',
    'in_progress',
    'pending',
    'completed',
    'cancelled',
    'blocked',
]);
/**
 * Schema Zod pour RelationshipType
 */
export const RelationshipTypeSchema = z.enum([
    'parent',
    'child',
    'related',
    'references',
    'blocks',
    'blockedBy',
    'duplicates',
    'duplicatedBy',
    'replaces',
    'replacedBy',
    'dependsOn',
    'requiredBy',
]);
/**
 * Schema Zod pour RelationshipCreator
 */
export const RelationshipCreatorSchema = z.enum(['user', 'ai', 'system']);
/**
 * Schema Zod pour AIInsights
 */
export const AIInsightsSchema = z
    .object({
    sentiment: z.number().min(-1).max(1).optional(),
    priorityScore: z.number().min(0).max(1).optional(),
    suggestedTags: z.array(z.string()).optional(),
    connections: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    summary: z.string().optional(),
    entities: z
        .object({
        persons: z.array(z.string()).optional(),
        organizations: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        dates: z.array(z.string()).optional(),
    })
        .optional(),
    topics: z.array(z.string()).optional(),
    lastAnalyzedAt: z.coerce.date().optional(),
})
    .passthrough();
/**
 * Schema Zod pour CartaeMetadata
 */
export const CartaeMetadataSchema = z
    .object({
    author: z.string().optional(),
    participants: z.array(z.string()).optional(),
    priority: PriorityLevelSchema.optional(),
    status: ItemStatusSchema.optional(),
    dueDate: z.coerce.date().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    location: z.string().optional(),
    duration: z.number().int().positive().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    aiInsights: AIInsightsSchema.optional(),
})
    .passthrough(); // Permet champs custom extensibles
/**
 * Schema Zod pour RelationshipMetadata
 */
export const RelationshipMetadataSchema = z
    .object({
    strength: z.number().min(0).max(1).optional(),
    createdBy: RelationshipCreatorSchema.optional(),
    createdAt: z.coerce.date().optional(),
    reason: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
})
    .passthrough();
/**
 * Schema Zod pour CartaeRelationship
 */
export const CartaeRelationshipSchema = z.object({
    type: RelationshipTypeSchema,
    targetId: z.string().uuid(),
    metadata: RelationshipMetadataSchema.optional(),
    bidirectional: z.boolean().optional(),
});
/**
 * Schema Zod pour CartaeSource
 */
export const CartaeSourceSchema = z.object({
    connector: z.string().min(1),
    originalId: z.string().min(1),
    url: z.string().url().optional(),
    lastSync: z.coerce.date(),
    metadata: z.record(z.unknown()).optional(),
});
/**
 * Schema Zod pour CartaeItem
 */
export const CartaeItemSchema = z.object({
    id: z.string().uuid(),
    type: CartaeItemTypeSchema,
    title: z.string().min(1).max(500),
    content: z.string().optional(),
    '@context': z.union([z.string(), z.array(z.string()), z.record(z.unknown())]).optional(),
    '@type': z.union([z.string(), z.array(z.string())]).optional(),
    metadata: CartaeMetadataSchema,
    relationships: z.array(CartaeRelationshipSchema).optional(),
    tags: z.array(z.string()),
    categories: z.array(z.string()).optional(),
    source: CartaeSourceSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    archived: z.boolean().optional(),
    favorite: z.boolean().optional(),
});
/**
 * Valide un objet contre le schema CartaeItem
 *
 * @param data - Données à valider
 * @returns Résultat de validation Zod
 *
 * @example
 * const result = validateCartaeItem(someData);
 * if (result.success) {
 *   const item = result.data; // CartaeItem validé
 * } else {
 *   console.error(result.error); // Erreurs de validation
 * }
 */
export function validateCartaeItem(data) {
    return CartaeItemSchema.safeParse(data);
}
/**
 * Valide un objet et throw une erreur si invalide
 *
 * @param data - Données à valider
 * @returns CartaeItem validé
 * @throws ZodError si la validation échoue
 *
 * @example
 * try {
 *   const item = parseCartaeItem(someData);
 *   // item est garanti valide ici
 * } catch (error) {
 *   // Erreur de validation
 * }
 */
export function parseCartaeItem(data) {
    return CartaeItemSchema.parse(data);
}
//# sourceMappingURL=cartaeItem.schema.js.map