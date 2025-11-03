/**
 * @cartae/vector-store
 *
 * Interfaces abstraites pour stockage vectoriel
 * Permet de changer d'implémentation (Qdrant, Pinecone, Milvus) sans toucher le code métier
 */

export type {
  CartaeItemMetadata,
  FilterCondition,
  SearchResult,
  VectorStoreStats,
  SearchOptions,
  VectorStore,
} from './types.js';
