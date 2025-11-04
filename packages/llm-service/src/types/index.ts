/**
 * Types for LLM Service
 *
 * Abstraction pour différents fournisseurs de LLM (OpenAI, Anthropic, local models)
 * avec interface unifiée et rate limiting.
 */

/**
 * Fournisseurs LLM supportés
 */
export type LLMProvider = 'openai' | 'anthropic' | 'local' | 'mock';

/**
 * Modèles disponibles par fournisseur
 */
export type LLMModel =
  // OpenAI
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  // Anthropic
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  // Local
  | 'ollama-llama3'
  | 'ollama-mistral'
  // Mock (pour tests)
  | 'mock';

/**
 * Rôle dans une conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Message d'une conversation LLM
 */
export interface LLMMessage {
  /**
   * Rôle (system/user/assistant)
   */
  role: MessageRole;

  /**
   * Contenu textuel du message
   */
  content: string;
}

/**
 * Options pour un appel LLM
 */
export interface LLMRequestOptions {
  /**
   * Modèle à utiliser
   * @default Dépend du provider configuré
   */
  model?: LLMModel;

  /**
   * Température (0-2)
   * 0 = déterministe, 2 = très créatif
   * @default 0.7
   */
  temperature?: number;

  /**
   * Nombre maximum de tokens à générer
   * @default 1000
   */
  maxTokens?: number;

  /**
   * Top-p sampling (0-1)
   * @default 1.0
   */
  topP?: number;

  /**
   * Stop sequences (optionnel)
   */
  stop?: string[];

  /**
   * Timeout en ms
   * @default 30000 (30s)
   */
  timeout?: number;
}

/**
 * Réponse d'un appel LLM
 */
export interface LLMResponse {
  /**
   * Contenu textuel généré
   */
  content: string;

  /**
   * Modèle utilisé
   */
  model: LLMModel;

  /**
   * Provider utilisé
   */
  provider: LLMProvider;

  /**
   * Usage tokens
   */
  usage?: {
    /**
     * Tokens dans le prompt
     */
    promptTokens: number;

    /**
     * Tokens générés
     */
    completionTokens: number;

    /**
     * Total tokens
     */
    totalTokens: number;
  };

  /**
   * Timestamp de la requête
   */
  timestamp: Date;

  /**
   * Durée de la requête en ms
   */
  durationMs: number;
}

/**
 * Configuration d'un provider LLM
 */
export interface LLMProviderConfig {
  /**
   * Type de provider
   */
  provider: LLMProvider;

  /**
   * API key (optionnel selon provider)
   */
  apiKey?: string;

  /**
   * Base URL (pour providers custom/local)
   */
  baseURL?: string;

  /**
   * Modèle par défaut
   */
  defaultModel?: LLMModel;

  /**
   * Organisation (OpenAI uniquement)
   */
  organization?: string;

  /**
   * Rate limiting (requêtes/minute)
   * @default 60
   */
  rateLimit?: number;

  /**
   * Timeout par défaut (ms)
   * @default 30000
   */
  timeout?: number;
}

/**
 * Configuration globale du LLM Service
 */
export interface LLMServiceConfig {
  /**
   * Provider principal
   */
  primary: LLMProviderConfig;

  /**
   * Providers de fallback (optionnel)
   */
  fallbacks?: LLMProviderConfig[];

  /**
   * Activer le cache des réponses
   * @default true
   */
  enableCache?: boolean;

  /**
   * Durée de vie du cache en secondes
   * @default 3600 (1h)
   */
  cacheTTL?: number;

  /**
   * Activer les logs détaillés
   * @default false
   */
  verbose?: boolean;
}

/**
 * Erreur LLM
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public statusCode?: number,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Erreur de rate limiting
 */
export class RateLimitError extends LLMError {
  constructor(
    provider: LLMProvider,
    public retryAfter?: number,
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Interface provider LLM
 */
export interface ILLMProvider {
  /**
   * Nom du provider
   */
  readonly name: LLMProvider;

  /**
   * Configuration
   */
  readonly config: LLMProviderConfig;

  /**
   * Génère une completion
   */
  complete(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;

  /**
   * Vérifie si le provider est disponible
   */
  isAvailable(): Promise<boolean>;

  /**
   * Obtient les modèles disponibles
   */
  getAvailableModels(): LLMModel[];
}
