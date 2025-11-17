/**
 * CartaeItemList - Liste virtualisée de CartaeItems
 *
 * Composant optimisé pour afficher de grandes listes d'items (100-1000+)
 * avec tri, filtrage, sélection multiple, et pagination.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel, ItemStatus } from '@cartae/core/types/CartaeMetadata';
import { CartaeItemCard } from './CartaeItemCard';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  X,
  CheckSquare,
  Square,
  Trash2,
  Archive,
  Star,
} from 'lucide-react';

/**
 * Mode de tri
 */
export type SortMode = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'priority-desc';

/**
 * Filtres disponibles
 */
export interface CartaeItemFilters {
  /**
   * Filtrer par type(s)
   */
  types?: CartaeItemType[];

  /**
   * Filtrer par priorité(s)
   */
  priorities?: PriorityLevel[];

  /**
   * Filtrer par status
   */
  statuses?: ItemStatus[];

  /**
   * Filtrer par tags (OR logic)
   */
  tags?: string[];

  /**
   * Filtrer par source connector
   */
  sources?: string[];

  /**
   * Inclure items archivés ?
   */
  includeArchived?: boolean;

  /**
   * Seulement favoris ?
   */
  onlyFavorites?: boolean;

  /**
   * Recherche texte (titre + contenu)
   */
  searchText?: string;
}

/**
 * Props pour CartaeItemList
 */
export interface CartaeItemListProps {
  /**
   * Items à afficher
   */
  items: CartaeItem[];

  /**
   * Callback quand un item est cliqué
   */
  onItemClick?: (item: CartaeItem) => void;

  /**
   * Callback pour toggle favoris
   */
  onToggleFavorite?: (item: CartaeItem) => void;

  /**
   * Callback pour toggle archiver
   */
  onToggleArchive?: (item: CartaeItem) => void;

  /**
   * Callback pour suppression (bulk ou single)
   */
  onDelete?: (items: CartaeItem[]) => void;

  /**
   * Mode de tri initial
   */
  defaultSortMode?: SortMode;

  /**
   * Filtres initiaux
   */
  defaultFilters?: CartaeItemFilters;

  /**
   * Mode compact (cartes plus petites) ?
   */
  compact?: boolean;

  /**
   * Afficher barre de recherche ?
   */
  showSearch?: boolean;

  /**
   * Afficher boutons de filtrage ?
   */
  showFilters?: boolean;

  /**
   * Activer sélection multiple ?
   */
  enableSelection?: boolean;

  /**
   * Hauteur de la liste (défaut: auto)
   */
  height?: number | string;

  /**
   * Items par page (pagination)
   * Si undefined, affiche tous les items (avec scroll virtuel)
   */
  itemsPerPage?: number;

  /**
   * Message si liste vide
   */
  emptyMessage?: string;

