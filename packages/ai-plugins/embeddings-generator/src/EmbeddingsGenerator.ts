/**
 * Embeddings Generator - Génère des embeddings pour CartaeItems
 */

import type { CartaeItem } from '@cartae/ai-types';
import { CacheManager } from './CacheManager';
import { TextSplitter } from './TextSplitter';
import crypto from 'crypto';

/**
 * Résultat d'une génération d'embedding
 */
export interface EmbeddingResult {
  /** ID de l'item */
  itemId: string;
  /** Texte qui a été embeddings */
  text: string;
  /** Vecteur d'embedding */
  vector: number[];
  /** Index du chunk si texte splitté */
  chunkIndex?: number;
  /** Nombre total de chunks */
  chunkCount?: number;
}

/**
 * Configuration pour EmbeddingsGenerator
 */
export interface EmbeddingsGeneratorConfig {
  /** Dimension des embeddings (défaut: 1536) */
  dimension?: number;
  /** Activer le cache (défaut: true) */
  enableCache?: boolean;
  /** TTL du cache en secondes (défaut: 3600 = 1h) */
  cacheTTL?: number;
  /** Taille maximale du cache (défaut: 10,000 entrées) */
  maxCacheSize?: number;
  /** Taille maximale d'un chunk de texte (défaut: 1000 chars) */
  chunkSize?: number;
  /** Mock mode pour tests (retourne embeddings aléatoires) */
  mockMode?: boolean;
}

/**
 * EmbeddingsGenerator - Génère des embeddings pour CartaeItems
 *
 * Pour MVP utilise des embeddings simulés (mockMode).
 * À remplacer par LLMService pour vrais embeddings (OpenAI, Anthropic, etc.)
 */
export class EmbeddingsGenerator {
  private dimension: number;
  private cache: CacheManager;
  private textSplitter: TextSplitter;
  private mockMode: boolean;
  private generatedCount: number = 0;
  private cachedCount: number = 0;

  constructor(config: EmbeddingsGeneratorConfig = {}) {
    this.dimension = config.dimension ?? 1536;
    this.mockMode = config.mockMode ?? true; // Pour MVP, utiliser mock par défaut
    this.cache = new CacheManager(config.cacheTTL, config.maxCacheSize);
    this.textSplitter = new TextSplitter({
      chunkSize: config.chunkSize,
    });
  }

  /**
   * Génère un embedding pour un CartaeItem
   * @param item CartaeItem à embedder
   * @returns EmbeddingResult avec vecteur
   */
  async generateForItem(item: CartaeItem): Promise<EmbeddingResult> {
    // Préparer le texte (titre + contenu + tags)
    const text = this.prepareText(item);

    // Générer l'embedding
    const vector = await this.getEmbeddingVector(text);

    this.generatedCount++;

    return {
      itemId: item.id,
      text,
      vector,
    };
  }

  /**
   * Génère des embeddings pour plusieurs items (parallèle)
   * @param items CartaeItems à embedder
   * @returns Array d'EmbeddingResults
   */
  async generateForItems(items: CartaeItem[]): Promise<EmbeddingResult[]> {
    return Promise.all(items.map(item => this.generateForItem(item)));
  }

  /**
   * Génère un embedding pour un texte arbitraire
   * @param text Texte à embedder
   * @returns Vecteur d'embedding
   */
  async generateForText(text: string): Promise<number[]> {
    return this.getEmbeddingVector(text);
  }

  /**
   * Prépare le texte d'un CartaeItem pour embedding
   * Combine titre + contenu + tags
   */
  private prepareText(item: CartaeItem): string {
    const parts = [];

    if (item.title) {
      parts.push(`Title: ${item.title}`);
    }

    if (item.content) {
      parts.push(`Content: ${item.content}`);
    }

    if (item.tags && item.tags.length > 0) {
      parts.push(`Tags: ${item.tags.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Récupère ou génère un embedding (avec cache)
   * @private
   */
  private async getEmbeddingVector(text: string): Promise<number[]> {
    // Créer un hash du texte pour la clé de cache
    const key = this.hashText(text);

    // Vérifier le cache
    const cached = this.cache.get(key);
    if (cached) {
      this.cachedCount++;
      return cached;
    }

    // Générer le vecteur
    let vector: number[];

    if (this.mockMode) {
      // Mode mock : générer des embeddings aléatoires mais déterministes
      vector = this.generateMockEmbedding(text);
    } else {
      // Mode réel : appeler un service (à implémenter)
      throw new Error('Mode réel requiert LLMService (non implémenté dans MVP)');
    }

    // Ajouter au cache
    this.cache.set(key, vector);

    return vector;
  }

  /**
   * Génère un embedding mock déterministe basé sur le texte
   * Utilisé pour MVP et tests
   */
  private generateMockEmbedding(text: string): number[] {
    // Utiliser le hash du texte comme seed pour reproduire les résultats
    const seed = this.hashText(text);

    // Générateur pseudo-aléatoire déterministe (basé sur seed)
    let random = this.seededRandom(parseInt(seed, 16));

    // Générer le vecteur
    const vector: number[] = [];
    for (let i = 0; i < this.dimension; i++) {
      vector.push(random() * 2 - 1); // Valeur entre -1 et 1
    }

    // Normaliser le vecteur (magnitude = 1)
    return this.normalizeVector(vector);
  }

  /**
   * Générateur pseudo-aléatoire déterministe (fonction de seed)
   */
  private seededRandom(seed: number) {
    return function() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Normalise un vecteur (magnitude = 1)
   */
  private normalizeVector(vec: number[]): number[] {
    let magnitude = 0;

    for (const v of vec) {
      magnitude += v * v;
    }

    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) {
      return vec;
    }

    return vec.map(v => v / magnitude);
  }

  /**
   * Crée un hash SHA-256 du texte (pour clé de cache)
   */
  private hashText(text: string): string {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Retourne les statistiques de génération
   */
  getStats() {
    return {
      totalGenerated: this.generatedCount,
      totalCached: this.cachedCount,
      cacheStats: this.cache.getStats(),
      mockMode: this.mockMode,
    };
  }

  /**
   * Nettoie le cache des entrées expirées
   */
  cleanupCache(): number {
    return this.cache.cleanup();
  }
}
