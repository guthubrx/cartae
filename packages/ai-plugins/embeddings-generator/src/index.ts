/**
 * @cartae/embeddings-generator - Génération d'embeddings pour CartaeItems
 *
 * Crée des vecteurs d'embeddings à partir de CartaeItems.
 * Support mock pour MVP, extensible pour vrais embeddings via LLMService.
 */

export { EmbeddingsGenerator, type EmbeddingResult, type EmbeddingsGeneratorConfig } from './EmbeddingsGenerator';
export { CacheManager } from './CacheManager';
export { TextSplitter, type TextSplitterConfig } from './TextSplitter';

export const VERSION = '1.0.0';
