/**
 * @cartae/embedding-service
 *
 * Service de génération d'embeddings vectoriels avec cache local
 * Utilise LLM Service pour les appels API et optimise avec un cache en mémoire
 */

export { EmbeddingService } from './EmbeddingService.js';
export type { EmbeddingOptions, EmbeddingStats, EmbeddingResponse } from './types/index.js';
