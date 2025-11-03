/**
 * Content Adapter
 * Centralizes BigMind data format adaptation
 * Eliminates duplication in file loading logic
 */

export interface BigMindData {
  id: string;
  name: string;
  rootId: string;
  nodes: Record<string, any>;
}

export interface AdaptedContent {
  id: string;
  name: string;
  rootNode: {
    id: string;
    title: string;
    children: any[];
  };
  nodes: Record<string, any>;
}

/**
 * Adapt BigMind data format to internal content format
 */
export function adaptBigMindToContent(bigMindData: BigMindData): AdaptedContent {
  const rootNode = bigMindData.nodes[bigMindData.rootId];

  // Initialize metadata on all nodes if not present
  // Filter out null/undefined nodes to avoid breaking references
  const nodesWithMetadata = Object.entries(bigMindData.nodes).reduce(
    (acc, [nodeId, node]) => {
      if (node) {
        acc[nodeId] = {
          ...node,
          metadata: node.metadata || {},
        };
      }
      return acc;
    },
    {} as Record<string, any>
  );

  return {
    id: bigMindData.id,
    name: bigMindData.name,
    rootNode: {
      id: bigMindData.rootId,
      title: rootNode?.title || 'Racine',
      children: rootNode?.children || [],
    },
    nodes: nodesWithMetadata,
  };
}

/**
 * Create an empty BigMind data structure
 */
export function createEmptyBigMindData(name: string = 'Nouvelle carte'): BigMindData {
  const rootId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: `map_${Date.now()}`,
    name,
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        title: name,
        children: [],
        parentId: null,
      },
    },
  };
}
