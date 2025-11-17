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
export declare const CartaeItemTypeSchema: z.ZodEnum<["email", "task", "document", "message", "event", "note", "contact", "file"]>;
/**
 * Schema Zod pour PriorityLevel
 */
export declare const PriorityLevelSchema: z.ZodEnum<["low", "medium", "high", "urgent"]>;
/**
 * Schema Zod pour ItemStatus
 */
export declare const ItemStatusSchema: z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>;
/**
 * Schema Zod pour RelationshipType
 */
export declare const RelationshipTypeSchema: z.ZodEnum<["parent", "child", "related", "references", "blocks", "blockedBy", "duplicates", "duplicatedBy", "replaces", "replacedBy", "dependsOn", "requiredBy"]>;
/**
 * Schema Zod pour RelationshipCreator
 */
export declare const RelationshipCreatorSchema: z.ZodEnum<["user", "ai", "system"]>;
/**
 * Schema Zod pour AIInsights
 */
export declare const AIInsightsSchema: z.ZodObject<{
    sentiment: z.ZodOptional<z.ZodNumber>;
    priorityScore: z.ZodOptional<z.ZodNumber>;
    suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    summary: z.ZodOptional<z.ZodString>;
    entities: z.ZodOptional<z.ZodObject<{
        persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        persons?: string[] | undefined;
        organizations?: string[] | undefined;
        locations?: string[] | undefined;
        dates?: string[] | undefined;
    }, {
        persons?: string[] | undefined;
        organizations?: string[] | undefined;
        locations?: string[] | undefined;
        dates?: string[] | undefined;
    }>>;
    topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    sentiment: z.ZodOptional<z.ZodNumber>;
    priorityScore: z.ZodOptional<z.ZodNumber>;
    suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    summary: z.ZodOptional<z.ZodString>;
    entities: z.ZodOptional<z.ZodObject<{
        persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        persons?: string[] | undefined;
        organizations?: string[] | undefined;
        locations?: string[] | undefined;
        dates?: string[] | undefined;
    }, {
        persons?: string[] | undefined;
        organizations?: string[] | undefined;
        locations?: string[] | undefined;
        dates?: string[] | undefined;
    }>>;
    topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    sentiment: z.ZodOptional<z.ZodNumber>;
    priorityScore: z.ZodOptional<z.ZodNumber>;
    suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    summary: z.ZodOptional<z.ZodString>;
    entities: z.ZodOptional<z.ZodObject<{
        persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        persons?: string[] | undefined;
        organizations?: string[] | undefined;
        locations?: string[] | undefined;
        dates?: string[] | undefined;
    }, {
        persons?: string[] | undefined;
        organizations?: string[] | undefined;
        locations?: string[] | undefined;
        dates?: string[] | undefined;
    }>>;
    topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Schema Zod pour CartaeMetadata
 */
export declare const CartaeMetadataSchema: z.ZodObject<{
    author: z.ZodOptional<z.ZodString>;
    participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>>;
    dueDate: z.ZodOptional<z.ZodDate>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    location: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    progress: z.ZodOptional<z.ZodNumber>;
    aiInsights: z.ZodOptional<z.ZodObject<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    author: z.ZodOptional<z.ZodString>;
    participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>>;
    dueDate: z.ZodOptional<z.ZodDate>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    location: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    progress: z.ZodOptional<z.ZodNumber>;
    aiInsights: z.ZodOptional<z.ZodObject<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, z.ZodTypeAny, "passthrough">>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    author: z.ZodOptional<z.ZodString>;
    participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>>;
    dueDate: z.ZodOptional<z.ZodDate>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    location: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    progress: z.ZodOptional<z.ZodNumber>;
    aiInsights: z.ZodOptional<z.ZodObject<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        sentiment: z.ZodOptional<z.ZodNumber>;
        priorityScore: z.ZodOptional<z.ZodNumber>;
        suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        entities: z.ZodOptional<z.ZodObject<{
            persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }, {
            persons?: string[] | undefined;
            organizations?: string[] | undefined;
            locations?: string[] | undefined;
            dates?: string[] | undefined;
        }>>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
    }, z.ZodTypeAny, "passthrough">>>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Schema Zod pour RelationshipMetadata
 */
export declare const RelationshipMetadataSchema: z.ZodObject<{
    strength: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    reason: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    strength: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    reason: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    strength: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    reason: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Schema Zod pour CartaeRelationship
 */
export declare const CartaeRelationshipSchema: z.ZodObject<{
    type: z.ZodEnum<["parent", "child", "related", "references", "blocks", "blockedBy", "duplicates", "duplicatedBy", "replaces", "replacedBy", "dependsOn", "requiredBy"]>;
    targetId: z.ZodString;
    metadata: z.ZodOptional<z.ZodObject<{
        strength: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
        createdAt: z.ZodOptional<z.ZodDate>;
        reason: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        strength: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
        createdAt: z.ZodOptional<z.ZodDate>;
        reason: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        strength: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
        createdAt: z.ZodOptional<z.ZodDate>;
        reason: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>>;
    bidirectional: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
    targetId: string;
    metadata?: z.objectOutputType<{
        strength: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
        createdAt: z.ZodOptional<z.ZodDate>;
        reason: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    bidirectional?: boolean | undefined;
}, {
    type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
    targetId: string;
    metadata?: z.objectInputType<{
        strength: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
        createdAt: z.ZodOptional<z.ZodDate>;
        reason: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    bidirectional?: boolean | undefined;
}>;
/**
 * Schema Zod pour CartaeSource
 */
export declare const CartaeSourceSchema: z.ZodObject<{
    connector: z.ZodString;
    originalId: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    lastSync: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    connector: string;
    originalId: string;
    lastSync: Date;
    url?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    connector: string;
    originalId: string;
    lastSync: Date;
    url?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
/**
 * Schema Zod pour CartaeItem
 */
export declare const CartaeItemSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["email", "task", "document", "message", "event", "note", "contact", "file"]>;
    title: z.ZodString;
    content: z.ZodOptional<z.ZodString>;
    '@context': z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    '@type': z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    metadata: z.ZodObject<{
        author: z.ZodOptional<z.ZodString>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
        status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>>;
        dueDate: z.ZodOptional<z.ZodDate>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
        location: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        progress: z.ZodOptional<z.ZodNumber>;
        aiInsights: z.ZodOptional<z.ZodObject<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough">>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        author: z.ZodOptional<z.ZodString>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
        status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>>;
        dueDate: z.ZodOptional<z.ZodDate>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
        location: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        progress: z.ZodOptional<z.ZodNumber>;
        aiInsights: z.ZodOptional<z.ZodObject<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough">>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        author: z.ZodOptional<z.ZodString>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
        status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "pending", "completed", "cancelled", "blocked"]>>;
        dueDate: z.ZodOptional<z.ZodDate>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
        location: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        progress: z.ZodOptional<z.ZodNumber>;
        aiInsights: z.ZodOptional<z.ZodObject<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough">>>;
    }, z.ZodTypeAny, "passthrough">>;
    relationships: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["parent", "child", "related", "references", "blocks", "blockedBy", "duplicates", "duplicatedBy", "replaces", "replacedBy", "dependsOn", "requiredBy"]>;
        targetId: z.ZodString;
        metadata: z.ZodOptional<z.ZodObject<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough">>>;
        bidirectional: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectOutputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }, {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectInputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }>, "many">>;
    tags: z.ZodArray<z.ZodString, "many">;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    source: z.ZodObject<{
        connector: z.ZodString;
        originalId: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        lastSync: z.ZodDate;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    archived: z.ZodOptional<z.ZodBoolean>;
    favorite: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "email" | "file" | "document" | "note" | "message" | "event" | "task" | "contact";
    id: string;
    title: string;
    createdAt: Date;
    metadata: {
        author?: string | undefined;
        status?: "new" | "in_progress" | "pending" | "completed" | "cancelled" | "blocked" | undefined;
        location?: string | undefined;
        participants?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "urgent" | undefined;
        dueDate?: Date | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        duration?: number | undefined;
        progress?: number | undefined;
        aiInsights?: z.objectOutputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    } & {
        [k: string]: unknown;
    };
    tags: string[];
    source: {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    updatedAt: Date;
    content?: string | undefined;
    '@context'?: string | string[] | Record<string, unknown> | undefined;
    '@type'?: string | string[] | undefined;
    relationships?: {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectOutputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }[] | undefined;
    categories?: string[] | undefined;
    archived?: boolean | undefined;
    favorite?: boolean | undefined;
}, {
    type: "email" | "file" | "document" | "note" | "message" | "event" | "task" | "contact";
    id: string;
    title: string;
    createdAt: Date;
    metadata: {
        author?: string | undefined;
        status?: "new" | "in_progress" | "pending" | "completed" | "cancelled" | "blocked" | undefined;
        location?: string | undefined;
        participants?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "urgent" | undefined;
        dueDate?: Date | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        duration?: number | undefined;
        progress?: number | undefined;
        aiInsights?: z.objectInputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    } & {
        [k: string]: unknown;
    };
    tags: string[];
    source: {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    updatedAt: Date;
    content?: string | undefined;
    '@context'?: string | string[] | Record<string, unknown> | undefined;
    '@type'?: string | string[] | undefined;
    relationships?: {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectInputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }[] | undefined;
    categories?: string[] | undefined;
    archived?: boolean | undefined;
    favorite?: boolean | undefined;
}>;
/**
 * Type inféré depuis le schema Zod
 * Peut être utilisé comme alternative aux interfaces TypeScript importées
 */
export type CartaeItemZod = z.infer<typeof CartaeItemSchema>;
export type CartaeMetadataZod = z.infer<typeof CartaeMetadataSchema>;
export type CartaeRelationshipZod = z.infer<typeof CartaeRelationshipSchema>;
export type AIInsightsZod = z.infer<typeof AIInsightsSchema>;
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
export declare function validateCartaeItem(data: unknown): z.SafeParseReturnType<{
    type: "email" | "file" | "document" | "note" | "message" | "event" | "task" | "contact";
    id: string;
    title: string;
    createdAt: Date;
    metadata: {
        author?: string | undefined;
        status?: "new" | "in_progress" | "pending" | "completed" | "cancelled" | "blocked" | undefined;
        location?: string | undefined;
        participants?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "urgent" | undefined;
        dueDate?: Date | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        duration?: number | undefined;
        progress?: number | undefined;
        aiInsights?: z.objectInputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    } & {
        [k: string]: unknown;
    };
    tags: string[];
    source: {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    updatedAt: Date;
    content?: string | undefined;
    '@context'?: string | string[] | Record<string, unknown> | undefined;
    '@type'?: string | string[] | undefined;
    relationships?: {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectInputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }[] | undefined;
    categories?: string[] | undefined;
    archived?: boolean | undefined;
    favorite?: boolean | undefined;
}, {
    type: "email" | "file" | "document" | "note" | "message" | "event" | "task" | "contact";
    id: string;
    title: string;
    createdAt: Date;
    metadata: {
        author?: string | undefined;
        status?: "new" | "in_progress" | "pending" | "completed" | "cancelled" | "blocked" | undefined;
        location?: string | undefined;
        participants?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "urgent" | undefined;
        dueDate?: Date | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        duration?: number | undefined;
        progress?: number | undefined;
        aiInsights?: z.objectOutputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    } & {
        [k: string]: unknown;
    };
    tags: string[];
    source: {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    updatedAt: Date;
    content?: string | undefined;
    '@context'?: string | string[] | Record<string, unknown> | undefined;
    '@type'?: string | string[] | undefined;
    relationships?: {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectOutputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }[] | undefined;
    categories?: string[] | undefined;
    archived?: boolean | undefined;
    favorite?: boolean | undefined;
}>;
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
export declare function parseCartaeItem(data: unknown): {
    type: "email" | "file" | "document" | "note" | "message" | "event" | "task" | "contact";
    id: string;
    title: string;
    createdAt: Date;
    metadata: {
        author?: string | undefined;
        status?: "new" | "in_progress" | "pending" | "completed" | "cancelled" | "blocked" | undefined;
        location?: string | undefined;
        participants?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "urgent" | undefined;
        dueDate?: Date | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        duration?: number | undefined;
        progress?: number | undefined;
        aiInsights?: z.objectOutputType<{
            sentiment: z.ZodOptional<z.ZodNumber>;
            priorityScore: z.ZodOptional<z.ZodNumber>;
            suggestedTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            connections: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confidence: z.ZodOptional<z.ZodNumber>;
            summary: z.ZodOptional<z.ZodString>;
            entities: z.ZodOptional<z.ZodObject<{
                persons: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                dates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }, {
                persons?: string[] | undefined;
                organizations?: string[] | undefined;
                locations?: string[] | undefined;
                dates?: string[] | undefined;
            }>>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            lastAnalyzedAt: z.ZodOptional<z.ZodDate>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    } & {
        [k: string]: unknown;
    };
    tags: string[];
    source: {
        connector: string;
        originalId: string;
        lastSync: Date;
        url?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    updatedAt: Date;
    content?: string | undefined;
    '@context'?: string | string[] | Record<string, unknown> | undefined;
    '@type'?: string | string[] | undefined;
    relationships?: {
        type: "parent" | "child" | "related" | "references" | "blocks" | "blockedBy" | "duplicates" | "duplicatedBy" | "replaces" | "replacedBy" | "dependsOn" | "requiredBy";
        targetId: string;
        metadata?: z.objectOutputType<{
            strength: z.ZodOptional<z.ZodNumber>;
            createdBy: z.ZodOptional<z.ZodEnum<["user", "ai", "system"]>>;
            createdAt: z.ZodOptional<z.ZodDate>;
            reason: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        bidirectional?: boolean | undefined;
    }[] | undefined;
    categories?: string[] | undefined;
    archived?: boolean | undefined;
    favorite?: boolean | undefined;
};
//# sourceMappingURL=cartaeItem.schema.d.ts.map