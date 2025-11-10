/**
 * CacheService - Système de cache centralisé avec TTL
 *
 * Gère le cache en mémoire pour toutes les données O365
 * Réduit les requêtes API et améliore les performances
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live en ms
}

/**
 * TTL par défaut pour différents types de données (en ms)
 */
export const CacheTTL = {
  MESSAGES: 5 * 60 * 1000,      // 5 minutes - Messages Teams/Email
  CHATS_LIST: 2 * 60 * 1000,    // 2 minutes - Liste conversations
  PHOTOS: 60 * 60 * 1000,       // 1 heure - Photos utilisateurs
  DOCUMENTS: 10 * 60 * 1000,    // 10 minutes - Documents SharePoint
  THUMBNAILS: 30 * 60 * 1000,   // 30 minutes - Thumbnails
  PLANS: 15 * 60 * 1000,        // 15 minutes - Plans Planner
  TASKS: 5 * 60 * 1000,         // 5 minutes - Tâches Planner
  USER_INFO: 60 * 60 * 1000,    // 1 heure - Infos utilisateurs
  FOLDERS: 30 * 60 * 1000,      // 30 minutes - Dossiers emails
} as const;

/**
 * Service de cache avec TTL
 */
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingPromises = new Map<string, Promise<any>>();
  private cleanupInterval: number | null = null;

  constructor() {
    // Nettoyage automatique toutes les 5 minutes
    this.startCleanup();
  }

  /**
   * Récupère une valeur du cache
   * Retourne null si absente ou expirée
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Vérifier si expiré
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stocke une valeur dans le cache avec TTL
   */
  set<T>(key: string, data: T, ttl: number = CacheTTL.MESSAGES): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalide toutes les clés commençant par un préfixe
   * Exemple: invalidatePrefix('teams:chat:') supprime tous les messages de chats
   */
  invalidatePrefix(prefix: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Récupère ou charge une donnée avec cache automatique
   * Pattern: "cache-aside" avec protection contre les appels concurrents
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CacheTTL.MESSAGES
  ): Promise<T> {
    // Vérifier le cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Vérifier si une requête est déjà en cours pour cette clé
    const pending = this.pendingPromises.get(key);
    if (pending) {
      // Attendre la promesse existante au lieu de lancer une nouvelle requête
      return pending as Promise<T>;
    }

    // Créer la promesse et la stocker
    const promise = (async () => {
      try {
        // Charger depuis l'API
        const data = await fetchFn();

        // Stocker dans le cache
        this.set(key, data, ttl);

        return data;
      } finally {
        // Retirer la promesse de la liste des en-cours
        this.pendingPromises.delete(key);
      }
    })();

    // Stocker la promesse en cours
    this.pendingPromises.set(key, promise);

    return promise;
  }

  /**
   * Retourne les statistiques du cache
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries: Array<{ key: string; age: number; ttl: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl,
      });
    }

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Démarre le nettoyage automatique des entrées expirées
   */
  private startCleanup(): void {
    if (this.cleanupInterval !== null) return;

    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[CacheService] Nettoyage : ${keysToDelete.length} entrées expirées supprimées`);
    }
  }

  /**
   * Arrête le nettoyage automatique
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Instance singleton du cache
 */
export const globalCache = new CacheService();
