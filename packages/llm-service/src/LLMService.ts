/**
 * LLM Service - Service principal pour interactions avec LLMs
 *
 * Fournit :
 * - Interface unifiée pour différents providers (OpenAI, Anthropic, local, mock)
 * - Rate limiting automatique
 * - Cache des réponses
 * - Fallback automatique
 * - Retry logic
 */

import type {
  ILLMProvider,
  LLMServiceConfig,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMProvider,
  LLMModel,
} from './types/index.js';
import { LLMError, RateLimitError } from './types/index.js';
import { RateLimiter } from './utils/RateLimiter.js';
import { ResponseCache } from './utils/ResponseCache.js';

/**
 * LLM Service
 */
export class LLMService {
  private primaryProvider: ILLMProvider;
  private fallbackProviders: ILLMProvider[] = [];
  private rateLimiters = new Map<LLMProvider, RateLimiter>();
  private cache: ResponseCache;
  private config: LLMServiceConfig;

  constructor(config: LLMServiceConfig, primaryProvider: ILLMProvider, fallbackProviders: ILLMProvider[] = []) {
    this.config = {
      enableCache: true,
      cacheTTL: 3600, // 1h
      verbose: false,
      ...config,
    };

    this.primaryProvider = primaryProvider;
    this.fallbackProviders = fallbackProviders;

    // Initialiser rate limiters
    this.initializeRateLimiters();

    // Initialiser cache
    this.cache = new ResponseCache(this.config.cacheTTL ?? 3600);

    if (this.config.verbose) {
      console.log('[LLMService] Initialized with primary provider:', primaryProvider.name);
    }
  }

  /**
   * Initialise les rate limiters pour chaque provider
   */
  private initializeRateLimiters(): void {
    const primaryLimit = this.config.primary.rateLimit ?? 60;
    this.rateLimiters.set(
      this.primaryProvider.name,
      new RateLimiter(primaryLimit, 60000), // X requêtes par minute
    );

    for (const fallback of this.fallbackProviders) {
      const limit = this.config.fallbacks?.find((f) => f.provider === fallback.name)?.rateLimit ?? 60;
      this.rateLimiters.set(fallback.name, new RateLimiter(limit, 60000));
    }
  }

  /**
   * Génère une completion
   *
   * @param messages Messages de la conversation
   * @param options Options de génération
   * @returns Réponse du LLM
   */
  async complete(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    // Vérifier cache si activé
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(messages, options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        if (this.config.verbose) {
          console.log('[LLMService] Cache hit');
        }
        return cached;
      }
    }

    // Tenter avec provider principal
    try {
      const response = await this.completeWithProvider(this.primaryProvider, messages, options);

      // Mettre en cache si activé
      if (this.config.enableCache) {
        const cacheKey = this.getCacheKey(messages, options);
        this.cache.set(cacheKey, response);
      }

      return response;
    } catch (error) {
      if (this.config.verbose) {
        console.warn('[LLMService] Primary provider failed:', error);
      }

      // Tenter fallbacks
      for (const fallbackProvider of this.fallbackProviders) {
        try {
          if (this.config.verbose) {
            console.log('[LLMService] Trying fallback:', fallbackProvider.name);
          }

          const response = await this.completeWithProvider(fallbackProvider, messages, options);

          // Mettre en cache
          if (this.config.enableCache) {
            const cacheKey = this.getCacheKey(messages, options);
            this.cache.set(cacheKey, response);
          }

          return response;
        } catch (fallbackError) {
          if (this.config.verbose) {
            console.warn('[LLMService] Fallback provider failed:', fallbackError);
          }
          continue;
        }
      }

      // Tous les providers ont échoué
      throw new LLMError(
        'All LLM providers failed',
        this.primaryProvider.name,
        undefined,
        error,
      );
    }
  }

  /**
   * Génère une completion avec un provider spécifique
   */
  private async completeWithProvider(
    provider: ILLMProvider,
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse> {
    // Vérifier rate limit
    const rateLimiter = this.rateLimiters.get(provider.name);
    if (rateLimiter) {
      const allowed = await rateLimiter.checkLimit();
      if (!allowed) {
        throw new RateLimitError(provider.name, rateLimiter.getResetTime());
      }
    }

    // Vérifier disponibilité
    const available = await provider.isAvailable();
    if (!available) {
      throw new LLMError(`Provider ${provider.name} is not available`, provider.name);
    }

    // Appeler provider
    const response = await provider.complete(messages, options);

    // Incrémenter compteur rate limit
    rateLimiter?.increment();

    return response;
  }

  /**
   * Génère une clé de cache basée sur les messages et options
   */
  private getCacheKey(messages: LLMMessage[], options?: LLMRequestOptions): string {
    const messagesStr = JSON.stringify(messages);
    const optionsStr = JSON.stringify(options ?? {});
    return `${messagesStr}:${optionsStr}`;
  }

  /**
   * Helper : Génère une completion depuis un prompt simple
   */
  async completePrompt(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMRequestOptions,
  ): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.complete(messages, options);
    return response.content;
  }

  /**
   * Helper : Parse réponse JSON du LLM
   */
  async completeJSON<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMRequestOptions,
  ): Promise<T> {
    const content = await this.completePrompt(
      `${systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`,
      userPrompt,
      options,
    );

    try {
      // Nettoyer markdown si présent
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (error) {
      throw new LLMError(
        `Failed to parse JSON response: ${content}`,
        this.primaryProvider.name,
        undefined,
        error,
      );
    }
  }

  /**
   * Obtient les modèles disponibles du provider principal
   */
  getAvailableModels(): LLMModel[] {
    return this.primaryProvider.getAvailableModels();
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Nettoie le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtient le provider principal
   */
  getPrimaryProvider(): ILLMProvider {
    return this.primaryProvider;
  }

  /**
   * Obtient les providers de fallback
   */
  getFallbackProviders(): ILLMProvider[] {
    return this.fallbackProviders;
  }
}

/**
 * Factory function pour créer un LLMService
 */
export function createLLMService(
  config: LLMServiceConfig,
  primaryProvider: ILLMProvider,
  fallbackProviders?: ILLMProvider[],
): LLMService {
  return new LLMService(config, primaryProvider, fallbackProviders);
}
