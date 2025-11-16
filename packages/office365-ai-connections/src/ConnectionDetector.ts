/**
 * ConnectionDetector - Détection de connexions sémantiques via similarité vectorielle
 *
 * Utilise pgvector pour trouver les items les plus similaires sémantiquement
 * et génère des connexions candidates avec scores.
 */

import type { CartaeItem } from '@cartae/core';
import type { DatabaseClient } from '@cartae/database-api';
import type {
  ConnectionDetectionOptions,
  ConnectionDetectionResult,
  ItemConnectionsResult,
} from './types';
import { RelationshipScorer } from './RelationshipScorer';

/**
 * Poids par défaut pour le scoring
 */
const DEFAULT_WEIGHTS = {
  vectorSimilarity: 0.4,
  temporalSimilarity: 0.15,
  sentimentAlignment: 0.1,
  priorityAlignment: 0.1,
  sharedParticipants: 0.15,
  sharedTags: 0.1,
};

/**
 * ConnectionDetector
 *
 * Détecte automatiquement les connexions sémantiques entre items
 * en utilisant la recherche vectorielle (pgvector) et un scoring multi-critères.
 */
export class ConnectionDetector {
  private dbClient: DatabaseClient;

  private scorer: RelationshipScorer;

  constructor(dbClient: DatabaseClient) {
    this.dbClient = dbClient;
    this.scorer = new RelationshipScorer();
  }

  /**
   * Détecte les connexions sémantiques pour un item donné
   *
   * @param sourceItem - Item source pour lequel détecter les connexions
   * @param options - Options de configuration
   * @returns Résultat avec connexions détectées
   */
  async detectConnections(
    sourceItem: CartaeItem,
    options: ConnectionDetectionOptions = {}
  ): Promise<ItemConnectionsResult> {
    const startTime = Date.now();

    // Options par défaut
    const {
      minScore = 0.6,
      maxConnections = 10,
      weights = DEFAULT_WEIGHTS,
      temporalWindowDays = 30,
      itemTypes,
    } = options;

    // Merge des poids
    const finalWeights = { ...DEFAULT_WEIGHTS, ...weights };

    // Vérifier que l'item source a un embedding
    if (!sourceItem.metadata?.ai?.embedding) {
      return {
        item: sourceItem,
        connections: [],
        totalFound: 0,
        executionTime: Date.now() - startTime,
      };
    }

    const embedding = sourceItem.metadata.ai.embedding as number[];

    // Recherche vectorielle via database-api
    // On cherche plus que maxConnections pour compenser le filtrage ultérieur
    const searchResults = await this.dbClient.semanticSearch(embedding, {
      limit: maxConnections * 3,
      minSimilarity: 0.5, // Seuil bas, on va filtrer après avec scoring complet
    });

    // Filtrer fenêtre temporelle si spécifié
    let candidates = searchResults.results
      .filter(result => result.item.id !== sourceItem.id) // Exclure l'item lui-même
      .map(result => ({
        item: result.item,
        vectorSimilarity: result.score, // Score cosine similarity pgvector
      }));

    // Filtrer par type si spécifié
    if (itemTypes && itemTypes.length > 0) {
      candidates = candidates.filter(c => itemTypes.includes(c.item.type));
    }

    // Filtrer fenêtre temporelle
    if (temporalWindowDays > 0) {
      const windowMs = temporalWindowDays * 24 * 60 * 60 * 1000;
      const now = new Date();
      const sourceDate = new Date(sourceItem.createdAt);

      candidates = candidates.filter(c => {
        const targetDate = new Date(c.item.createdAt);
        const diffMs = Math.abs(targetDate.getTime() - sourceDate.getTime());
        return diffMs <= windowMs;
      });
    }

    // Scorer chaque candidat avec tous les critères
    const connections: ConnectionDetectionResult[] = [];

    for (const candidate of candidates) {
      const result = this.scorer.scoreConnection(
        sourceItem,
        candidate.item,
        candidate.vectorSimilarity,
        finalWeights
      );

      // Filtrer par score minimum
      if (result.overallScore >= minScore) {
        connections.push(result);
      }
    }

    // Trier par score décroissant
    connections.sort((a, b) => b.overallScore - a.overallScore);

    // Limiter au max
    const totalFound = connections.length;
    const limitedConnections = connections.slice(0, maxConnections);

    return {
      item: sourceItem,
      connections: limitedConnections,
      totalFound,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Détecte les connexions pour plusieurs items en batch
   *
   * @param items - Items sources
   * @param options - Options de configuration
   * @returns Résultats pour chaque item
   */
  async detectConnectionsBatch(
    items: CartaeItem[],
    options: ConnectionDetectionOptions = {}
  ): Promise<ItemConnectionsResult[]> {
    // Détection séquentielle pour éviter surcharge DB
    // TODO: Optimiser avec batch processing côté DB si nécessaire
    const results: ItemConnectionsResult[] = [];

    for (const item of items) {
      const result = await this.detectConnections(item, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Détecte uniquement la connexion la plus forte pour un item
   *
   * @param sourceItem - Item source
   * @param options - Options de configuration
   * @returns Connexion la plus forte, ou null si aucune trouvée
   */
  async detectStrongestConnection(
    sourceItem: CartaeItem,
    options: ConnectionDetectionOptions = {}
  ): Promise<ConnectionDetectionResult | null> {
    const result = await this.detectConnections(sourceItem, {
      ...options,
      maxConnections: 1,
    });

    return result.connections[0] || null;
  }

  /**
   * Vérifie si deux items sont connectés (similarité au-dessus du seuil)
   *
   * @param itemA - Premier item
   * @param itemB - Second item
   * @param minScore - Score minimum pour considérer connexion (défaut: 0.6)
   * @returns true si items connectés, false sinon
   */
  async areItemsConnected(itemA: CartaeItem, itemB: CartaeItem, minScore = 0.6): Promise<boolean> {
    // Vérifier embeddings
    if (!itemA.metadata?.ai?.embedding || !itemB.metadata?.ai?.embedding) {
      return false;
    }

    const embeddingA = itemA.metadata.ai.embedding as number[];
    const embeddingB = itemB.metadata.ai.embedding as number[];

    // Calculer cosine similarity directement
    const vectorSimilarity = this.cosineSimilarity(embeddingA, embeddingB);

    // Scorer la connexion
    const result = this.scorer.scoreConnection(itemA, itemB, vectorSimilarity, DEFAULT_WEIGHTS);

    return result.overallScore >= minScore;
  }

  /**
   * Calcule la similarité cosinus entre deux vecteurs
   *
   * @param vecA - Premier vecteur
   * @param vecB - Second vecteur
   * @returns Similarité cosinus (0-1)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}