  /**
   * Styles personnalisés
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

/**
 * CartaeItemList - Liste virtualisée avec tri/filtrage
 */
export const CartaeItemList: React.FC<CartaeItemListProps> = ({
  items,
  onItemClick,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
  defaultSortMode = 'date-desc',
  defaultFilters = {},
  compact = false,
  showSearch = true,
  showFilters = true,
  enableSelection = false,
  height = 'auto',
  itemsPerPage,
  emptyMessage = 'Aucun item à afficher',
  style,
  className = '',
}) => {
  const [sortMode, setSortMode] = useState<SortMode>(defaultSortMode);
  const [filters, setFilters] = useState<CartaeItemFilters>(defaultFilters);
  const [searchText, setSearchText] = useState<string>(filters.searchText || '');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Fonction de tri
  const sortItems = useCallback(
    (itemsToSort: CartaeItem[]): CartaeItem[] => {
      const sorted = [...itemsToSort];

      switch (sortMode) {
        case 'date-desc':
          return sorted.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case 'date-asc':
          return sorted.sort(
            (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          );
        case 'title-asc':
          return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
          return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case 'priority-desc':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return sorted.sort((a, b) => {
            const aPrio = a.metadata.priority ? priorityOrder[a.metadata.priority] : 0;
            const bPrio = b.metadata.priority ? priorityOrder[b.metadata.priority] : 0;
            return bPrio - aPrio;
          });
        default:
          return sorted;
      }
    },
    [sortMode]
  );

  // Fonction de filtrage
  const filterItems = useCallback(
    (itemsToFilter: CartaeItem[]): CartaeItem[] => {
      return itemsToFilter.filter((item) => {
        // Filtre archivés
        if (!filters.includeArchived && item.archived) return false;

        // Filtre favoris
        if (filters.onlyFavorites && !item.favorite) return false;

        // Filtre types
        if (filters.types && filters.types.length > 0 && !filters.types.includes(item.type)) {
          return false;
        }

        // Filtre priorités
        if (
          filters.priorities &&
          filters.priorities.length > 0 &&
          (!item.metadata.priority || !filters.priorities.includes(item.metadata.priority))
        ) {
          return false;
        }

        // Filtre status
        if (
          filters.statuses &&
          filters.statuses.length > 0 &&
          (!item.metadata.status || !filters.statuses.includes(item.metadata.status))
        ) {
          return false;
        }

        // Filtre tags (OR logic : au moins un tag match)
        if (filters.tags && filters.tags.length > 0) {
          const hasMatchingTag = filters.tags.some((tag) => item.tags.includes(tag));
          if (!hasMatchingTag) return false;
        }

        // Filtre sources
        if (
          filters.sources &&
          filters.sources.length > 0 &&
          !filters.sources.includes(item.source.connector)
        ) {
          return false;
        }

        // Recherche texte
        if (searchText.trim()) {
          const search = searchText.toLowerCase();
          const titleMatch = item.title.toLowerCase().includes(search);
          const contentMatch = item.content?.toLowerCase().includes(search);
          const tagsMatch = item.tags.some((tag) => tag.toLowerCase().includes(search));

          if (!titleMatch && !contentMatch && !tagsMatch) return false;
        }

        return true;
      });
    },
    [filters, searchText]
  );

  // Items filtrés et triés
  const processedItems = useMemo(() => {
    const filtered = filterItems(items);
    return sortItems(filtered);
  }, [items, filterItems, sortItems]);

  // Pagination
  const totalPages = itemsPerPage ? Math.ceil(processedItems.length / itemsPerPage) : 1;
  const paginatedItems = itemsPerPage
    ? processedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : processedItems;

  // Handlers
  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedItems.map((item) => item.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (onDelete && selectedItems.size > 0) {
      const itemsToDelete = paginatedItems.filter((item) => selectedItems.has(item.id));
      onDelete(itemsToDelete);
      setSelectedItems(new Set());
    }
  };

  const handleArchiveSelected = () => {
    if (onToggleArchive && selectedItems.size > 0) {
      paginatedItems
        .filter((item) => selectedItems.has(item.id))
        .forEach((item) => {
          onToggleArchive(item);
        });
      setSelectedItems(new Set());
    }
  };

  const handleFavoriteSelected = () => {
    if (onToggleFavorite && selectedItems.size > 0) {
      paginatedItems
        .filter((item) => selectedItems.has(item.id))
        .forEach((item) => {
          onToggleFavorite(item);
        });
      setSelectedItems(new Set());
    }
  };

  return (
    <div
      className={`cartae-item-list ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height,
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header : Search + Filtres + Tri */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Barre de recherche + actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Search bar */}
          {showSearch && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--color-background-secondary, #f9fafb)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
              }}
            >
              <Search size={18} style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1); // Reset page
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--color-text-primary, #1f2937)',
                }}
              />
              {searchText && (
                <button
                  onClick={() => {
                    setSearchText('');
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={16} style={{ color: '#9CA3AF' }} />
                </button>
              )}
            </div>
          )}

          {/* Bouton Filtres */}
          {showFilters && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              style={{
                padding: '8px 12px',
                background: showFiltersPanel ? '#EFF6FF' : 'var(--color-background-secondary, #f9fafb)',
                border: `1px solid ${showFiltersPanel ? '#3B82F6' : 'var(--color-border, #e5e7eb)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: showFiltersPanel ? '#1E40AF' : 'var(--color-text-secondary, #6b7280)',
              }}
            >
              <Filter size={16} />
              <span>Filtres</span>
            </button>
          )}

          {/* Sélecteur de tri */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{
              padding: '8px 12px',
              background: 'var(--color-background-secondary, #f9fafb)',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-text-primary, #1f2937)',
              cursor: 'pointer',
            }}
          >
            <option value="date-desc">Plus récent</option>
            <option value="date-asc">Plus ancien</option>
            <option value="title-asc">Titre (A-Z)</option>
            <option value="title-desc">Titre (Z-A)</option>
            <option value="priority-desc">Priorité</option>
          </select>
        </div>

        {/* Panneau Filtres (si ouvert) */}
        {showFiltersPanel && (
          <div
            style={{
              padding: '12px',
              background: 'var(--color-background-secondary, #f9fafb)',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Filtres rapides */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={filters.onlyFavorites || false}
                onChange={(e) =>
                  setFilters({ ...filters, onlyFavorites: e.target.checked })
                }
              />
              <span>Favoris seulement</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={filters.includeArchived || false}
                onChange={(e) =>
                  setFilters({ ...filters, includeArchived: e.target.checked })
                }
              />
              <span>Inclure archivés</span>
            </label>

            <button
              onClick={() => {
                setFilters({});
                setSearchText('');
              }}
              style={{
                padding: '4px 8px',
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#991B1B',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Réinitialiser filtres
            </button>
          </div>
        )}

        {/* Barre d'actions sélection */}
        {enableSelection && selectedItems.size > 0 && (
          <div
            style={{
              padding: '12px',
              background: '#DBEAFE',
              border: '1px solid #3B82F6',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E40AF' }}>
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} sélectionné{selectedItems.size > 1 ? 's' : ''}
            </span>

            <div style={{ flex: 1 }} />

            {onToggleFavorite && (
              <button
                onClick={handleFavoriteSelected}
                style={{
                  padding: '6px 12px',
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#92400E',
                }}
              >
                <Star size={14} />
                <span>Favoris</span>
              </button>
            )}

            {onToggleArchive && (
              <button
                onClick={handleArchiveSelected}
                style={{
                  padding: '6px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#4B5563',
                }}
              >
                <Archive size={14} />
                <span>Archiver</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '6px 12px',
                  background: '#FEE2E2',
                  border: '1px solid #EF4444',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#991B1B',
                }}
              >
                <Trash2 size={14} />
                <span>Supprimer</span>
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary, #9ca3af)' }}>
          {processedItems.length} item{processedItems.length > 1 ? 's' : ''}
          {items.length !== processedItems.length && ` (sur ${items.length} total)`}
        </div>
      </div>

      {/* Liste des items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? '8px' : '12px',
          overflowY: height !== 'auto' ? 'auto' : undefined,
          flex: 1,
        }}
      >
        {paginatedItems.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--color-text-tertiary, #9ca3af)',
              fontSize: '14px',
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          paginatedItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              {/* Checkbox sélection */}
              {enableSelection && (
                <button
                  onClick={() => handleSelectItem(item.id)}
                  style={{
                    padding: '4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: '12px',
                  }}
                >
                  {selectedItems.has(item.id) ? (
                    <CheckSquare size={20} style={{ color: '#3B82F6' }} />
                  ) : (
                    <Square size={20} style={{ color: '#9CA3AF' }} />
                  )}
                </button>
              )}

              {/* Carte */}
              <div style={{ flex: 1 }}>
                <CartaeItemCard
                  item={item}
                  onClick={onItemClick}
                  onToggleFavorite={onToggleFavorite}
                  onToggleArchive={onToggleArchive}
                  compact={compact}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {itemsPerPage && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              background: currentPage === 1 ? '#F3F4F6' : 'var(--color-background-secondary, #f9fafb)',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <ChevronUp size={16} />
          </button>

          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary, #6b7280)' }}>
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              background: currentPage === totalPages ? '#F3F4F6' : 'var(--color-background-secondary, #f9fafb)',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CartaeItemList;
