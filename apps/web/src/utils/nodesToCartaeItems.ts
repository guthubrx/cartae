/**
 * Converter : MindMap Nodes → CartaeItem[]
 */

import type { CartaeItem } from '@cartae/core';

export interface MindNode {
  id: string;
  parentId: string | null;
  title: string;
  notes?: string;
  collapsed?: boolean;
  style?: any;
  children: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ConversionOptions {
  includeRoot?: boolean;
  extractHashtags?: boolean;
  sourceConnector?: string;
}

function extractHashtagsFromText(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);
  return Array.from(matches, m => m[1]);
}

export function mindNodeToCartaeItem(node: MindNode, options: ConversionOptions = {}): CartaeItem {
  const { extractHashtags = true, sourceConnector = 'mindmap' } = options;
  const now = new Date();
  const tags = extractHashtags ? extractHashtagsFromText(node.title) : [];

  const cartaeItem: CartaeItem = {
    id: node.id,
    type: 'note',
    title: node.title,
    content: node.notes || '',
    tags,
    metadata: {
      // Préserver les métadonnées du node (comme kanbanStatus)
      ...(node.metadata || {}),
      // Ajouter les métadonnées par défaut si manquantes
      author: (node.metadata?.author as string) || 'user',
      createdDate: (node.metadata?.createdDate as Date) || now,
      modifiedDate: (node.metadata?.modifiedDate as Date) || now,
      custom: {
        collapsed: node.collapsed || false,
        hasChildren: node.children.length > 0,
        childrenCount: node.children.length,
        position:
          node.x !== undefined && node.y !== undefined ? { x: node.x, y: node.y } : undefined,
        dimensions:
          node.width !== undefined || node.height !== undefined
            ? { width: node.width, height: node.height }
            : undefined,
        style: node.style,
      },
    },
    source: {
      connector: sourceConnector,
      originalId: node.id,
      lastSync: now,
      metadata: {
        parentId: node.parentId,
        children: node.children,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  return cartaeItem;
}

export function mindNodesToCartaeItems(
  nodesRecord: Record<string, MindNode>,
  options: ConversionOptions = {}
): CartaeItem[] {
  const { includeRoot = true } = options;
  const items: CartaeItem[] = [];

  for (const nodeId in nodesRecord) {
    // eslint-disable-next-line no-prototype-builtins
    if (nodesRecord.hasOwnProperty(nodeId)) {
      const node = nodesRecord[nodeId];
      if (!includeRoot && node.parentId === null) continue;
      const item = mindNodeToCartaeItem(node, options);
      items.push(item);
    }
  }

  return items;
}

export function filterCartaeItemsByTags(items: CartaeItem[], tags: string[]): CartaeItem[] {
  if (tags.length === 0) return items;
  return items.filter(item => tags.some(tag => item.tags.includes(tag)));
}

export function searchCartaeItems(items: CartaeItem[], query: string): CartaeItem[] {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(
    item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      (item.content && item.content.toLowerCase().includes(lowerQuery))
  );
}
