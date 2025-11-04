/**
 * Response Cache - Cache des réponses LLM pour éviter requêtes redondantes
 *
 * Implémentation LRU (Least Recently Used) avec TTL
 */

import type { LLMResponse } from '../types/index.js';

interface CacheEntry {
  response: LLMResponse;
  timestamp: number;
  hits: number;
}

export class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // Nombre max d'entrées
  private hits = 0;
  private misses = 0;

  constructor(private ttlSeconds: number) {}

  /**
   * Récupère une réponse depuis le cache
   */
  get(key: string): LLMResponse | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Vérifier expiration
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // en secondes

    if (age > this.ttlSeconds) {
      // Expiré, supprimer
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Hit !
    entry.hits++;
    this.hits++;

    // Mettre à jour timestamp (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.response;
  }

  /**
   * Ajoute une réponse au cache
   */
  set(key: string, response: LLMResponse): void {
    // Si cache plein, supprimer entrée la plus ancienne
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Supprime une entrée
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Nettoie tout le cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Nettoie les entrées expirées
   */
  prune(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > this.ttlSeconds) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100, // Arrondi 2 décimales
      ttlSeconds: this.ttlSeconds,
    };
  }

  /**
   * Obtient la taille actuelle du cache
   */
  getSize(): number {
    return this.cache.size;
  }
}
