/**
 * Cache Manager - LRU cache pour embeddings avec TTL
 */

interface CacheEntry {
  vector: number[];
  timestamp: number;
  hits: number;
}

/**
 * CacheManager - Cache LRU (Least Recently Used) avec TTL
 *
 * Stocke les embeddings en cache pour éviter de les recalculer.
 * Système LRU : supprime les moins utilisés quand la limite est atteinte.
 */
export class CacheManager {
  private cache: Map<string, CacheEntry>;
  private ttl: number; // milliseconds
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Crée un nouveau cache manager
   * @param ttl TTL en secondes (défaut: 1 heure)
   * @param maxSize Taille maximale du cache (défaut: 10,000 entrées)
   */
  constructor(ttl: number = 3600, maxSize: number = 10000) {
    this.cache = new Map();
    this.ttl = ttl * 1000; // Convertir en ms
    this.maxSize = maxSize;
  }

  /**
   * Récupère un embedding du cache
   * @param key Clé de cache (hash du texte)
   * @returns Embedding ou null si pas en cache
   */
  get(key: string): number[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Vérifier TTL
    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Mettre à jour hit count et timestamp (pour LRU)
    entry.hits++;
    entry.timestamp = Date.now();
    this.hits++;
    return entry.vector;
  }

  /**
   * Ajoute un embedding au cache
   * @param key Clé de cache
   * @param vector Embedding vector
   */
  set(key: string, vector: number[]): void {
    // Si on est à la limite, supprimer l'entrée la moins utilisée
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      vector: [...vector], // Copie du vecteur
      timestamp: Date.now(),
      hits: 1,
    });
  }

  /**
   * Supprime l'entrée la moins utilisée (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Préférer supprimer les entrées peu utilisées
      if (entry.hits < lruHits || (entry.hits === lruHits && entry.timestamp < lruTime)) {
        lruKey = key;
        lruHits = entry.hits;
        lruTime = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retourne les statistiques du cache
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      total,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  /**
   * Supprime les entrées expirées (cleanup)
   * @returns Nombre d'entrées supprimées
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}
