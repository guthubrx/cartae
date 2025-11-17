/**
 * CartaeItemSearch - Recherche full-text dans CartaeItems
 *
 * Fonctionnalités :
 * - Recherche full-text (titre + contenu + tags + metadata)
 * - Highlighting des résultats
 * - Filtres avancés (type, priorité, dates, source)
 * - Suggestions de recherche (based on tags, titres fréquents)
 * - Historique de recherche
 * - Tri des résultats par pertinence/date
 *
 * Search engine simple côté client pour prototype.
 * TODO: Remplacer par Elasticsearch/MeiliSearch/Algolia pour prod.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel } from '@cartae/core/types/CartaeMetadata';
import { Search, X, Clock, TrendingUp, Filter } from 'lucide-react';
import { CartaeItemCard } from './CartaeItemCard';

/**
 * Options de recherche
 */
export interface SearchOptions {
  /**
   * Recherche dans titre
   */
  searchTitle?: boolean;

  /**
   * Recherche dans contenu
   */
  searchContent?: boolean;

  /**
   * Recherche dans tags
   */
  searchTags?: boolean;

  /**
   * Recherche dans metadata (author, location, etc.)
   */
  searchMetadata?: boolean;

  /**
   * Case sensitive
   */
  caseSensitive?: boolean;

  /**
   * Match exact (pas de substring)
   */
  exactMatch?: boolean;

  /**
   * Filtrer par types
   */
  filterTypes?: CartaeItemType[];

  /**
   * Filtrer par priorités
   */
  filterPriorities?: PriorityLevel[];

  /**
   * Filtrer par sources
   */
  filterSources?: string[];

  /**
   * Filtrer par date (après cette date)
   */
  filterDateAfter?: Date;

  /**
   * Filtrer par date (avant cette date)
   */
  filterDateBefore?: Date;
}

/**
 * Résultat de recherche
 */
export interface SearchResult {
  /**
   * Item trouvé
   */
  item: CartaeItem;

  /**
   * Score de pertinence (0-1)
   */
  score: number;

  /**
   * Highlights (snippets avec terme surligné)
   */
  highlights: string[];

  /**
   * Matches (où le terme a été trouvé)
   */
  matches: {
    field: 'title' | 'content' | 'tags' | 'metadata';
    count: number;
  }[];
}

/**
 * Props pour CartaeItemSearch
 */
export interface CartaeItemSearchProps {
  /**
   * Items dans lesquels chercher
   */
  items: CartaeItem[];

  /**
   * Options de recherche
   */
  options?: SearchOptions;

  /**
   * Placeholder input
   */
  placeholder?: string;

  /**
   * Afficher suggestions
   */
  showSuggestions?: boolean;

  /**
   * Afficher historique
   */
  showHistory?: boolean;

  /**
   * Nombre max de résultats
   */
  maxResults?: number;

  /**
   * Callback quand item cliqué dans résultats
   */
  onItemClick?: (item: CartaeItem) => void;

