/**
 * GitHub Plugin Registry
 * Fetches plugin metadata and downloads from GitHub
 */

import { pluginRepositoryManager } from './PluginRepositoryManager';
import { gitHubAuthService } from './GitHubAuthService';

export interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email: string;
  };
  source: 'official' | 'community';
  category: string;
  tags: string[];
  icon?: string;
  downloadUrl: string;
  manifestUrl: string;
  downloads: number;
  rating: number; // 0-5 stars
  reviewCount: number;
  featured: boolean;
  lastUpdated: string;
  // Repository metadata
  repositoryId: string;
  repositoryUrl: string;
  repositoryName: string;
}

export interface PluginRatings {
  rating: number;
  reviewCount: number;
  reviews?: Array<{
    author: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

interface RegistryResponse {
  version: string;
  lastUpdated: string;
  plugins: Omit<PluginRegistryEntry, 'repositoryId' | 'repositoryUrl' | 'repositoryName'>[];
}

const CACHE_KEY = 'cartae-plugin-registry-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: PluginRegistryEntry[];
  timestamp: number;
}

export class GitHubPluginRegistry {
  private cache: CacheEntry | null = null;

  /**
   * Fetch the plugin registry from multiple repositories
   * Uses cache if fresh (< 5min)
   */
  async fetchRegistry(): Promise<PluginRegistryEntry[]> {
    // Check cache
    if (this.cache && Date.now() - this.cache.timestamp < CACHE_TTL) {
      return this.cache.data;
    }

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheEntry: CacheEntry = JSON.parse(cached);
        if (Date.now() - cacheEntry.timestamp < CACHE_TTL) {
          this.cache = cacheEntry;
          return cacheEntry.data;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[GitHubPluginRegistry] Failed to read cache:', error);
    }

    // Fetch from all enabled repositories

    const enabledRepos = pluginRepositoryManager.getEnabledRepositories();
    const allPlugins: PluginRegistryEntry[] = [];

    for (const repo of enabledRepos) {
      try {
        const response = await this.fetchWithRetry(repo.url, 3);
        const responseData = await response.json();

        // GitHub API returns content in base64 for file contents
        // Check if response has GitHub API structure (content + encoding fields)
        let data: RegistryResponse;
        if (responseData.content && responseData.encoding === 'base64') {
          // Decode base64 from GitHub API with proper UTF-8 handling
          const decoded = this.decodeBase64Content(responseData.content);
          data = JSON.parse(decoded);
        } else {
          // Direct JSON response (from raw.githubusercontent.com or direct JSON)
          data = responseData;
        }

        // Add repository metadata to each plugin
        const pluginsWithRepoInfo = data.plugins.map(plugin => ({
          ...plugin,
          repositoryId: repo.id,
          repositoryUrl: repo.url,
          repositoryName: repo.name,
        }));

        allPlugins.push(...pluginsWithRepoInfo);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[GitHubPluginRegistry] Failed to fetch from ${repo.name}:`, error);
        // Continue with other repositories
      }
    }

    // Deduplicate plugins (if same plugin in multiple repos, take the most recent)
    const deduplicatedPlugins = this.deduplicatePlugins(allPlugins);

    // Update cache
    const cacheEntry: CacheEntry = {
      data: deduplicatedPlugins,
      timestamp: Date.now(),
    };
    this.cache = cacheEntry;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));

    return deduplicatedPlugins;
  }

  /**
   * Deduplicate plugins based on ID
   * If same plugin exists in multiple repos, keep the most recent one
   */
  private deduplicatePlugins(plugins: PluginRegistryEntry[]): PluginRegistryEntry[] {
    const pluginMap = new Map<string, PluginRegistryEntry>();

    for (const plugin of plugins) {
      const existingPlugin = pluginMap.get(plugin.id);

      if (!existingPlugin) {
        pluginMap.set(plugin.id, plugin);
      } else {
        // Keep the one with the most recent lastUpdated date
        const existingDate = new Date(existingPlugin.lastUpdated).getTime();
        const newDate = new Date(plugin.lastUpdated).getTime();

        if (newDate > existingDate) {
          pluginMap.set(plugin.id, plugin);
        }
      }
    }

    return Array.from(pluginMap.values());
  }

  /**
   * Download a plugin from GitHub
   */
  async downloadPlugin(id: string): Promise<Blob> {
    const plugins = await this.fetchRegistry();
    const plugin = plugins.find(p => p.id === id);

    if (!plugin) {
      throw new Error(`Plugin not found: ${id}`);
    }

    // Add cache-busting parameter to force fresh download
    const url = new URL(plugin.downloadUrl);
    url.searchParams.set('_t', Date.now().toString());
    const response = await this.fetchWithRetry(url.toString(), 3);

    // Check if response is from GitHub API (base64) or direct file (raw.githubusercontent.com)
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // GitHub API response - content is base64 encoded
      const responseData = await response.json();
      if (responseData.content && responseData.encoding === 'base64') {
        const content = this.decodeBase64Content(responseData.content);
        return new Blob([content], { type: 'application/javascript' });
      }
    }

    // Direct file response from raw.githubusercontent.com
    return response.blob();
  }

  /**
   * Get download count for a plugin
   * Uses data from registry.json
   */
  async getDownloadCount(id: string): Promise<number> {
    const plugins = await this.fetchRegistry();
    const plugin = plugins.find(p => p.id === id);
    return plugin?.downloads ?? 0;
  }

  /**
   * Get ratings for a plugin
   * Uses data from registry.json
   */
  async getRatings(id: string): Promise<PluginRatings> {
    const plugins = await this.fetchRegistry();
    const plugin = plugins.find(p => p.id === id);

    if (!plugin) {
      return {
        rating: 0,
        reviewCount: 0,
      };
    }

    return {
      rating: plugin.rating,
      reviewCount: plugin.reviewCount,
    };
  }

  /**
   * Get manifest for a plugin
   */
  async getManifest(id: string): Promise<any> {
    const plugins = await this.fetchRegistry();
    const plugin = plugins.find(p => p.id === id);

    if (!plugin) {
      throw new Error(`Plugin not found: ${id}`);
    }

    // Add cache-busting parameter to force fresh download
    const url = new URL(plugin.manifestUrl);
    url.searchParams.set('_t', Date.now().toString());
    const response = await this.fetchWithRetry(url.toString(), 3);
    const responseData = await response.json();

    // GitHub API returns content in base64 for file contents
    // Check if response has GitHub API structure
    if (responseData.content && responseData.encoding === 'base64') {
      // Decode base64 from GitHub API with proper UTF-8 handling
      const decoded = this.decodeBase64Content(responseData.content);
      return JSON.parse(decoded);
    }

    // Direct JSON response (from raw.githubusercontent.com)
    return responseData;
  }

  /**
   * Decode base64 content from GitHub API with proper UTF-8 handling
   */
  private decodeBase64Content(base64Content: string): string {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    retries: number,
    backoff: number = 1000
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        // Get GitHub token for private repos
        const user = gitHubAuthService.getUser();
        const token = gitHubAuthService.getToken();

        const headers: Record<string, string> = {
          Accept: 'application/json',
        };

        let fetchUrl = url;

        // Convert raw.githubusercontent.com to GitHub API ONLY if we have auth
        // (for private repos - public repos work fine with raw.githubusercontent.com)
        if (token && user && url.includes('raw.githubusercontent.com')) {
          const match = url.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/);
          if (match) {
            const [, owner, repo, branch, path] = match;
            fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
            headers.Authorization = `token ${token}`;
          }
        }

        const response = await fetch(fetchUrl, { headers });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        if (i === retries - 1) throw error;

        const delay = backoff * 2 ** i; // Exponential backoff
        // eslint-disable-next-line no-console
        console.warn(`[GitHubPluginRegistry] Retry ${i + 1}/${retries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed after all retries');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    localStorage.removeItem(CACHE_KEY);
  }
}

// Singleton instance
export const gitHubPluginRegistry = new GitHubPluginRegistry();
