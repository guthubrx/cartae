/**
 * Overlay Loader
 * Centralizes overlay loading and application logic
 * Eliminates duplication in file operations
 */

import { validateOverlay } from './overlayValidation';
import { loadObject } from './storageManager';
import type { AdaptedContent } from './contentAdapter';

export interface OverlayData {
  nodes?: Record<string, any>;
  tags?: any[];
  [key: string]: any;
}

/**
 * Apply overlay modifications to adapted content
 */
export function applyOverlayToContent(content: AdaptedContent, overlay: OverlayData): void {
  if (!overlay?.nodes) return;

  // Apply node patches
  Object.entries(overlay.nodes).forEach(([nodeId, patch]: [string, any]) => {
    if (content.nodes?.[nodeId]) {
      // Deep merge metadata to preserve existing properties
      const mergedNode = { ...content.nodes[nodeId], ...patch };
      if (patch.metadata && content.nodes[nodeId].metadata) {
        mergedNode.metadata = {
          ...content.nodes[nodeId].metadata,
          ...patch.metadata,
        };
      }
      content.nodes[nodeId] = mergedNode;
    }
  });

  // Update root node title if needed
  const rootId = content.rootNode.id;
  if (overlay.nodes[rootId]?.title) {
    content.rootNode.title = overlay.nodes[rootId].title;
  }
}

/**
 * Load overlay from localStorage for a specific file
 * Returns overlay data and tags if present
 */
export function loadOverlayFromLocalStorage(filename: string): {
  overlay: OverlayData | null;
  tags: any[];
} {
  try {
    const key = `bigmind_overlay_${filename}`;
    const overlay = loadObject<OverlayData | null>(key, null);

    if (!overlay || !validateOverlay(overlay)) {
      return { overlay: null, tags: [] };
    }

    return {
      overlay,
      tags: overlay.tags || [],
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[overlayLoader] Error loading overlay:', e);
    return { overlay: null, tags: [] };
  }
}

/**
 * Load and apply overlay from localStorage
 */
export function applyOverlayFromLocalStorage(
  content: AdaptedContent,
  filename: string
): { tags: any[] } {
  const { overlay, tags } = loadOverlayFromLocalStorage(filename);

  if (overlay) {
    applyOverlayToContent(content, overlay);
  }

  return { tags };
}

/**
 * Parse and validate overlay from ZIP sidecar file
 */
export async function loadOverlayFromZip(
  zip: any,
  sidecarName: string = 'bigmind.json'
): Promise<{ overlay: OverlayData | null; tags: any[] }> {
  try {
    const sidecar = zip.file(sidecarName);
    if (!sidecar) {
      return { overlay: null, tags: [] };
    }

    const text = await sidecar.async('text');
    const data = JSON.parse(text);

    if (!validateOverlay(data)) {
      return { overlay: null, tags: [] };
    }

    return {
      overlay: data,
      tags: data.tags || [],
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[overlayLoader] Error loading overlay from ZIP:', e);
    return { overlay: null, tags: [] };
  }
}

/**
 * Load and apply overlay from ZIP sidecar
 */
export async function applyOverlayFromZip(
  content: AdaptedContent,
  zip: any,
  sidecarName: string = 'bigmind.json'
): Promise<{ tags: any[] }> {
  const { overlay, tags } = await loadOverlayFromZip(zip, sidecarName);

  if (overlay) {
    applyOverlayToContent(content, overlay);
  }

  return { tags };
}
