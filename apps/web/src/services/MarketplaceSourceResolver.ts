/**
 * Marketplace Source Resolver
 * Système de résolution multi-source avec bascule dynamique via Supabase
 *
 * Ce service permet de basculer entre Git et Cloudflare CDN sans rebuild,
 * en lisant la configuration depuis Supabase qui agit comme panneau de contrôle.
 */

import { supabase } from '@/lib/supabase';

/**
 * Types de sources disponibles
 */
export type MarketplaceSourceType = 'git' | 'cloudflare' | 'both';

/**
 * Configuration d'une source
 */
export interface SourceConfig {
  type: MarketplaceSourceType;
  priority: string[]; // Ordre de tentative si 'both': ['cloudflare', 'git']
  gitUrl?: string;
  cloudflareUrl?: string;
  healthCheckEnabled: boolean;
  healthCheckIntervalMs: number;
  fallbackOnError: boolean;
}

/**
 * État de santé d'une source
 */
export interface SourceHealthStatus {
  source: 'git' | 'cloudflare';
  healthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

/**
 * Configuration complète lue depuis Supabase
 */
export interface AppConfig {
  id: string;
  config_key: string;
  config_value: SourceConfig;
  updated_at: string;
  updated_by?: string;
}

/**
 * Statistiques de résolution
 */
export interface ResolverStats {
  totalRequests: number;
  gitRequests: number;
  cloudflareRequests: number;
  fallbacks: number;
  errors: number;
  avgResponseTime: number;
}

/**
 * Service de résolution de source pour le Marketplace
 */
export class MarketplaceSourceResolver {
  private config: SourceConfig | null = null;
  private configLoadedAt: Date | null = null;
  private configCacheTTL = 5 * 60 * 1000; // 5 minutes
  private healthStatus: Map<string, SourceHealthStatus> = new Map();
  private stats: ResolverStats = {
    totalRequests: 0,
    gitRequests: 0,
    cloudflareRequests: 0,
    fallbacks: 0,
    errors: 0,
    avgResponseTime: 0,
  };
  private responseTimes: number[] = [];

  /**
   * Configuration par défaut (Git)
   */
  private readonly defaultConfig: SourceConfig = {
    type: 'git',
    priority: ['git'],
    gitUrl: 'https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json',
    healthCheckEnabled: true,
    healthCheckIntervalMs: 60000, // 1 minute
    fallbackOnError: true,
  };

  constructor() {
    // Lancer les health checks périodiques
    this.startHealthChecks();
  }

  /**
   * Récupère la configuration depuis Supabase
   */
  private async fetchConfig(): Promise<SourceConfig> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('config_key', 'marketplace_source')
        .single();

      if (error) {
        console.warn('[MarketplaceSourceResolver] Failed to fetch config from Supabase:', error);
        return this.defaultConfig;
      }

      if (!data) {
        console.info('[MarketplaceSourceResolver] No config found, using default (Git)');
        return this.defaultConfig;
      }

      const config = (data as AppConfig).config_value;

      // Valider la config
      if (!this.isValidConfig(config)) {
        console.error('[MarketplaceSourceResolver] Invalid config, using default:', config);
        return this.defaultConfig;
      }

