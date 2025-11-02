/**
 * FR: Utilitaires pour opérations sur les nœuds
 * EN: Utilities for node operations
 */

import type { MindNode } from '@cartae/mindmap-core';

/**
 * FR: Obtenir tous les descendants d'un nœud (récursif)
 * EN: Get all descendants of a node (recursive)
 */
export function getAllDescendants(nodeId: string, nodes: Record<string, MindNode | any>): string[] {
  const descendants: string[] = [];
  const node = nodes[nodeId];

  if (!node?.children) return descendants;

  const traverse = (currentNodeId: string) => {
    const currentNode = nodes[currentNodeId];
    if (currentNode?.children && Array.isArray(currentNode.children)) {
      currentNode.children.forEach((childId: string) => {
        descendants.push(childId);
        traverse(childId);
      });
    }
  };

  traverse(nodeId);
  return descendants;
}

/**
 * FR: Obtenir tous les ancêtres d'un nœud (récursif)
 * EN: Get all ancestors of a node (recursive)
 */
export function getAllAncestors(nodeId: string, nodes: Record<string, MindNode | any>): string[] {
  const ancestors: string[] = [];
  const node = nodes[nodeId];

  if (!node?.parentId) return ancestors;

  const traverse = (currentNodeId: string) => {
    const currentNode = nodes[currentNodeId];
    if (currentNode?.parentId) {
      ancestors.push(currentNode.parentId);
      traverse(currentNode.parentId);
    }
  };

  traverse(nodeId);
  return ancestors;
}

/**
 * FR: Vérifier si un nœud est un descendant d'un autre
 * EN: Check if a node is a descendant of another
 */
export function isDescendant(
  nodeId: string,
  potentialAncestorId: string,
  nodes: Record<string, MindNode | any>
): boolean {
  return getAllDescendants(potentialAncestorId, nodes).includes(nodeId);
}

/**
 * FR: Obtenir la profondeur d'un nœud dans l'arborescence
 * EN: Get the depth of a node in the tree
 */
export function getNodeDepth(nodeId: string, nodes: Record<string, MindNode | any>): number {
  let depth = 0;
  let currentNodeId: string | null = nodeId;
  let maxIterations = 1000; // Prevent infinite loops

  while (currentNodeId && maxIterations > 0) {
    maxIterations -= 1;
    const node: any = nodes[currentNodeId];
    if (!node || !node.parentId) break;
    currentNodeId = node.parentId;
    depth += 1;
  }

  return depth;
}
