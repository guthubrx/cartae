/**
 * Plugin Repository Manager
 * Manages multiple plugin sources (GitHub repositories)
 */

import { gitHubAuthService } from './GitHubAuthService';

export interface PluginRepository {
  id: string;
  name: string;
  url: string; // URL to registry.json
  type: 'github' | 'custom';
  enabled: boolean;
  isDefault: boolean;
  description?: string;
  addedAt: string;
}

const STORAGE_KEY = 'cartae-plugin-repositories';
const DEFAULT_REPO_ID = 'cartae-official';

/**
 * Default public repository (always present)
 */
const DEFAULT_REPOSITORY: PluginRepository = {
  id: DEFAULT_REPO_ID,
  name: 'Cartae Official Plugins',
  url: 'https://raw.githubusercontent.com/guthubrx/cartae-plugins/main/registry.json',
  type: 'github',
  enabled: true,
  isDefault: true,
  description: 'Official Cartae plugin repository',
  addedAt: new Date().toISOString(),
};

export class PluginRepositoryManager {
  private repositories: PluginRepository[] = [];

  constructor() {
    this.loadRepositories();
  }

  /**
   * Load repositories from localStorage
   */
  private loadRepositories(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.repositories = JSON.parse(stored);
      } else {
        // First run: initialize with default repo
        this.repositories = [DEFAULT_REPOSITORY];
        this.saveRepositories();
      }

      // Ensure default repo exists
      const hasDefault = this.repositories.some(r => r.id === DEFAULT_REPO_ID);
      if (!hasDefault) {
        this.repositories.unshift(DEFAULT_REPOSITORY);
        this.saveRepositories();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[PluginRepositoryManager] Failed to load repositories:', error);
      this.repositories = [DEFAULT_REPOSITORY];
    }
  }

  /**
   * Save repositories to localStorage
   */
  private saveRepositories(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.repositories));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[PluginRepositoryManager] Failed to save repositories:', error);
    }
  }

  /**
   * Get all repositories
   */
  getAllRepositories(): PluginRepository[] {
    return [...this.repositories];
  }

  /**
   * Get enabled repositories only
   */
  getEnabledRepositories(): PluginRepository[] {
    return this.repositories.filter(r => r.enabled);
  }

  /**
   * Add a new repository
   * @param url GitHub repository URL (raw registry.json)
   * @param name Repository display name
   */
  async addRepository(url: string, name: string, description?: string): Promise<PluginRepository> {
    // Validate URL format
    if (!this.isValidRegistryUrl(url)) {
      throw new Error('Invalid registry URL. Must be a raw GitHub URL to registry.json');
    }

    // Check if already exists
    if (this.repositories.some(r => r.url === url)) {
      throw new Error('Repository already exists');
    }

    // Validate by fetching registry
    await this.validateRepository(url);

    const repository: PluginRepository = {
      id: `repo-${Date.now()}`,
      name,
      url,
      type: url.includes('github') ? 'github' : 'custom',
      enabled: true,
      isDefault: false,
      description,
      addedAt: new Date().toISOString(),
    };

    this.repositories.push(repository);
    this.saveRepositories();

    return repository;
  }

  /**
   * Remove a repository
   */
  removeRepository(id: string): boolean {
    const repo = this.repositories.find(r => r.id === id);

    if (!repo) {
      return false;
    }

    if (repo.isDefault) {
      throw new Error('Cannot remove default repository');
    }

    this.repositories = this.repositories.filter(r => r.id !== id);
    this.saveRepositories();

    return true;
  }

  /**
   * Enable/disable a repository
   */
  toggleRepository(id: string, enabled: boolean): boolean {
    const repo = this.repositories.find(r => r.id === id);

    if (!repo) {
      return false;
    }

    repo.enabled = enabled;
    this.saveRepositories();

    return true;
  }

  /**
   * Validate repository URL format
   */
  private isValidRegistryUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Must be HTTPS
      if (urlObj.protocol !== 'https:') {
        return false;
      }

      // For GitHub, must be raw.githubusercontent.com
      if (url.includes('github') && !url.includes('raw.githubusercontent.com')) {
        return false;
      }

      // Must end with registry.json
      if (!url.endsWith('registry.json')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate repository by fetching it
   */
  private async validateRepository(url: string): Promise<void> {
    try {
      // Get GitHub token if user is authenticated (for private repos)
      const user = gitHubAuthService.getUser();
      const token = gitHubAuthService.getToken();

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      // Add authentication header if token is available
      if (token && user) {
        headers.Authorization = `token ${token}`;
      }

      const response = await fetch(url, {
        method: 'HEAD', // Just check if accessible
        headers,
      });

      if (!response.ok) {
        throw new Error(`Repository not accessible: ${response.status}`);
      }

      // Optionally fetch and validate structure
      const fullResponse = await fetch(url, { headers });
      const data = await fullResponse.json();

      if (!data.plugins || !Array.isArray(data.plugins)) {
        throw new Error('Invalid registry format: missing plugins array');
      }
    } catch (error) {
      throw new Error(
        `Failed to validate repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse GitHub repository URL to registry.json URL
   * Converts: https://github.com/user/repo → https://raw.githubusercontent.com/user/repo/main/registry.json
   */
  parseGitHubUrl(githubUrl: string): string | null {
    try {
      const url = new URL(githubUrl);

      // Must be github.com
      if (url.hostname !== 'github.com') {
        return null;
      }

      // Extract user and repo from path
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) {
        return null;
      }

      const [user, repo] = pathParts;

      // Construct raw URL (assume main branch)
      return `https://raw.githubusercontent.com/${user}/${repo}/main/registry.json`;
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const pluginRepositoryManager = new PluginRepositoryManager();
