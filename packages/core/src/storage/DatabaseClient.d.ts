/**
 * DatabaseClient - Client HTTP pour database-api
 *
 * Client léger pour communiquer avec l'API PostgreSQL créée en Session 75.
 * Gère la connexion, retry logic, et transformation des données.
 *
 * @module storage/DatabaseClient
 */
import type { CartaeItem } from '../types';
/**
 * Configuration du client database
 */
export interface DatabaseClientConfig {
    /** URL de base de l'API (ex: http://localhost:3001) */
    baseUrl: string;
    /** Timeout requêtes HTTP (ms) */
    timeout?: number;
    /** Nombre de retry si échec */
    retries?: number;
    /** Headers custom (ex: Authorization) */
    headers?: Record<string, string>;
}
/**
 * Résultat de recherche avec score
 */
export interface SearchResult {
    item: CartaeItem;
    score: number;
    textScore?: number;
    vectorScore?: number;
}
/**
 * Statistiques DB
 */
export interface DatabaseStats {
    total: number;
    byType: Array<{
        type: string;
        count: number;
    }>;
    withEmbeddings: number;
    withoutEmbeddings: number;
}
/**
 * DatabaseClient - Client HTTP pour database-api
 *
 * Wrapper autour de fetch() avec retry logic et gestion d'erreurs
 */
export declare class DatabaseClient {
    private config;
    constructor(config: DatabaseClientConfig);
    /**
     * Helper - Fetch avec timeout et retry
     */
    private fetchWithRetry;
    /**
     * Helper - Check si erreur est retryable
     */
    private isRetryableError;
    /**
     * POST /api/parse - Parse et stocke un item
     */
    parse(item: CartaeItem): Promise<{
        status: 'created' | 'updated';
        item: CartaeItem;
    }>;
    /**
     * POST /api/parse/batch - Parse multiple items
     */
    parseBatch(items: CartaeItem[]): Promise<{
        message: string;
        results: Array<{
            status: 'created' | 'updated';
            id: string;
        }>;
        summary: {
            created: number;
            updated: number;
        };
    }>;
    /**
     * GET /api/search - Full-text search
     */
    search(query: string, limit?: number): Promise<SearchResult[]>;
    /**
     * GET /api/search?tags=... - Search by tags
     */
    searchByTags(tags: string[], limit?: number): Promise<SearchResult[]>;
    /**
     * POST /api/semantic - Vector similarity search
     */
    semanticSearch(embedding: number[], limit?: number, minSimilarity?: number): Promise<SearchResult[]>;
    /**
     * POST /api/hybrid - Hybrid search (text + vector)
     */
    hybridSearch(text: string, embedding: number[], textWeight?: number, vectorWeight?: number, limit?: number): Promise<SearchResult[]>;
    /**
     * POST /api/hybrid/auto - Auto-weighted hybrid search
     */
    hybridSearchAuto(text: string, embedding: number[], limit?: number): Promise<SearchResult[]>;
    /**
     * GET /api/search/stats - Database statistics
     */
    getStats(): Promise<DatabaseStats>;
    /**
     * GET /health - Health check
     */
    healthCheck(): Promise<{
        status: 'ok' | 'error';
        timestamp: string;
        environment: string;
    }>;
    /**
     * Test la connexion à l'API
     *
     * @returns true si API accessible, false sinon
     */
    testConnection(): Promise<boolean>;
    /**
     * Change la base URL (utile pour tests ou changement de serveur)
     */
    setBaseUrl(baseUrl: string): void;
    /**
     * Set custom headers (ex: Authorization token)
     */
    setHeaders(headers: Record<string, string>): void;
}
//# sourceMappingURL=DatabaseClient.d.ts.map