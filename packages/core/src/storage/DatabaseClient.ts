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
  byType: Array<{ type: string; count: number }>;
  withEmbeddings: number;
  withoutEmbeddings: number;
}

/**
 * DatabaseClient - Client HTTP pour database-api
 *
 * Wrapper autour de fetch() avec retry logic et gestion d'erreurs
 */
export class DatabaseClient {
  private config: Required<DatabaseClientConfig>;

  constructor(config: DatabaseClientConfig) {
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
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retriesLeft: number = this.config.retries
  ): Promise<Response> {
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
    } catch (error) {
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
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, 5xx server errors
    return (
      error.name === 'AbortError' ||
      error.message?.includes('fetch') ||
      error.message?.includes('500') ||
      error.message?.includes('502') ||
      error.message?.includes('503')
    );
  }

  // ==========================================================================
  // API Methods - CRUD
  // ==========================================================================

  /**
   * POST /api/parse - Parse et stocke un item
   */
  async parse(item: CartaeItem): Promise<{ status: 'created' | 'updated'; item: CartaeItem }> {
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/parse`, {
      method: 'POST',
      body: JSON.stringify(item),
    });

    return response.json();
  }

  /**
   * POST /api/parse/batch - Parse multiple items
   */
  async parseBatch(items: CartaeItem[]): Promise<{
    message: string;
    results: Array<{ status: 'created' | 'updated'; id: string }>;
    summary: { created: number; updated: number };
  }> {
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
  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/search?${params}`);

    const data = await response.json();
    return data.results;
  }

  /**
   * GET /api/search?tags=... - Search by tags
   */
  async searchByTags(tags: string[], limit: number = 100): Promise<SearchResult[]> {
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
  async semanticSearch(
    embedding: number[],
    limit: number = 20,
    minSimilarity: number = 0.7
  ): Promise<SearchResult[]> {
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
  async hybridSearch(
    text: string,
    embedding: number[],
    textWeight: number = 0.5,
    vectorWeight: number = 0.5,
    limit: number = 20
  ): Promise<SearchResult[]> {
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
  async hybridSearchAuto(text: string, embedding: number[], limit: number = 20): Promise<SearchResult[]> {
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
  async getStats(): Promise<DatabaseStats> {
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/search/stats`);
    return response.json();
  }

  /**
   * GET /health - Health check
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: string; environment: string }> {
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
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Database API connection failed:', error);
      return false;
    }
  }

  /**
   * Change la base URL (utile pour tests ou changement de serveur)
   */
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  /**
   * Set custom headers (ex: Authorization token)
   */
  setHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }
}