      console.info('[MarketplaceSourceResolver] Config loaded:', config.type);
      return config;
    } catch (error) {
      console.error('[MarketplaceSourceResolver] Error fetching config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Valide une configuration
   */
  private isValidConfig(config: any): config is SourceConfig {
    return (
      config &&
      typeof config === 'object' &&
      ['git', 'cloudflare', 'both'].includes(config.type) &&
      Array.isArray(config.priority) &&
      config.priority.length > 0
    );
  }

  /**
   * Obtient la configuration (avec cache)
   */
  private async getConfig(): Promise<SourceConfig> {
    const now = new Date();

    // Utiliser le cache si valide
    if (
      this.config &&
      this.configLoadedAt &&
      now.getTime() - this.configLoadedAt.getTime() < this.configCacheTTL
    ) {
      return this.config;
    }

    // Charger depuis Supabase
    this.config = await this.fetchConfig();
    this.configLoadedAt = now;

    return this.config;
  }

  /**
   * Force le rechargement de la configuration
   */
  public async reloadConfig(): Promise<SourceConfig> {
    this.config = null;
    this.configLoadedAt = null;
    return this.getConfig();
  }

  /**
   * Résout l'URL à utiliser pour une requête
   */
  public async resolveUrl(endpoint: string = ''): Promise<string> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const config = await this.getConfig();

      // Cas simple : une seule source
      if (config.type === 'git') {
        this.stats.gitRequests++;
        const url = this.buildUrl(config.gitUrl!, endpoint);
        this.recordResponseTime(Date.now() - startTime);
        return url;
      }

      if (config.type === 'cloudflare') {
        this.stats.cloudflareRequests++;
        const url = this.buildUrl(config.cloudflareUrl!, endpoint);
        this.recordResponseTime(Date.now() - startTime);
        return url;
      }

      // Cas 'both' : essayer selon la priorité
      if (config.type === 'both') {
        for (const source of config.priority) {
          const health = this.healthStatus.get(source);

          // Si health check activé et source unhealthy, skip
          if (config.healthCheckEnabled && health && !health.healthy) {
            console.warn(`[MarketplaceSourceResolver] Skipping unhealthy source: ${source}`);
            continue;
          }

          const baseUrl = source === 'git' ? config.gitUrl : config.cloudflareUrl;

          if (baseUrl) {
            if (source === 'git') {
              this.stats.gitRequests++;
            } else {
              this.stats.cloudflareRequests++;
            }

            const url = this.buildUrl(baseUrl, endpoint);
            this.recordResponseTime(Date.now() - startTime);
            return url;
          }
        }

        // Aucune source disponible, fallback sur Git
        console.error('[MarketplaceSourceResolver] No healthy source available, fallback to Git');
        this.stats.fallbacks++;
        const url = this.buildUrl(config.gitUrl || this.defaultConfig.gitUrl!, endpoint);
        this.recordResponseTime(Date.now() - startTime);
        return url;
      }

      // Fallback ultime
      this.stats.fallbacks++;
      const url = this.buildUrl(this.defaultConfig.gitUrl!, endpoint);
      this.recordResponseTime(Date.now() - startTime);
      return url;
    } catch (error) {
      this.stats.errors++;
      console.error('[MarketplaceSourceResolver] Error resolving URL:', error);
      const url = this.buildUrl(this.defaultConfig.gitUrl!, endpoint);
      this.recordResponseTime(Date.now() - startTime);
      return url;
    }
  }

  /**
   * Construit une URL complète
   */
  private buildUrl(baseUrl: string, endpoint: string): string {
    // Nettoyer les slashes
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');

    return cleanEndpoint ? `${cleanBase}/${cleanEndpoint}` : cleanBase;
  }

  /**
   * Enregistre le temps de réponse
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);

    // Garder seulement les 100 dernières mesures
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    // Calculer la moyenne
    this.stats.avgResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  /**
   * Effectue un health check sur une source
   */
  private async checkHealth(source: 'git' | 'cloudflare', url: string): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      const responseTime = Date.now() - startTime;
      const healthy = response.ok;

      this.healthStatus.set(source, {
        source,
        healthy,
        lastCheck: new Date(),
        responseTime,
        error: healthy ? undefined : `HTTP ${response.status}`,
      });

      if (!healthy) {
        console.warn(`[MarketplaceSourceResolver] ${source} unhealthy: ${response.status}`);
      }
    } catch (error) {
      this.healthStatus.set(source, {
        source,
        healthy: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error(`[MarketplaceSourceResolver] ${source} health check failed:`, error);
    }
  }

  /**
   * Lance les health checks périodiques
   */
  private startHealthChecks(): void {
    // Health check initial après 10s
    setTimeout(() => this.performHealthChecks(), 10000);

    // Puis périodiquement
    setInterval(() => this.performHealthChecks(), 60000); // Toutes les minutes
  }

  /**
   * Effectue les health checks sur toutes les sources configurées
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const config = await this.getConfig();

      if (!config.healthCheckEnabled) {
        return;
      }

      const checks: Promise<void>[] = [];

      if (config.gitUrl && (config.type === 'git' || config.type === 'both')) {
        checks.push(this.checkHealth('git', config.gitUrl));
      }

      if (config.cloudflareUrl && (config.type === 'cloudflare' || config.type === 'both')) {
        checks.push(this.checkHealth('cloudflare', config.cloudflareUrl));
      }

      await Promise.all(checks);
    } catch (error) {
      console.error('[MarketplaceSourceResolver] Error performing health checks:', error);
    }
  }

  /**
   * Obtient l'état de santé de toutes les sources
   */
  public getHealthStatus(): SourceHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Obtient les statistiques
   */
  public getStats(): ResolverStats {
    return { ...this.stats };
  }

  /**
   * Réinitialise les statistiques
   */
  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      gitRequests: 0,
      cloudflareRequests: 0,
      fallbacks: 0,
      errors: 0,
      avgResponseTime: 0,
    };
    this.responseTimes = [];
  }

  /**
   * Obtient la configuration actuelle (pour l'affichage dans l'admin)
   */
  public async getCurrentConfig(): Promise<SourceConfig> {
    return this.getConfig();
  }
}

/**
 * Instance singleton
 */
export const marketplaceSourceResolver = new MarketplaceSourceResolver();
