/**
 * @cartae/vector-store - Vector Store abstraction pour recherche sémantique
 *
 * Fournit une interface unifiée pour stocker et rechercher des embeddings vectoriels.
 * Supporté: MockProvider (en mémoire)
 * Extensible: ChromaDB, Pinecone, Weaviate, etc.
 */

export { VectorStore, type IVectorStoreProvider } from './VectorStore';
export type { Vector, SearchResult, VectorStoreConfig, BatchResult } from './types';
export { cosineSimilarity, normalizeVector, validateDimension } from './utils';
export { MockProvider } from './providers/MockProvider';

// Version
export const VERSION = '1.0.0';
