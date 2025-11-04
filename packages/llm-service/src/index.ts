/**
 * @cartae/llm-service
 *
 * LLM Service abstraction pour Cartae AI plugins
 *
 * Fournit une interface unifiée pour :
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude 3)
 * - Local models (Ollama)
 * - Mock provider (tests)
 *
 * Features :
 * - Rate limiting automatique
 * - Cache des réponses
 * - Fallback providers
 * - Retry logic
 * - TypeScript strict
 *
 * @packageDocumentation
 */

// Service principal
export * from './LLMService.js';

// Types
export * from './types/index.js';

// Providers
export * from './providers/index.js';

// Utilities
export * from './utils/index.js';

// Version
export const VERSION = '1.0.0';
