/**
 * QdrantVectorStore - Implémentation VectorStore via Qdrant
 *
 * Qdrant : Vector database open-source, self-hosted, performante
 * - Supporte cosine similarity, dot product, euclidean distance
 * - API REST + gRPC
 * - Filtres complexes sur metadata
 * - Scalable (clustering, sharding)
 *
 * Architecture :
 * - Collection = ensemble de points vectoriels
 * - Point = {id, vector, payload (metadata)}
 * - Index HNSW pour recherche rapide
 *
 * Workflow :
 * 1. Initialiser client Qdrant
 * 2. Créer collection si n'existe pas
 * 3. CRUD operations sur points
 * 4. Similarity search avec filtres
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type {
  VectorStore,
  SearchResult,
  CartaeItemMetadata,
  FilterCondition,
  VectorStoreStats,
  SearchOptions,
} from '@cartae/vector-store';
import type { EmbeddingService } from '@cartae/embedding-service';

/**
 * Configuration pour Qdrant
 */
export interface QdrantConfig {
  /** URL du serveur Qdrant (ex: http://localhost:6333) */
  url: string;

  /** Clé API (optionnel, pour Qdrant Cloud) */
  apiKey?: string;

  /** Nom de la collection Qdrant */
  collectionName: string;

  /** Dimension des vecteurs (défaut: 1536 pour text-embedding-3-small) */
  vectorSize?: number;

  /** Distance metric (défaut: cosine) */
  distance?: 'cosine' | 'dot' | 'euclidean';
}

/**
 * Implémentation VectorStore via Qdrant
 */
export class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;

  private collectionName: string;

  private vectorSize: number;

  private distance: 'Cosine' | 'Dot' | 'Euclid';

  private embeddingService?: EmbeddingService;

  constructor(config: QdrantConfig, embeddingService?: EmbeddingService) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });

    this.collectionName = config.collectionName;
    this.vectorSize = config.vectorSize || 1536;
    this.embeddingService = embeddingService;

    // Mapper distance type
    const distanceMap = {
      cosine: 'Cosine' as const,
      dot: 'Dot' as const,
      euclidean: 'Euclid' as const,
    };
    this.distance = distanceMap[config.distance || 'cosine'];
  }

  /**
   * Initialise la collection Qdrant
   * Crée la collection si elle n'existe pas
   */
  async initialize(): Promise<void> {
    try {
      // Vérifier si collection existe
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        // Créer collection
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: this.distance,
          },
          // Optimisation : index HNSW pour recherche rapide
          hnsw_config: {
            m: 16,
            ef_construct: 100,
          },
        });
      }
    } catch (error) {
      throw new Error(
        `Échec initialisation Qdrant: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Ajoute un item au vector store
   */
  async add(id: string, vector: number[], metadata: CartaeItemMetadata): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload: metadata,
        },
      ],
    });
  }

  /**
   * Ajoute plusieurs items en batch (plus efficace)
   */
  async addBatch(
    items: Array<{
      id: string;
      vector: number[];
      metadata: CartaeItemMetadata;
    }>
  ): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: items.map(item => ({
        id: item.id,
        vector: item.vector,
        payload: item.metadata,
      })),
    });
  }

  /**
   * Recherche items similaires
   * Supporte recherche par texte (si EmbeddingService fourni) ou par vecteur
   */
  async search(query: string | number[], options: SearchOptions): Promise<SearchResult[]> {
    // Si query est un texte, embedder d'abord
    let queryVector: number[];
    if (typeof query === 'string') {
      if (!this.embeddingService) {
        throw new Error(
          'EmbeddingService requis pour recherche par texte. ' +
            'Soit passer un vecteur, soit fournir EmbeddingService au constructeur.'
        );
      }
      queryVector = await this.embeddingService.embed(query);
    } else {
      queryVector = query;
    }

    // Construire filtres Qdrant
    const filter = options.filter ? this.buildQdrantFilter(options.filter) : undefined;

    // Recherche similarity
    const results = await this.client.search(this.collectionName, {
      vector: queryVector,
      limit: options.topK,
      filter,
      with_payload: true,
      score_threshold: options.minSimilarity,
    });

    // Mapper résultats
    return results.map(result => ({
      id: String(result.id),
      similarity: result.score,
      metadata: result.payload as CartaeItemMetadata,
    }));
  }

  /**
   * Récupère un item par son ID
   */
  async get(id: string): Promise<SearchResult | null> {
    const results = await this.client.retrieve(this.collectionName, {
      ids: [id],
      with_payload: true,
      with_vector: false,
    });

    if (results.length === 0) {
      return null;
    }

    return {
      id: String(results[0].id),
      similarity: 1.0, // Pas de score pour retrieve
      metadata: results[0].payload as CartaeItemMetadata,
    };
  }

  /**
   * Supprime un item
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
  }

  /**
   * Supprime plusieurs items en batch
   */
  async deleteBatch(ids: string[]): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: ids,
    });
  }

  /**
   * Met à jour metadata d'un item (vecteur reste inchangé)
   */
  async updateMetadata(id: string, metadata: Partial<CartaeItemMetadata>): Promise<void> {
    await this.client.setPayload(this.collectionName, {
      wait: true,
      payload: metadata,
      points: [id],
    });
  }

  /**
   * Obtient statistiques de la collection
   */
  async getStats(): Promise<VectorStoreStats> {
    const info = await this.client.getCollection(this.collectionName);

    return {
      totalPoints: info.points_count || 0,
      collectionName: this.collectionName,
      vectorDimension: this.vectorSize,
      indexedAt: Date.now(),
    };
  }

  /**
   * Vide la collection (supprime tous les points)
   */
  async clear(): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {}, // Filtre vide = tous les points
    });
  }

  /**
   * Vérifie santé de Qdrant
   */
  async health(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crée un snapshot de la collection (backup)
   */
  async snapshot(): Promise<string> {
    const result = await this.client.createSnapshot(this.collectionName);
    return result.name;
  }

  /**
   * Restaure depuis un snapshot
   * Note : Nécessite accès filesystem du serveur Qdrant
   */
  async restore(snapshotId: string): Promise<void> {
    // À implémenter selon besoin
    // Nécessite API Qdrant pour restore
    throw new Error('Restore non implémenté (nécessite accès filesystem Qdrant)');
  }

  /**
   * Construit un filtre Qdrant depuis FilterCondition[]
   * Convertit format abstrait → format Qdrant
   */
  private buildQdrantFilter(conditions: FilterCondition[]): any {
    // Qdrant utilise structure : { must: [...], should: [...], must_not: [...] }
    // On implémente AND logique avec "must"

    const must = conditions.map(condition => {
      const { field, operator, value } = condition;

      // Mapper opérateurs
      switch (operator) {
        case 'eq':
          return { key: field, match: { value } };
        case 'neq':
          return { key: field, match: { value, exclude: true } };
        case 'gt':
          return { key: field, range: { gt: value } };
        case 'gte':
          return { key: field, range: { gte: value } };
        case 'lt':
          return { key: field, range: { lt: value } };
        case 'lte':
          return { key: field, range: { lte: value } };
        case 'in':
          return { key: field, match: { any: value } };
        case 'contains':
          // Pour arrays (ex: tags)
          return { key: field, match: { value } };
        default:
          throw new Error(`Opérateur non supporté: ${operator}`);
      }
    });

    return { must };
  }
}
