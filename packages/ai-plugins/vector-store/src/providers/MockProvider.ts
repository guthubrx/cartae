/**
 * Mock Provider - Implémentation en mémoire du Vector Store
 *
 * Stockage vectoriel simple en mémoire, parfait pour tests et MVP.
 * Utilise la similarité cosinus pour les recherches.
 */

import { Vector, SearchResult, BatchResult } from '../types';
import { cosineSimilarity, validateDimension } from '../utils';
import { IVectorStoreProvider } from '../VectorStore';

export class MockProvider implements IVectorStoreProvider {
  private vectors: Map<string, Vector>;
  private dimension: number;

  /**
   * Crée une nouvelle instance du MockProvider
   * @param dimension Dimension des vecteurs
   */
  constructor(dimension: number = 1536) {
    this.vectors = new Map();
    this.dimension = dimension;
  }

  /**
   * Ajoute un vecteur au store
   */
  async addVector(vector: Vector): Promise<void> {
    validateDimension(vector.values, this.dimension);
    this.vectors.set(vector.id, { ...vector });
  }

  /**
   * Ajoute plusieurs vecteurs (batch)
   */
  async addVectors(vectors: Vector[]): Promise<BatchResult> {
    const result: BatchResult = {
      count: vectors.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const vector of vectors) {
      try {
        validateDimension(vector.values, this.dimension);
        this.vectors.set(vector.id, { ...vector });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Erreur pour ${vector.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * Recherche les vecteurs similaires
   */
  async search(queryVector: number[], limit: number = 10): Promise<SearchResult[]> {
    validateDimension(queryVector, this.dimension);

    const results: SearchResult[] = [];

    // Calculer similarité pour chaque vecteur stocké
    for (const [id, vector] of this.vectors.entries()) {
      const score = cosineSimilarity(queryVector, vector.values);
      results.push({
        id,
        score,
        metadata: vector.metadata,
      });
    }

    // Trier par score décroissant
    results.sort((a, b) => b.score - a.score);

    // Retourner les top-k
    return results.slice(0, limit);
  }

  /**
   * Recherche multiple (plusieurs requêtes)
   */
  async searchMultiple(
    queryVectors: number[][],
    limit: number = 10
  ): Promise<SearchResult[][]> {
    // Traiter chaque vecteur de requête indépendamment
    return Promise.all(
      queryVectors.map(qv => this.search(qv, limit))
    );
  }

  /**
   * Supprime un vecteur
   */
  async deleteVector(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  /**
   * Supprime plusieurs vecteurs (batch)
   */
  async deleteVectors(ids: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      count: ids.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const id of ids) {
      try {
        if (this.vectors.has(id)) {
          this.vectors.delete(id);
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`Vecteur non trouvé: ${id}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Erreur suppression ${id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * Compte le nombre total de vecteurs
   */
  async count(): Promise<number> {
    return this.vectors.size;
  }

  /**
   * Vérifie si un vecteur existe
   */
  async exists(id: string): Promise<boolean> {
    return this.vectors.has(id);
  }

  /**
   * Vide complètement le store
   */
  async clear(): Promise<void> {
    this.vectors.clear();
  }
}