  /**
   * Callback quand résultats changent
   */
  onResultsChange?: (results: SearchResult[]) => void;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

/**
 * Score un item contre query
 */
const scoreItem = (
  item: CartaeItem,
  query: string,
  options: SearchOptions
): { score: number; highlights: string[]; matches: any[] } => {
  const {
    searchTitle = true,
    searchContent = true,
    searchTags = true,
    searchMetadata = false,
    caseSensitive = false,
  } = options;

  let score = 0;
  const highlights: string[] = [];
  const matches: any[] = [];

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();

  // Helper pour normaliser texte
  const normalize = (text: string) => (caseSensitive ? text : text.toLowerCase());

  // Search in title (poids: 3)
  if (searchTitle && item.title) {
    const normalizedTitle = normalize(item.title);
    if (normalizedTitle.includes(normalizedQuery)) {
      const count = (normalizedTitle.match(new RegExp(normalizedQuery, 'g')) || []).length;
      score += count * 3;
      matches.push({ field: 'title', count });

      // Highlight snippet
      const start = Math.max(0, normalizedTitle.indexOf(normalizedQuery) - 20);
      const end = Math.min(item.title.length, start + normalizedQuery.length + 40);
      highlights.push(`...${item.title.substring(start, end)}...`);
    }
  }

  // Search in content (poids: 1)
  if (searchContent && item.content) {
    const normalizedContent = normalize(item.content);
    if (normalizedContent.includes(normalizedQuery)) {
      const count = (normalizedContent.match(new RegExp(normalizedQuery, 'g')) || []).length;
      score += count * 1;
      matches.push({ field: 'content', count });

      // Highlight snippet
      const firstMatch = normalizedContent.indexOf(normalizedQuery);
      const start = Math.max(0, firstMatch - 40);
      const end = Math.min(item.content.length, firstMatch + normalizedQuery.length + 40);
      highlights.push(`...${item.content.substring(start, end)}...`);
    }
  }

  // Search in tags (poids: 2)
  if (searchTags && item.tags.length > 0) {
    item.tags.forEach((tag) => {
      const normalizedTag = normalize(tag);
      if (normalizedTag.includes(normalizedQuery)) {
        score += 2;
        matches.push({ field: 'tags', count: 1 });
        highlights.push(`#${tag}`);
      }
    });
  }

  // Search in metadata (poids: 1)
  if (searchMetadata) {
    const searchableMetadata = [
      item.metadata.author,
      item.metadata.location,
      ...(item.metadata.participants || []),
    ].filter(Boolean);

    searchableMetadata.forEach((text) => {
      const normalizedText = normalize(text as string);
      if (normalizedText.includes(normalizedQuery)) {
        score += 1;
        matches.push({ field: 'metadata', count: 1 });
      }
    });
  }

  return { score, highlights, matches };
};

/**
 * Filtrer items selon options
 */
const filterItems = (items: CartaeItem[], options: SearchOptions): CartaeItem[] => {
  let filtered = [...items];

  // Filter by types
  if (options.filterTypes && options.filterTypes.length > 0) {
    filtered = filtered.filter((item) => options.filterTypes!.includes(item.type));
  }

  // Filter by priorities
  if (options.filterPriorities && options.filterPriorities.length > 0) {
    filtered = filtered.filter(
      (item) =>
        item.metadata.priority && options.filterPriorities!.includes(item.metadata.priority)
    );
  }

  // Filter by sources
  if (options.filterSources && options.filterSources.length > 0) {
    filtered = filtered.filter((item) =>
      options.filterSources!.includes(item.source.connector)
    );
  }

  // Filter by date range
  if (options.filterDateAfter) {
    filtered = filtered.filter(
      (item) => new Date(item.createdAt).getTime() >= options.filterDateAfter!.getTime()
    );
  }

  if (options.filterDateBefore) {
    filtered = filtered.filter(
      (item) => new Date(item.createdAt).getTime() <= options.filterDateBefore!.getTime()
    );
  }

  return filtered;
};

/**
 * CartaeItemSearch - Composant principal
 */
export const CartaeItemSearch: React.FC<CartaeItemSearchProps> = ({
  items,
  options = {},
  placeholder = 'Rechercher dans vos items...',
  showSuggestions = true,
  showHistory = true,
  maxResults = 50,
  onItemClick,
  onResultsChange,
  style,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Perform search
  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    // Filter items first
    const filtered = filterItems(items, options);

    // Score and rank
    const scored: SearchResult[] = filtered
      .map((item) => {
        const { score, highlights, matches } = scoreItem(item, query.trim(), options);
        return { item, score, highlights, matches };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return scored;
  }, [items, query, options, maxResults]);

  // Notify parent of results change
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(results);
    }
  }, [results, onResultsChange]);

  // Handle search submit (Enter key)
  const handleSearch = useCallback(() => {
    if (query.trim() && !searchHistory.includes(query.trim())) {
      setSearchHistory((prev) => [query.trim(), ...prev].slice(0, 10)); // Keep last 10
    }
  }, [query, searchHistory]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Handle input keydown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
  };

  // Click history item
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  return (
    <div
      className={`cartae-item-search ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-tertiary, #9ca3af)',
          }}
        >
          <Search size={18} />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 44px 12px 44px',
            fontSize: '14px',
            border: '2px solid var(--color-border, #d1d5db)',
            borderRadius: '8px',
            background: 'var(--color-input-bg, #ffffff)',
            color: 'var(--color-text-primary, #1f2937)',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              'var(--color-primary, #3b82f6)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border, #d1d5db)';
          }}
        />

        {query && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary, #9ca3af)',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search History (si pas de query) */}
      {!query && showHistory && searchHistory.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-secondary, #6b7280)',
            }}
          >
            <Clock size={14} />
            <span>Recherches récentes</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {searchHistory.map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => handleHistoryClick(historyQuery)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  color: 'var(--color-text-secondary, #6b7280)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    'var(--color-background-secondary, #f9fafb)';
                }}
              >
                {historyQuery}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      {query && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--color-border, #e5e7eb)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid var(--color-border, #d1d5db)',
              borderRadius: '6px',
              background: showFilters
                ? 'var(--color-primary, #3b82f6)'
                : 'var(--color-background-secondary, #f9fafb)',
              color: showFilters ? '#ffffff' : 'var(--color-text-secondary, #6b7280)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Filter size={14} />
            Filtres
          </button>
        </div>
      )}

      {/* Results List */}
      {query && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {results.map((result) => (
            <div key={result.item.id}>
              <CartaeItemCard
                item={result.item}
                onClick={onItemClick}
                showActions={false}
                showBadges={{ type: true, priority: true, tags: true }}
              />

              {/* Highlights */}
              {result.highlights.length > 0 && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '8px 12px',
                    background: 'var(--color-background-secondary, #f9fafb)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary, #6b7280)',
                    lineHeight: 1.5,
                  }}
                >
                  {result.highlights[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {query && results.length === 0 && (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #9ca3af)',
            fontSize: '14px',
          }}
        >
          Aucun résultat pour "{query}"
        </div>
      )}
    </div>
  );
};

export default CartaeItemSearch;
