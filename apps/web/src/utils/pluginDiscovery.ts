/**
 * Plugin Discovery Utilities
 * Helps discover and load plugins from manifest.json files
 * Phase 3 - Sprint 4
 */

import { getAllAvailableManifests, type LoadedManifest } from '../core/plugins';
import type { PluginManifest } from '@cartae/plugin-system';
import { isCorePlugin } from './pluginUtils';

/**
 * Get all discovered plugin manifests
 */
export function discoverPluginManifests(): LoadedManifest[] {
  return getAllAvailableManifests();
}

/**
 * Get manifest by plugin ID
 */
export function getManifestById(pluginId: string): PluginManifest | null {
  const manifests = getAllAvailableManifests();
  const found = manifests.find(m => m.manifest.id === pluginId);
  return found ? found.manifest : null;
}

/**
 * Get all core plugin manifests
 */
export function getCorePluginManifests(): LoadedManifest[] {
  const manifests = getAllAvailableManifests();
  return manifests.filter(m => isCorePlugin(m.manifest));
}

/**
 * Get all community plugin manifests
 */
export function getCommunityPluginManifests(): LoadedManifest[] {
  const manifests = getAllAvailableManifests();
  return manifests.filter(m => !isCorePlugin(m.manifest));
}

/**
 * Get featured plugin manifests
 */
export function getFeaturedPluginManifests(): LoadedManifest[] {
  const manifests = getAllAvailableManifests();
  return manifests.filter(m => m.manifest.featured === true);
}

/**
 * Get plugins by category
 */
export function getPluginsByCategory(category: string): LoadedManifest[] {
  const manifests = getAllAvailableManifests();
  return manifests.filter(m => m.manifest.category === category);
}

/**
 * Search plugins by query
 */
export function searchPlugins(query: string): LoadedManifest[] {
  const manifests = getAllAvailableManifests();
  const lowerQuery = query.toLowerCase();

  return manifests.filter(loaded => {
    const { manifest } = loaded;
    const matchesName = manifest.name.toLowerCase().includes(lowerQuery);
    const matchesDesc = manifest.description?.toLowerCase().includes(lowerQuery);
    const matchesId = manifest.id.toLowerCase().includes(lowerQuery);
    const matchesTags = manifest.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

    return matchesName || matchesDesc || matchesId || matchesTags;
  });
}

/**
 * Get plugin statistics
 */
export function getPluginStats() {
  const manifests = getAllAvailableManifests();
  const core = manifests.filter(m => isCorePlugin(m.manifest));
  const community = manifests.filter(m => !isCorePlugin(m.manifest));
  const featured = manifests.filter(m => m.manifest.featured === true);

  const categoryCounts = manifests.reduce(
    (acc, m) => {
      const cat = m.manifest.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total: manifests.length,
    core: core.length,
    community: community.length,
    featured: featured.length,
    byCategory: categoryCounts,
  };
}
