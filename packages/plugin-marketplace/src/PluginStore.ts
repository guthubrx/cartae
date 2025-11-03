/**
 * Plugin Store - Client for interacting with the plugin marketplace
 */

import JSZip from 'jszip';
import type { PluginListing, PluginSearchFilters, UpdateInfo, InstallProgress, InstalledPlugin } from './types';
import type { Plugin, PluginManifest } from '@cartae/plugin-system';

export class PluginStore {
  private registryUrl: string;
  private onProgressCallback?: (progress: InstallProgress) => void;

  constructor(registryUrl: string = 'https://bigmind-registry.workers.dev') {
    this.registryUrl = registryUrl;
  }

  /**
   * Set progress callback for installations
   */
  onProgress(callback: (progress: InstallProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Fetch all plugins from marketplace
   */
  async fetchPlugins(filters?: PluginSearchFilters): Promise<PluginListing[]> {
    const params = new URLSearchParams();

    if (filters?.category) params.set('category', filters.category);
    if (filters?.pricing) params.set('pricing', filters.pricing);
    if (filters?.search) params.set('q', filters.search);
    if (filters?.verified !== undefined) params.set('verified', String(filters.verified));

    const url = filters?.featured
      ? `${this.registryUrl}/api/plugins/featured`
      : `${this.registryUrl}/api/plugins?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch plugins: ${response.statusText}`);
    }

    const data = await response.json();
    return data.plugins || [];
  }

  /**
   * Search plugins by query
   */
  async searchPlugins(query: string): Promise<PluginListing[]> {
    return this.fetchPlugins({ search: query });
  }

  /**
   * Get details for a specific plugin
   */
  async getPlugin(pluginId: string): Promise<PluginListing | null> {
    const response = await fetch(`${this.registryUrl}/api/plugins/${pluginId}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch plugin: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Download and install a plugin
   */
  async installPlugin(pluginId: string, version?: string): Promise<Plugin> {
    this.emitProgress(pluginId, 'downloading', 0, 'Downloading plugin...');

    try {
      // 1. Download ZIP from marketplace
      const url = `${this.registryUrl}/api/plugins/${pluginId}/download${
        version ? `?version=${version}` : ''
      }`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.statusText}`);
      }

      this.emitProgress(pluginId, 'downloading', 50, 'Download complete');

      const zipBlob = await response.blob();

      this.emitProgress(pluginId, 'extracting', 60, 'Extracting plugin files...');

      // 2. Extract ZIP
      const zip = await JSZip.loadAsync(zipBlob);

      // 3. Validate manifest
      this.emitProgress(pluginId, 'validating', 70, 'Validating plugin...');

      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        throw new Error('Invalid plugin: missing manifest.json');
      }

      const manifestText = await manifestFile.async('text');
      const manifest: PluginManifest = JSON.parse(manifestText);

      // 4. Security checks
      await this.validatePlugin(manifest, zip);

      this.emitProgress(pluginId, 'installing', 80, 'Loading plugin code...');

      // 5. Extract plugin code
      const codeFile = zip.file('index.js') || zip.file('dist/index.js');
      if (!codeFile) {
        throw new Error('Invalid plugin: missing index.js');
      }

      const pluginCode = await codeFile.async('text');

      // 6. Load plugin dynamically
      const PluginClass = await this.loadPluginFromCode(pluginCode, manifest.id);

      this.emitProgress(pluginId, 'installing', 90, 'Registering plugin...');

      // 7. Save to local storage for persistence
      await this.saveInstalledPlugin(pluginId, version || manifest.version, manifest);

      this.emitProgress(pluginId, 'complete', 100, 'Installation complete!');

      return new PluginClass();
    } catch (error) {
      this.emitProgress(pluginId, 'error', 0, undefined, (error as Error).message);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    // Remove from local storage
    const installed = this.getInstalledPlugins();
    const updated = installed.filter(p => p.id !== pluginId);
    localStorage.setItem('bigmind-installed-plugins', JSON.stringify(updated));
  }

  /**
   * Check for plugin updates
   */
  async checkUpdates(): Promise<UpdateInfo[]> {
    const installed = this.getInstalledPlugins();

    if (installed.length === 0) {
      return [];
    }

    const response = await fetch(`${this.registryUrl}/api/plugins/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installed })
    });

    if (!response.ok) {
      throw new Error(`Failed to check updates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.updates || [];
  }

  /**
   * Get list of installed plugins from local storage
   */
  // eslint-disable-next-line class-methods-use-this
  getInstalledPlugins(): InstalledPlugin[] {
    const data = localStorage.getItem('bigmind-installed-plugins');
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    const installed = this.getInstalledPlugins();
    return installed.some(p => p.id === pluginId);
  }

  // ===== Private Methods =====

  /**
   * Validate plugin for security issues
   */
  // eslint-disable-next-line class-methods-use-this
  private async validatePlugin(manifest: PluginManifest, zip: JSZip): Promise<void> {
    // Check for dangerous permissions
    const dangerousPermissions = ['filesystem:write', 'network:unrestricted'];
    const hasDangerous = manifest.permissions?.some((p: string) => dangerousPermissions.includes(p));

    if (hasDangerous) {
      console.warn(`Plugin ${manifest.id} requests dangerous permissions`);
    }

    // Check file size (max 10MB)
    const files = Object.keys(zip.files);
    let totalSize = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const filename of files) {
      const file = zip.files[filename];
      if (!file.dir) {
        // eslint-disable-next-line no-await-in-loop
        const content = await file.async('uint8array');
        totalSize += content.length;
      }
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (totalSize > maxSize) {
      throw new Error(`Plugin too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
    }

    // TODO: Add more security checks
    // - Scan for eval()
    // - Check for suspicious network calls
    // - Validate manifest schema
  }

  /**
   * Load plugin from code string
   */
  // eslint-disable-next-line class-methods-use-this
  private async loadPluginFromCode(code: string, pluginId: string): Promise<any> {
    // Option 1: Dynamic import (secure, requires bundler support)
    try {
      const blob = new Blob([code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const module = await import(/* @vite-ignore */ url);
      URL.revokeObjectURL(url);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      throw new Error(`Failed to load plugin: ${(error as Error).message}`);
    }

    // Option 2: Web Worker (more secure, but more complex)
    // TODO: Implement Web Worker loader for better isolation
  }

  /**
   * Save installed plugin to local storage
   */
  private async saveInstalledPlugin(
    pluginId: string,
    version: string,
    manifest: PluginManifest
  ): Promise<void> {
    const installed = this.getInstalledPlugins();

    // Update or add
    const existing = installed.find(p => p.id === pluginId);
    if (existing) {
      existing.version = version;
    } else {
      installed.push({
        id: pluginId,
        version,
        installedAt: new Date().toISOString(),
        enabled: true
      });
    }

    localStorage.setItem('bigmind-installed-plugins', JSON.stringify(installed));

    // Also save the manifest for offline access
    localStorage.setItem(`bigmind-plugin-manifest-${pluginId}`, JSON.stringify(manifest));
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    pluginId: string,
    status: InstallProgress['status'],
    progress: number,
    message?: string,
    error?: string
  ): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        pluginId,
        status,
        progress,
        message,
        error
      });
    }
  }
}
