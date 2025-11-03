/**
 * EmbeddingService - Génère embeddings vectoriels via LLM Service
 * Cache les embeddings localement pour éviter les appels API redondants
 *
 * Workflow :
 * 1. Reçoit texte à embedder
 * 2. Vérifie cache local (Map en mémoire)
 * 3. Si cache hit → retourne embedding immédiatement
 * 4. Si cache miss → appelle LLM Service → stocke en cache
 *
 * Optimisations :
 * - Cache limité à maxCacheSize pour éviter consommation mémoire excessive
 * - Support batch pour embeddings multiples (plus efficace)
 * - Statistiques de performance (hit rate)
 */

import type { EmbeddingOptions, EmbeddingStats } from './types/index.js';

export interface LLMService {
  embed(text: string, options?: { model?: string }): Promise<number[]>;
  embedBatch(texts: string[], options?: { model?: string }): Promise<number[][]>;
}

export class EmbeddingService {
  /** Cache en mémoire : clé = "model:text", valeur = embedding */
  private cache = new Map<string, number[]>();

  /** Compteur de cache hits */
  private hits = 0;

  /** Compteur de cache misses */
  private misses = 0;

  /** Limite de taille du cache (nombre d'embeddings) */
  private readonly maxCacheSize: number;

  /**
   * @param llmService - Service LLM pour générer embeddings
   * @param maxCacheSize - Taille maximale du cache (défaut: 10000)
   */
  constructor(
    private llmService: LLMService,
    maxCacheSize = 10000
  ) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Génère embedding pour un texte
   * Utilise cache local pour éviter appels API redondants
   *
   * @param text - Texte à embedder
   * @param options - Options (model, cacheKey)
   * @returns Vecteur d'embedding (array de floats)
   *
   * @example
   * ```ts
   * const embedding = await service.embed("Mon texte à indexer");
   * // embedding = [0.123, -0.456, 0.789, ...]
   * ```
   */
  async embed(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    const { model = 'text-embedding-3-small', cacheKey } = options;
    const key = cacheKey || `${model}:${text}`;

    // Vérifier cache
    if (this.cache.has(key)) {
      this.hits++;
      return this.cache.get(key)!;
    }

    // Appel API via LLM Service
    this.misses++;
    const embedding = await this.llmService.embed(text, { model });

    // Stocker en cache (avec limite de taille)
    if (this.cache.size < this.maxCacheSize) {
      this.cache.set(key, embedding);
    }

    return embedding;
  }

  /**
   * Génère embeddings en batch (plus efficace que embed() multiple fois)
   * Sépare les textes cached vs non-cached pour optimiser les appels API
   *
   * @param texts - Liste de textes à embedder
   * @param options - Options (model)
   * @returns Liste d'embeddings (même ordre que texts)
   *
   * @example
   * ```ts
   * const embeddings = await service.embedBatch([
   *   "Premier texte",
   *   "Deuxième texte",
   *   "Troisième texte"
   * ]);
   * // embeddings[0] correspond à "Premier texte", etc.
   * ```
   */
  async embedBatch(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const model = options.model || 'text-embedding-3-small';

    // Séparer textes cached vs non-cached
    const cached = new Map<number, number[]>();
    const toFetch: { index: number; text: string }[] = [];

    texts.forEach((text, index) => {
      const key = `${model}:${text}`;
      if (this.cache.has(key)) {
        cached.set(index, this.cache.get(key)!);
        this.hits++;
      } else {
        toFetch.push({ index, text });
      }
    });

    // Fetch non-cached en batch
    let fetched: number[][] = [];
    if (toFetch.length > 0) {
      this.misses += toFetch.length;
      fetched = await this.llmService.embedBatch(
        toFetch.map(t => t.text),
        { model }
      );

      // Stocker en cache
      toFetch.forEach(({ text }, i) => {
        const key = `${model}:${text}`;
        if (this.cache.size < this.maxCacheSize) {
          this.cache.set(key, fetched[i]);
        }
      });
    }

    // Reconstruire résultat dans l'ordre original
    const result: number[][] = new Array(texts.length);
    cached.forEach((embedding, index) => {
      result[index] = embedding;
    });
    toFetch.forEach(({ index }, i) => {
      result[index] = fetched[i];
    });

    return result;
  }

  /**
   * Obtient statistiques du cache
   * Utile pour monitoring et optimisation
   *
   * @returns Statistiques (hits, misses, hit rate, taille cache)
   *
   * @example
   * ```ts
   * const stats = service.getStats();
   * console.log(`Hit rate: ${stats.hitRate * 100}%`);
   * // Output: "Hit rate: 85%"
   * ```
   */
  getStats(): EmbeddingStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Vide le cache et réinitialise les compteurs
   * Utile après changement de modèle ou pour libérer mémoire
   */
  clearCache(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Pré-charge des embeddings en cache
   * Utile au démarrage pour charger embeddings fréquents
   *
   * @param entries - Paires [text, embedding] à pré-charger
   * @param model - Modèle associé
   */
  preloadCache(entries: Array<[string, number[]]>, model = 'text-embedding-3-small'): void {
    entries.forEach(([text, embedding]) => {
      const key = `${model}:${text}`;
      if (this.cache.size < this.maxCacheSize) {
        this.cache.set(key, embedding);
      }
    });
  }

  /**
   * Exporte le cache actuel (pour sauvegarde persistante)
   * Retourne les entrées sous forme de tableau
   */
  exportCache(): Array<{ key: string; embedding: number[] }> {
    return Array.from(this.cache.entries()).map(([key, embedding]) => ({
      key,
      embedding,
    }));
  }

  /**
   * Importe un cache sauvegardé
   * @param entries - Entrées à importer
   */
  importCache(entries: Array<{ key: string; embedding: number[] }>): void {
    entries.forEach(({ key, embedding }) => {
      if (this.cache.size < this.maxCacheSize) {
        this.cache.set(key, embedding);
      }
    });
  }
}
