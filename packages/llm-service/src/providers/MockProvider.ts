/**
 * Mock Provider pour tests
 *
 * Provider qui simule des réponses LLM sans appeler d'API externe.
 * Utile pour :
 * - Tests unitaires
 * - Développement sans API key
 * - Démos
 */

import type {
  ILLMProvider,
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMModel,
} from '../types/index.js';

/**
 * Configuration du Mock Provider
 */
interface MockProviderConfig extends LLMProviderConfig {
  /**
   * Délai de simulation (ms)
   * @default 100
   */
  delay?: number;

  /**
   * Réponses prédéfinies (optionnel)
   * Map: pattern → response
   */
  responses?: Map<string, string>;
}

/**
 * Mock Provider
 */
export class MockProvider implements ILLMProvider {
  readonly name: LLMProvider = 'mock';
  readonly config: MockProviderConfig;

  private delay: number;
  private responses: Map<string, string>;

  constructor(config: MockProviderConfig) {
    this.config = config;
    this.delay = config.delay ?? 100;
    this.responses = config.responses ?? new Map();

    // Réponses par défaut
    if (this.responses.size === 0) {
      this.setDefaultResponses();
    }
  }

  /**
   * Définit les réponses par défaut
   */
  private setDefaultResponses(): void {
    this.responses.set('sentiment', JSON.stringify({
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.9,
    }));

    this.responses.set('priority', JSON.stringify({
      priority: 7,
      reasoning: 'Task importante avec deadline proche',
    }));

    this.responses.set('tags', JSON.stringify({
      tags: ['#important', '#urgent', '#client'],
      confidence: 0.85,
    }));

    this.responses.set('summary',
      'Résumé mock : Le contenu concerne un projet client avec deadline importante.'
    );

    this.responses.set('connections', JSON.stringify({
      connections: ['item-123', 'item-456'],
      reasons: ['Même sujet', 'Même client'],
    }));
  }

  /**
   * Génère une completion mock
   */
  async complete(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    // Simuler délai réseau
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    // Extraire le contenu du dernier message user
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    const userContent = lastUserMessage?.content.toLowerCase() || '';

    // Trouver réponse prédéfinie
    let content = 'Mock response: No predefined response found.';
    for (const [pattern, response] of this.responses.entries()) {
      if (userContent.includes(pattern.toLowerCase())) {
        content = response;
        break;
      }
    }

    // Si pas de match, générer réponse générique basée sur le système prompt
    if (content.startsWith('Mock response:')) {
      const systemMessage = messages.find((m) => m.role === 'system');
      if (systemMessage?.content.includes('sentiment')) {
        content = this.responses.get('sentiment')!;
      } else if (systemMessage?.content.includes('priority')) {
        content = this.responses.get('priority')!;
      } else if (systemMessage?.content.includes('tag')) {
        content = this.responses.get('tags')!;
      } else if (systemMessage?.content.includes('summary')) {
        content = this.responses.get('summary')!;
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      content,
      model: 'mock',
      provider: 'mock',
      usage: {
        promptTokens: this.countTokens(messages),
        completionTokens: this.countTokens([{ role: 'assistant', content }]),
        totalTokens: this.countTokens([...messages, { role: 'assistant', content }]),
      },
      timestamp: new Date(),
      durationMs,
    };
  }

  /**
   * Vérifie disponibilité (toujours true pour mock)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Obtient les modèles disponibles
   */
  getAvailableModels(): LLMModel[] {
    return ['mock'];
  }

  /**
   * Compte approximativement les tokens (1 token ≈ 4 caractères)
   */
  private countTokens(messages: LLMMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Ajoute une réponse prédéfinie
   */
  addResponse(pattern: string, response: string): void {
    this.responses.set(pattern, response);
  }

  /**
   * Nettoie les réponses prédéfinies
   */
  clearResponses(): void {
    this.responses.clear();
    this.setDefaultResponses();
  }
}

/**
 * Factory function pour créer un Mock Provider
 */
export function createMockProvider(config?: Partial<MockProviderConfig>): MockProvider {
  return new MockProvider({
    provider: 'mock',
    ...config,
  });
}
