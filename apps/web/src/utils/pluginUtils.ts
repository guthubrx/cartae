/**
 * Plugin utilities
 * Centralise la logique métier autour des plugins
 */

import type { PluginManifest } from '@cartae/plugin-system';

/**
 * Détermine si un plugin peut être désactivé par l'utilisateur
 * Les plugins "core" ne peuvent pas être désactivés car ils sont essentiels au fonctionnement de l'application
 */
export function canDisablePlugin(manifest: PluginManifest): boolean {
  return manifest.source !== 'core';
}

/**
 * Détermine si un plugin est un plugin système (core)
 */
export function isCorePlugin(manifest: PluginManifest): boolean {
  return manifest.source === 'core';
}

/**
 * Détermine si un plugin est un plugin officiel (core ou official)
 */
export function isOfficialPlugin(manifest: PluginManifest): boolean {
  return manifest.source === 'core' || manifest.source === 'official';
}

/**
 * Détermine si un plugin est un plugin privé
 */
export function isPrivatePlugin(manifest: PluginManifest): boolean {
  return manifest.source === 'official-private';
}

/**
 * Détermine si un plugin est un plugin communautaire
 */
export function isCommunityPlugin(manifest: PluginManifest): boolean {
  return manifest.source === 'community';
}
