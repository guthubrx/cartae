/**
 * Interface et implémentation du Vector Store
 */

import { Vector, SearchResult, VectorStoreConfig, BatchResult } from './types';
import { MockProvider } from './providers/MockProvider';

/**
 * Interface pour les providers de Vector Store
 */
export interface IVectorStoreProvider {
  addVector(vector: Vector): Promise<void>;
  addVectors(vectors: Vector[]): Promise<BatchResult>;
  search(queryVector: number[], limit?: number): Promise<SearchResult[]>;
  searchMultiple(
    queryVectors: number[][],
    limit?: number
  ): Promise<SearchResult[][]>;
  deleteVector(id: string): Promise<void>;
  deleteVectors(ids: string[]): Promise<BatchResult>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * Vector Store - Abstraction pour stockage et recherche vectoriels
 *
 * Fournit une interface unifiée pour différents backends de stockage vectoriel
 * (MockProvider, ChromaDB, Pinecone, Weaviate, etc.)
 */
export class VectorStore implements IVectorStoreProvider {
  private provider: IVectorStoreProvider;
  private dimension: number;

  /**
   * Crée une nouvelle instance de Vector Store
   * @param config Configuration du Vector Store
   */
  constructor(config: VectorStoreConfig) {
    this.dimension = config.dimension || 1536; // Dimension par défaut OpenAI

    switch (config.provider) {
      case 'mock':
        this.provider = new MockProvider(this.dimension);
        break;
      case 'chromadb':
      case 'pinecone':
      case 'weaviate':
        // À implémenter dans les sessions futures
        throw new Error(`Provider ${config.provider} non encore implémenté`);
      default:
        throw new Error(`Provider inconnu: ${config.provider}`);
    }
  }

  /**
   * Ajoute un vecteur au store
   * @param vector Vecteur à ajouter
   */
  async addVector(vector: Vector): Promise<void> {
    return this.provider.addVector(vector);
  }

  /**
   * Ajoute plusieurs vecteurs au store (batch)
   * @param vectors Vecteurs à ajouter
   * @returns Résultat de l'opération batch
   */
  async addVectors(vectors: Vector[]): Promise<BatchResult> {
    return this.provider.addVectors(vectors);
  }

  /**
   * Recherche les vecteurs les plus similaires
   * @param queryVector Vecteur de requête
   * @param limit Nombre maximum de résultats
   * @returns Résultats triés par similarité
   */
  async search(queryVector: number[], limit?: number): Promise<SearchResult[]> {
    return this.provider.search(queryVector, limit);
  }

  /**
   * Recherche multiple (plusieurs requêtes en une seule opération)
   * @param queryVectors Vecteurs de requête
   * @param limit Nombre maximum de résultats par requête
   * @returns Array de résultats pour chaque requête
   */
  async searchMultiple(
    queryVectors: number[][],
    limit?: number
  ): Promise<SearchResult[][]> {
    return this.provider.searchMultiple(queryVectors, limit);
  }

  /**
   * Supprime un vecteur du store
   * @param id ID du vecteur à supprimer
   */
  async deleteVector(id: string): Promise<void> {
    return this.provider.deleteVector(id);
  }

  /**
   * Supprime plusieurs vecteurs (batch)
   * @param ids IDs des vecteurs à supprimer
   * @returns Résultat de l'opération batch
   */
  async deleteVectors(ids: string[]): Promise<BatchResult> {
    return this.provider.deleteVectors(ids);
  }

  /**
   * Compte le nombre total de vecteurs
   * @returns Nombre de vecteurs
   */
  async count(): Promise<number> {
    return this.provider.count();
  }

  /**
   * Vérifie si un vecteur existe
   * @param id ID du vecteur
   * @returns true si existe, false sinon
   */
  async exists(id: string): Promise<boolean> {
    return this.provider.exists(id);
  }

  /**
   * Vide complètement le store
   */
  async clear(): Promise<void> {
    return this.provider.clear();
  }

  /**
   * Retourne la dimension des vecteurs
   * @returns Dimension
   */
  getDimension(): number {
    return this.dimension;
  }
}
