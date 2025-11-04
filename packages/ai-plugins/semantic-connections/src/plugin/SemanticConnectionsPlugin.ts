/**
 * Plugin principal pour la détection de connexions sémantiques
 *
 * Ce plugin implémente l'interface AIPlugin et fournit :
 * - Détection de connexions sémantiques entre CartaeItems
 * - Analyse d'items individuels avec enrichissement AI
 * - Génération d'insights sur les connexions
 * - Construction et gestion du graphe sémantique
 */

import type { CartaeItem } from '@cartae/core';
import type {
  AIPlugin,
  SemanticConnectionsConfig,
  SemanticConnection,
  SemanticGraph,
  ConnectionAnalysis,
  SimilarityAlgorithm,
  SimilarityAlgorithmImplementation,
  Insight,
} from '../types/index.js';

import {
  cosineSimilarityAlgorithm,
  keywordMatchingAlgorithm,
  contextAnalysisAlgorithm,
  combinedAlgorithm,
} from '../algorithms/index.js';

/**
 * Configuration par défaut du plugin
 */
const DEFAULT_CONFIG: Required<SemanticConnectionsConfig> = {
  algorithm: 'combined',
  threshold: 0.3,
  maxConnections: 10,
  weights: {
    cosine: 0.4,
    keyword: 0.3,
    context: 0.3,
  },
  fields: ['title', 'content', 'tags'],
};

/**
 * Semantic Connections Plugin
 */
export class SemanticConnectionsPlugin implements AIPlugin {
  // Manifest requis par interface Plugin
  readonly manifest = {
    id: '@cartae/semantic-connections',
    name: 'Semantic Connections',
    version: '1.0.0',
    description: 'Détecte les connexions sémantiques entre CartaeItems avec TF-IDF et analyse contextuelle',
    author: 'Cartae Team',
    main: './dist/index.js',
    category: 'productivity' as const,
    tags: ['ai', 'semantic', 'connections', 'similarity', 'intelligence'],
    source: 'core' as const,
    pricing: 'free' as const,
  };

  // Identité du plugin
  id = '@cartae/semantic-connections';
  name = 'Semantic Connections';
  version = '1.0.0';
  type = 'analyzer' as const;

  // Configuration
  private config: Required<SemanticConnectionsConfig> = { ...DEFAULT_CONFIG };

  // Map des algorithmes disponibles
  private algorithms = new Map<SimilarityAlgorithm, SimilarityAlgorithmImplementation>([
    ['cosine', cosineSimilarityAlgorithm as SimilarityAlgorithmImplementation],
    ['keyword', keywordMatchingAlgorithm as SimilarityAlgorithmImplementation],
    ['context', contextAnalysisAlgorithm as SimilarityAlgorithmImplementation],
    ['combined', combinedAlgorithm as SimilarityAlgorithmImplementation],
  ]);

  // Graphe sémantique (cache global)
  private graph: SemanticGraph | null = null;

  /**
   * Initialise le plugin
   */
  async activate(): Promise<void> {
    console.log(`[${this.name}] Plugin activé avec algorithme: ${this.config.algorithm}`);
  }

  /**
   * Désactive le plugin et nettoie les caches
   */
  async deactivate(): Promise<void> {
    this.clearCache();
    console.log(`[${this.name}] Plugin désactivé`);
  }

