/**
 * DatabaseClient - Client HTTP pour database-api
 *
 * Client léger pour communiquer avec l'API PostgreSQL créée en Session 75.
 * Gère la connexion, retry logic, et transformation des données.
 *
 * @module storage/DatabaseClient
 */
/**
 * DatabaseClient - Client HTTP pour database-api
 *
 * Wrapper autour de fetch() avec retry logic et gestion d'erreurs
 */
export class DatabaseClient {
    config;
    constructor(config) {
        this.config = {
            timeout: 5000,
            retries: 3,
            headers: {},
            ...config,
        };
    }
    /**
     * Helper - Fetch avec timeout et retry
     */
    async fetchWithRetry(url, options = {}, retriesLeft = this.config.retries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                    ...options.headers,
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (retriesLeft > 0 && this.isRetryableError(error)) {
                // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, 1000 * (this.config.retries - retriesLeft + 1)));
                return this.fetchWithRetry(url, options, retriesLeft - 1);
            }
            throw error;
        }
    }
    /**
     * Helper - Check si erreur est retryable
     */
    isRetryableError(error) {
        // Network errors, timeouts, 5xx server errors
        return (error.name === 'AbortError' ||
            error.message?.includes('fetch') ||
            error.message?.includes('500') ||
            error.message?.includes('502') ||
            error.message?.includes('503'));
    }
    // ==========================================================================
    // API Methods - CRUD
    // ==========================================================================
    /**
     * POST /api/parse - Parse et stocke un item
     */
    async parse(item) {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/parse`, {
            method: 'POST',
            body: JSON.stringify(item),
        });
        return response.json();
    }
    /**
     * POST /api/parse/batch - Parse multiple items
     */
    async parseBatch(items) {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/parse/batch`, {
            method: 'POST',
            body: JSON.stringify({ items }),
        });
        return response.json();
    }
    // ==========================================================================
    // API Methods - Search
    // ==========================================================================
    /**
     * GET /api/search - Full-text search
     */
    async search(query, limit = 20) {
        const params = new URLSearchParams({ q: query, limit: limit.toString() });
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/search?${params}`);
        const data = await response.json();
        return data.results;
    }
    /**
     * GET /api/search?tags=... - Search by tags
     */
    async searchByTags(tags, limit = 100) {
        const params = new URLSearchParams({
            tags: tags.join(','),
            limit: limit.toString(),
        });
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/search?${params}`);
        const data = await response.json();
        return data.results;
    }
    /**
     * POST /api/semantic - Vector similarity search
     */
    async semanticSearch(embedding, limit = 20, minSimilarity = 0.7) {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/semantic`, {
            method: 'POST',
            body: JSON.stringify({ embedding, limit, minSimilarity }),
        });
        const data = await response.json();
        return data.results;
    }
    /**
     * POST /api/hybrid - Hybrid search (text + vector)
     */
    async hybridSearch(text, embedding, textWeight = 0.5, vectorWeight = 0.5, limit = 20) {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/hybrid`, {
            method: 'POST',
            body: JSON.stringify({ text, embedding, textWeight, vectorWeight, limit }),
        });
        const data = await response.json();
        return data.results;
    }
    /**
     * POST /api/hybrid/auto - Auto-weighted hybrid search
     */
    async hybridSearchAuto(text, embedding, limit = 20) {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/hybrid/auto`, {
            method: 'POST',
            body: JSON.stringify({ text, embedding, limit }),
        });
        const data = await response.json();
        return data.results;
    }
    // ==========================================================================
    // API Methods - Stats
    // ==========================================================================
    /**
     * GET /api/search/stats - Database statistics
     */
    async getStats() {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/search/stats`);
        return response.json();
    }
    /**
     * GET /health - Health check
     */
    async healthCheck() {
        const response = await this.fetchWithRetry(`${this.config.baseUrl}/health`);
        return response.json();
    }
    // ==========================================================================
    // Utilities
    // ==========================================================================
    /**
     * Test la connexion à l'API
     *
     * @returns true si API accessible, false sinon
     */
    async testConnection() {
        try {
            await this.healthCheck();
            return true;
        }
        catch (error) {
            console.error('Database API connection failed:', error);
            return false;
        }
    }
    /**
     * Change la base URL (utile pour tests ou changement de serveur)
     */
    setBaseUrl(baseUrl) {
        this.config.baseUrl = baseUrl;
    }
    /**
     * Set custom headers (ex: Authorization token)
     */
    setHeaders(headers) {
        this.config.headers = { ...this.config.headers, ...headers };
    }
}
//# sourceMappingURL=DatabaseClient.js.map