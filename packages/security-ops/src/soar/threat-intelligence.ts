/**
 * Threat Intelligence (SOAR Component)
 * Session 81g - Incident Response & Security Operations
 *
 * Intégration avec threat intelligence feeds pour enrichir événements:
 * - AbuseIPDB: IP reputation
 * - VirusTotal: File/URL scanning
 * - Custom blacklists
 *
 * Features:
 * - Check IP reputation
 * - Enrich security events avec threat intel
 * - Cache pour performance
 * - Rate limiting API calls
 */

import axios from 'axios';
import NodeCache from 'node-cache';

/**
 * Types
 */
export interface IPReputation {
  ip: string;
  isMalicious: boolean;
  score: number; // 0-100, plus haut = plus malicious
  reports: number;
  categories: string[];
  lastReported: Date | null;
  source: string;
}

export interface ThreatIntelConfig {
  abuseIPDB?: {
    enabled: boolean;
    apiKey: string;
  };
  virusTotal?: {
    enabled: boolean;
    apiKey: string;
  };
  customBlacklists?: string[];
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
  };
}

/**
 * Threat Intelligence Service
 */
export class ThreatIntelligence {
  private config: ThreatIntelConfig;
  private cache: NodeCache | null = null;
  private customBlacklist: Set<string> = new Set();

  // Rate limiting
  private apiCallTimestamps: Map<string, number[]> = new Map();
  private readonly MAX_CALLS_PER_MINUTE = 10;

  constructor(config: ThreatIntelConfig) {
    this.config = config;

    // Initialize cache
    if (config.cache?.enabled) {
      this.cache = new NodeCache({
        stdTTL: config.cache.ttlSeconds || 3600,
        checkperiod: 600,
      });
    }

    // Load custom blacklists
    if (config.customBlacklists) {
      config.customBlacklists.forEach((ip) => this.customBlacklist.add(ip));
    }
  }

  /**
   * Check IP reputation (composite de toutes les sources)
   */
  public async checkIPReputation(ip: string): Promise<IPReputation> {
    // Check cache first
    const cached = this.cache?.get<IPReputation>(ip);
    if (cached) {
      return cached;
    }

    // Check custom blacklist
    if (this.customBlacklist.has(ip)) {
      const result: IPReputation = {
        ip,
        isMalicious: true,
        score: 100,
        reports: 1,
        categories: ['custom_blacklist'],
        lastReported: new Date(),
        source: 'custom',
      };
      this.cache?.set(ip, result);
      return result;
    }

    // Check AbuseIPDB
    if (this.config.abuseIPDB?.enabled) {
      try {
        const abuseResult = await this.checkAbuseIPDB(ip);
        if (abuseResult.isMalicious) {
          this.cache?.set(ip, abuseResult);
          return abuseResult;
        }
      } catch (error) {
        console.error(`[ThreatIntel] AbuseIPDB check failed for ${ip}:`, error);
      }
    }

    // Check VirusTotal (si pas trouvé dans AbuseIPDB)
    if (this.config.virusTotal?.enabled) {
      try {
        const vtResult = await this.checkVirusTotal(ip);
        this.cache?.set(ip, vtResult);
        return vtResult;
      } catch (error) {
        console.error(`[ThreatIntel] VirusTotal check failed for ${ip}:`, error);
      }
    }

    // Default: not malicious
    const result: IPReputation = {
      ip,
      isMalicious: false,
      score: 0,
      reports: 0,
      categories: [],
      lastReported: null,
      source: 'none',
    };

    this.cache?.set(ip, result);
    return result;
  }

  /**
   * Check AbuseIPDB
   */
  private async checkAbuseIPDB(ip: string): Promise<IPReputation> {
    if (!this.config.abuseIPDB?.apiKey) {
      throw new Error('AbuseIPDB API key not configured');
    }

    // Rate limiting
    if (!this.isWithinRateLimit('abuseipdb')) {
      throw new Error('AbuseIPDB rate limit exceeded');
    }

    const response = await axios.get(`https://api.abuseipdb.com/api/v2/check`, {
      params: {
        ipAddress: ip,
        maxAgeInDays: 90,
      },
      headers: {
        Key: this.config.abuseIPDB.apiKey,
        Accept: 'application/json',
      },
    });

    const data = response.data.data;

    return {
      ip,
      isMalicious: data.abuseConfidenceScore > 50,
      score: data.abuseConfidenceScore,
      reports: data.totalReports,
      categories: data.usageType ? [data.usageType] : [],
      lastReported: data.lastReportedAt ? new Date(data.lastReportedAt) : null,
      source: 'abuseipdb',
    };
  }

  /**
   * Check VirusTotal
   */
  private async checkVirusTotal(ip: string): Promise<IPReputation> {
    if (!this.config.virusTotal?.apiKey) {
      throw new Error('VirusTotal API key not configured');
    }

    // Rate limiting
    if (!this.isWithinRateLimit('virustotal')) {
      throw new Error('VirusTotal rate limit exceeded');
    }

    const response = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
      headers: {
        'x-apikey': this.config.virusTotal.apiKey,
      },
    });

    const data = response.data.data.attributes;
    const malicious = data.last_analysis_stats.malicious || 0;
    const total = Object.values(data.last_analysis_stats).reduce(
      (sum: number, count: any) => sum + count,
      0
    );

    const score = total > 0 ? Math.round((malicious / total) * 100) : 0;

    return {
      ip,
      isMalicious: score > 30,
      score,
      reports: malicious,
      categories: data.tags || [],
      lastReported: data.last_analysis_date ? new Date(data.last_analysis_date * 1000) : null,
      source: 'virustotal',
    };
  }

  /**
   * Rate limiting check
   */
  private isWithinRateLimit(service: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Get timestamps for this service
    const timestamps = this.apiCallTimestamps.get(service) || [];

    // Filter to last minute
    const recentCalls = timestamps.filter((ts) => ts > oneMinuteAgo);

    // Check limit
    if (recentCalls.length >= this.MAX_CALLS_PER_MINUTE) {
      return false;
    }

    // Add current call
    recentCalls.push(now);
    this.apiCallTimestamps.set(service, recentCalls);

    return true;
  }

  /**
   * Add IP to custom blacklist
   */
  public addToBlacklist(ip: string): void {
    this.customBlacklist.add(ip);
    this.cache?.del(ip); // Invalidate cache
  }

  /**
   * Remove IP from custom blacklist
   */
  public removeFromBlacklist(ip: string): void {
    this.customBlacklist.delete(ip);
    this.cache?.del(ip);
  }

  /**
   * Get custom blacklist
   */
  public getBlacklist(): string[] {
    return Array.from(this.customBlacklist);
  }

  /**
   * Enrich security event avec threat intel
   */
  public async enrichEvent(event: {
    ip: string;
    [key: string]: any;
  }): Promise<{ reputation: IPReputation; enrichedEvent: any }> {
    const reputation = await this.checkIPReputation(event.ip);

    const enrichedEvent = {
      ...event,
      threatIntel: {
        isMalicious: reputation.isMalicious,
        score: reputation.score,
        reports: reputation.reports,
        categories: reputation.categories,
        source: reputation.source,
      },
    };

    return { reputation, enrichedEvent };
  }

  /**
   * Get cache stats
   */
  public getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    if (!this.cache) {
      return { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 };
    }

    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache?.flushAll();
  }
}

export default ThreatIntelligence;
