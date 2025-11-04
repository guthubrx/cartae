/**
 * Hook data provider pour convertir MindMap → CartaeItem[]
 * Réutilisable pour tous les composants viz (Kanban, Table, etc.)
 */

import { useMemo } from 'react';
import type { CartaeItem } from '@cartae/core';
import { useOpenFiles } from './useOpenFiles';
import { mindNodesToCartaeItems } from '../utils/nodesToCartaeItems';

/**
 * Hook qui récupère les données MindMap et les convertit en CartaeItem[]
 * Utilise React.useMemo pour optimiser les performances (pas de re-render inutile)
 */
export function useCartaeItems(): CartaeItem[] {
  // Récupérer le fichier actif depuis useOpenFiles (comme MindMapCanvas)
  const activeFile = useOpenFiles(state => state.openFiles.find(f => f.isActive) || null);

  // Les données XMind sont dans activeFile.content.nodes (format XMind parser)
  const contentNodes = activeFile?.content?.nodes || null;

  // Conversion avec cache pour éviter re-calcul à chaque render
  const cartaeItems = useMemo(() => {
    if (!contentNodes) {
      return [];
    }

    // Convertir Record<string, MindNode> → CartaeItem[]
    return mindNodesToCartaeItems(contentNodes, {
      includeRoot: true,
      extractHashtags: true,
      sourceConnector: 'xmind',
    });
  }, [contentNodes]);

  return cartaeItems;
}
