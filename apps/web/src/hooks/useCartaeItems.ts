/**
 * Hook data provider pour convertir MindMap → CartaeItem[]
 * Réutilisable pour tous les composants viz (Kanban, Table, etc.)
 */

import { useMemo } from 'react';
import type { CartaeItem } from '@cartae/core';
import { useMindmap } from './useMindmap';
import { mindNodesToCartaeItems } from '../utils/nodesToCartaeItems';

/**
 * Hook qui récupère les données MindMap et les convertit en CartaeItem[]
 * Utilise React.useMemo pour optimiser les performances (pas de re-render inutile)
 */
export function useCartaeItems(): CartaeItem[] {
  const { mindMap } = useMindmap();

  // Conversion avec cache pour éviter re-calcul à chaque render
  const cartaeItems = useMemo(() => {
    if (!mindMap || !mindMap.nodes) {
      return [];
    }

    // Convertir Record<string, MindNode> → CartaeItem[]
    return mindNodesToCartaeItems(mindMap.nodes, {
      includeRoot: true,
      extractHashtags: true,
      sourceConnector: 'mindmap',
    });
  }, [mindMap]);

  return cartaeItems;
}
