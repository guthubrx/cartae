/**
 * Semantic Search Plugin - Plugin AI pour recherche sémantique
 */

import type { CartaeItem, AIPlugin, Insight } from '@cartae/ai-types';
import type { VectorStore } from '@cartae/vector-store';
import type { EmbeddingsGenerator } from '@cartae/embeddings-generator';
import { QueryExpander } from './QueryExpander';
import { ResultRanker } from './ResultRanker';
import type { SemanticSearchConfig, SemanticSearchResult, SearchOptions, IndexResult } from './types';

/**
 * SemanticSearchPlugin - Plugin AI pour recherche sémantique
 *
 * Utilise des embeddings vectoriels pour trouver les CartaeItems
 * les plus similaires à une requête, indépendamment des mots-clés exacts.
 */
export class SemanticSearchPlugin implements AIPlugin {
  // Propriétés AIPlugin obligatoires
  readonly id: string = '@cartae/semantic-search';
  readonly name: string = 'Semantic Search';
  readonly type: 'analyzer' = 'analyzer';
  readonly version: string = '1.0.0';

  // Configuration interne
  private vectorStore: VectorStore;
  private embeddingsGenerator: EmbeddingsGenerator;
  private queryExpander: QueryExpander;
  private resultRanker: ResultRanker;
  private threshold: number;
  private topK: number;
  private expandQuery: boolean;
  private rerank: boolean;

  // État
  private allItems: CartaeItem[] = [];
  private indexed: boolean = false;
  private indexedCount: number = 0;

  /**
   * Crée une nouvelle instance du plugin
   */
  constructor(config: SemanticSearchConfig) {
    this.vectorStore = config.vectorStore;
    this.embeddingsGenerator = config.embeddingsGenerator;
    this.threshold = config.threshold ?? 0.3;
    this.topK = config.topK ?? 10;
    this.expandQuery = config.expandQuery ?? true;
    this.rerank = config.rerank ?? true;

    this.queryExpander = new QueryExpander();
    this.resultRanker = new ResultRanker();
  }

  /**
   * Implémente AIPlugin.analyze()
   * Enrichit un item avec ses connexions sémantiques
   */
  async analyze(item: CartaeItem): Promise<CartaeItem> {
    if (!this.indexed) {
      return item; // Pas indexé, retourner tel quel
    }

    // Générer embedding pour l'item
    const embedding = await this.embeddingsGenerator.generateForItem(item);

    // Rechercher des items similaires
    const similarItems = await this.vectorStore.search(embedding.vector, 5);

    // Enrichir avec les connexions
    return {
      ...item,
      metadata: {
        ...item.metadata,
        aiInsights: {
          ...(item.metadata?.aiInsights || {}),
          semanticConnections: similarItems.map(s => ({
            id: s.id,
            score: s.score,
          })),
          indexedAt: new Date(),
        } as any,
      },
    };
  }

  /**
   * Implémente AIPlugin.findConnections()
   */
  async findConnections(item: CartaeItem, allItems: CartaeItem[]): Promise<string[]> {
    const results = await this.search(item.title, { items: allItems, limit: 5 });
    return results.map(r => r.item.id).filter(id => id !== item.id);
  }

  /**
   * Implémente AIPlugin.generateInsights()
   */
  async generateInsights?(items: CartaeItem[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Insight: Items hautement similaires
    const similarPairs = new Map<string, number>();

    for (const item of items) {
      const results = await this.search(item.title, { items, limit: 3 });

      for (const result of results) {
        if (result.score >= 0.8 && result.item.id !== item.id) {
          const key = [item.id, result.item.id].sort().join('|');
          similarPairs.set(key, Math.max(similarPairs.get(key) ?? 0, result.score));
        }
      }
    }

    if (similarPairs.size > 0) {
      insights.push({
        type: 'connection',
        title: 'Contenus Similaires Détectés',
        description: `${similarPairs.size} paires de contenus très similaires trouvées. Considérez la fusion ou le linking.`,
        relatedItems: Array.from(similarPairs.keys())
          .flat()
          .slice(0, 10),
        priority: 6,
        confidence: 0.8,
      });
    }

    return insights;
  }

  /**
   * Indexe tous les items fournis
   */
  async indexItems(items: CartaeItem[]): Promise<IndexResult> {
    const startTime = Date.now();
    this.allItems = items;

    let indexed = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const item of items) {
      try {
        // Générer embedding
        const embedding = await this.embeddingsGenerator.generateForItem(item);

        // Ajouter au vector store
        await this.vectorStore.addVector({
          id: item.id,
          values: embedding.vector,
          metadata: {
            title: item.title,
            itemId: item.id,
          },
        });

        indexed++;
      } catch (error) {
        errors++;
        errorMessages.push(`Erreur indexation ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.indexed = indexed > 0;
    this.indexedCount = indexed;

    return {
      indexed,
      errors,
      errorMessages,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Recherche sémantiquement
   */
  async search(query: string, options: SearchOptions = {}): Promise<SemanticSearchResult[]> {
    const limit = options.limit ?? this.topK;
    const threshold = options.threshold ?? this.threshold;
    const items = options.items ?? this.allItems;

    // 1. Générer embedding pour la requête
    const queryEmbedding = await this.embeddingsGenerator.generateForText(query);

    // 2. Expanser la requête (optionnel)
    let expandedQueries = [query];
    if (this.expandQuery) {
      expandedQueries = this.queryExpander.expand(query, options.context);
    }

    // 3. Chercher pour chaque requête élargie
    const allResults = new Map<string, number>();

    for (const expandedQuery of expandedQueries) {
      const qEmbedding = await this.embeddingsGenerator.generateForText(expandedQuery);
      const results = await this.vectorStore.search(qEmbedding, limit * 2);

      for (const result of results) {
        const currentScore = allResults.get(result.id) ?? 0;
        allResults.set(result.id, Math.max(currentScore, result.score));
      }
    }

    // 4. Filtrer par seuil
    const filtered = Array.from(allResults.entries())
      .filter(([_, score]) => score >= threshold)
      .map(([id, score]) => ({
        id,
        score,
      }));

    // 5. Re-rank (optionnel)
    let ranked = filtered;
    if (this.rerank) {
      const searchResults = filtered.map(r => ({
        id: r.id,
        score: r.score,
      }));
      ranked = this.resultRanker.rank(searchResults, query, items).map(r => ({
        id: r.id,
        score: r.score,
      }));
    }

    // 6. Mapper vers CartaeItems
    return ranked.slice(0, limit).map(result => ({
      item: items.find(i => i.id === result.id)!,
      score: result.score,
      reason: `Similarité sémantique: ${(result.score * 100).toFixed(1)}%`,
    }));
  }

  /**
   * Retourne les statistiques du plugin
   */
  getStats() {
    return {
      indexed: this.indexed,
      indexedCount: this.indexedCount,
      totalItems: this.allItems.length,
      config: {
        threshold: this.threshold,
        topK: this.topK,
        expandQuery: this.expandQuery,
        rerank: this.rerank,
      },
    };
  }
}