  /**
   * Configure le plugin
   */
  configure(config: SemanticConnectionsConfig): void {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_CONFIG.weights,
        ...config.weights,
      },
    };

    // Configurer l'algorithme combined si utilisé
    if (this.config.algorithm === 'combined') {
      combinedAlgorithm.configure(this.config);
    }

    // Invalider le cache du graphe
    this.graph = null;

    console.log(`[${this.name}] Configuration mise à jour:`, this.config);
  }

  /**
   * Analyse un item et enrichit ses métadonnées AI avec les connexions
   */
  async analyze(item: CartaeItem): Promise<CartaeItem> {
    // Si pas de graphe, on ne peut pas enrichir
    if (!this.graph) {
      console.warn(`[${this.name}] Graphe non construit, appeler buildGraph() d'abord`);
      return item;
    }

    // Récupérer les connexions de cet item
    const connections = this.graph.connections.get(item.id) || [];

    // Enrichir metadata.aiInsights
    const enrichedItem: CartaeItem = {
      ...item,
      metadata: {
        ...item.metadata,
        aiInsights: {
          ...item.metadata.aiInsights,
          connections: connections.map((conn) => conn.toId),
        },
      },
    };

    return enrichedItem;
  }

  /**
   * Trouve les connexions sémantiques entre un item et une collection
   * @returns IDs des items connectés (triés par score décroissant)
   */
  async findConnections(item: CartaeItem, allItems: CartaeItem[]): Promise<string[]> {
    const analysis = await this.analyzeConnections(item, allItems);
    return analysis.connections.map((conn) => conn.toId);
  }

  /**
   * Analyse détaillée des connexions pour un item
   */
  async analyzeConnections(
    item: CartaeItem,
    allItems: CartaeItem[],
  ): Promise<ConnectionAnalysis> {
    const startTime = performance.now();

    // Obtenir l'algorithme sélectionné
    const algorithm = this.algorithms.get(this.config.algorithm);
    if (!algorithm) {
      throw new Error(`Algorithme inconnu: ${this.config.algorithm}`);
    }

    // Si algorithme combined, construire le corpus pour TF-IDF
    if (this.config.algorithm === 'combined') {
      combinedAlgorithm.buildCorpus(allItems);
    } else if (this.config.algorithm === 'cosine') {
      cosineSimilarityAlgorithm.buildCorpus(allItems, this.config.fields);
    }

    // Calculer similarité avec chaque item
    const connections: SemanticConnection[] = [];

    for (const otherItem of allItems) {
      // Ne pas comparer avec soi-même
      if (otherItem.id === item.id) continue;

      // Calculer score de similarité
      const score = algorithm.compute(item, otherItem);

      // Filtrer par seuil
      if (score < this.config.threshold) continue;

      // Générer raisons
      const reasons = algorithm.explain(item, otherItem, score);

      // Créer connexion
      const connection: SemanticConnection = {
        fromId: item.id,
        toId: otherItem.id,
        score,
        algorithm: this.config.algorithm,
        reasons,
        computedAt: new Date(),
        confidence: this.calculateConfidence(score, algorithm.name),
      };

      connections.push(connection);
    }

    // Trier par score décroissant
    connections.sort((a, b) => b.score - a.score);

    // Limiter au nombre maximum
    const limitedConnections = connections.slice(0, this.config.maxConnections);

    // Calculer statistiques
    const scores = limitedConnections.map((c) => c.score);
    const stats = {
      totalFound: limitedConnections.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      computeTimeMs: performance.now() - startTime,
    };

    return {
      item,
      connections: limitedConnections,
      stats,
      analyzedAt: new Date(),
    };
  }

  /**
   * Construit le graphe sémantique complet pour une collection d'items
   */
  async buildGraph(items: CartaeItem[]): Promise<SemanticGraph> {
    console.log(`[${this.name}] Construction graphe pour ${items.length} items...`);

    const connections = new Map<string, SemanticConnection[]>();

    // Analyser chaque item
    for (const item of items) {
      const analysis = await this.analyzeConnections(item, items);
      connections.set(item.id, analysis.connections);
    }

    // Compter connexions totales
    let totalConnections = 0;
    for (const conns of connections.values()) {
      totalConnections += conns.length;
    }

    this.graph = {
      connections,
      totalConnections,
      lastUpdated: new Date(),
      config: this.config,
    };

    console.log(`[${this.name}] Graphe construit: ${totalConnections} connexions`);

    return this.graph;
  }

  /**
   * Obtient le graphe actuel (ou null si pas encore construit)
   */
  getGraph(): SemanticGraph | null {
    return this.graph;
  }

  /**
   * Génère des insights sur les connexions d'une collection
   */
  async generateInsights(items: CartaeItem[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Construire le graphe si pas déjà fait
    if (!this.graph) {
      await this.buildGraph(items);
    }

    if (!this.graph) return insights;

    // Insight 1: Items les plus connectés (hubs)
    const hubsInsight = this.findHubs(items);
    if (hubsInsight) insights.push(hubsInsight);

    // Insight 2: Clusters de connexions fortes
    const clustersInsight = this.findClusters(items);
    if (clustersInsight) insights.push(clustersInsight);

    // Insight 3: Items isolés (peu de connexions)
    const isolatedInsight = this.findIsolatedItems(items);
    if (isolatedInsight) insights.push(isolatedInsight);

    return insights;
  }

  /**
   * Trouve les items "hubs" (très connectés)
   */
  private findHubs(_items: CartaeItem[]): Insight | null {
    if (!this.graph) return null;

    // Compter connexions par item
    const connectionCounts = new Map<string, number>();
    for (const [itemId, connections] of this.graph.connections.entries()) {
      connectionCounts.set(itemId, connections.length);
    }

    // Trouver les 3 items les plus connectés
    const sorted = [...connectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sorted.length === 0 || sorted[0][1] < 3) return null;

    const hubIds = sorted.map(([id]) => id);

    return {
      type: 'cluster',
      title: 'Items centraux détectés',
      description: `${hubIds.length} items sont des hubs (fortement connectés aux autres)`,
      relatedItems: hubIds,
      priority: 7,
      confidence: 0.8,
      data: {
        connectionCounts: Object.fromEntries(sorted),
      },
    };
  }

  /**
   * Trouve les clusters d'items fortement connectés
   */
  private findClusters(items: CartaeItem[]): Insight | null {
    if (!this.graph) return null;

    // Algorithme simplifié de détection de clusters
    // On trouve les groupes d'items qui partagent beaucoup de connexions mutuelles

    const clusters: string[][] = [];
    const visited = new Set<string>();

    for (const item of items) {
      if (visited.has(item.id)) continue;

      const cluster = [item.id];
      visited.add(item.id);

      const connections = this.graph.connections.get(item.id) || [];
      const strongConnections = connections.filter((c) => c.score > 0.6);

      for (const conn of strongConnections) {
        if (!visited.has(conn.toId)) {
          cluster.push(conn.toId);
          visited.add(conn.toId);
        }
      }

      if (cluster.length >= 3) {
        clusters.push(cluster);
      }
    }

    if (clusters.length === 0) return null;

    return {
      type: 'cluster',
      title: `${clusters.length} cluster(s) détecté(s)`,
      description: `Groupes d'items fortement connectés entre eux`,
      relatedItems: clusters.flat(),
      priority: 6,
      confidence: 0.7,
      data: { clusters },
    };
  }

  /**
   * Trouve les items isolés (peu ou pas de connexions)
   */
  private findIsolatedItems(items: CartaeItem[]): Insight | null {
    if (!this.graph) return null;

    const isolated: string[] = [];

    for (const item of items) {
      const connections = this.graph.connections.get(item.id) || [];
      if (connections.length === 0) {
        isolated.push(item.id);
      }
    }

    if (isolated.length === 0) return null;

    return {
      type: 'anomaly',
      title: `${isolated.length} item(s) isolé(s)`,
      description: `Items sans connexions sémantiques détectées`,
      relatedItems: isolated,
      priority: 4,
      confidence: 0.9,
    };
  }

  /**
   * Calcule le niveau de confiance basé sur le score et l'algorithme
   */
  private calculateConfidence(score: number, algorithmName: SimilarityAlgorithm): number {
    // Cosine et Combined sont plus robustes
    const baseConfidence = algorithmName === 'cosine' || algorithmName === 'combined' ? 0.9 : 0.8;

    // Ajuster selon le score
    return baseConfidence * score;
  }

  /**
   * Nettoie les caches
   */
  private clearCache(): void {
    this.graph = null;
    cosineSimilarityAlgorithm.clearCache();
    keywordMatchingAlgorithm.clearCache();
    combinedAlgorithm.clearCache();
  }
}

/**
 * Instance singleton du plugin
 */
export const semanticConnectionsPlugin = new SemanticConnectionsPlugin();
