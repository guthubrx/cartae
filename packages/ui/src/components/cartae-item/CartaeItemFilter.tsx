/**
 * CartaeItemFilter - Panneau de filtres avancés pour CartaeItems
 *
 * Filtres disponibles :
 * - Types d'items (email, task, document, etc.)
 * - Priorités (low, medium, high, urgent)
 * - Status (new, in_progress, completed, etc.)
 * - Tags (multi-select)
 * - Sources (connectors)
 * - Plages de dates (création, modification, due date)
 * - Archivés / Favoris
 * - Auteur
 *
 * Peut être utilisé en sidebar, modal ou inline.
 */

import React, { useState, useEffect } from 'react';
import type { CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel, ItemStatus } from '@cartae/core/types/CartaeMetadata';
import {
  Filter,
  X,
  Check,
  Calendar,
  Tag as TagIcon,
  User,
  Folder,
  Archive,
  Star,
  RotateCcw,
} from 'lucide-react';

/**
 * Filtres actifs
 */
export interface CartaeItemFilters {
  /**
   * Types sélectionnés
   */
  types?: CartaeItemType[];

  /**
   * Priorités sélectionnées
   */
  priorities?: PriorityLevel[];

  /**
   * Status sélectionnés
   */
  statuses?: ItemStatus[];

  /**
   * Tags sélectionnés
   */
  tags?: string[];

  /**
   * Sources sélectionnées
   */
  sources?: string[];

  /**
   * Date de création après
   */
  createdAfter?: Date;

  /**
   * Date de création avant
   */
  createdBefore?: Date;

  /**
   * Date de modification après
   */
  updatedAfter?: Date;

  /**
   * Date de modification avant
   */
  updatedBefore?: Date;

  /**
   * Due date après
   */
  dueAfter?: Date;

  /**
   * Due date avant
   */
  dueBefore?: Date;

  /**
   * Inclure archivés
   */
  includeArchived?: boolean;

  /**
   * Seulement favoris
   */
  onlyFavorites?: boolean;

  /**
   * Auteurs
   */
  authors?: string[];
}

/**
 * Props pour CartaeItemFilter
 */
export interface CartaeItemFilterProps {
  /**
   * Filtres actifs
   */
  filters: CartaeItemFilters;

  /**
   * Callback quand filtres changent
   */
  onFiltersChange: (filters: CartaeItemFilters) => void;

  /**
   * Tags disponibles (pour autocomplete)
   */
  availableTags?: string[];

  /**
   * Sources disponibles
   */
  availableSources?: string[];

  /**
   * Auteurs disponibles
   */
  availableAuthors?: string[];

  /**
   * Afficher bouton Reset
   */
  showResetButton?: boolean;

  /**
   * Afficher compteur de filtres actifs
   */
  showActiveCount?: boolean;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Types d'items disponibles
const ITEM_TYPES: { value: CartaeItemType; label: string; color: string }[] = [
  { value: 'email', label: 'Email', color: '#3b82f6' },
  { value: 'task', label: 'Tâche', color: '#10b981' },
  { value: 'document', label: 'Document', color: '#8b5cf6' },
  { value: 'message', label: 'Message', color: '#f59e0b' },
  { value: 'event', label: 'Événement', color: '#ef4444' },
  { value: 'note', label: 'Note', color: '#ec4899' },
  { value: 'contact', label: 'Contact', color: '#06b6d4' },
  { value: 'file', label: 'Fichier', color: '#64748b' },
];

// Priorités disponibles
const PRIORITIES: { value: PriorityLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Basse', color: '#64748b' },
  { value: 'medium', label: 'Moyenne', color: '#f59e0b' },
  { value: 'high', label: 'Haute', color: '#ef4444' },
  { value: 'urgent', label: 'Urgente', color: '#991b1b' },
];

// Status disponibles
const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'pending', label: 'En attente' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'blocked', label: 'Bloqué' },
];

/**
 * Compter filtres actifs
 */
const countActiveFilters = (filters: CartaeItemFilters): number => {
  let count = 0;

  if (filters.types && filters.types.length > 0) count++;
  if (filters.priorities && filters.priorities.length > 0) count++;
  if (filters.statuses && filters.statuses.length > 0) count++;
  if (filters.tags && filters.tags.length > 0) count++;
  if (filters.sources && filters.sources.length > 0) count++;
  if (filters.createdAfter || filters.createdBefore) count++;
  if (filters.updatedAfter || filters.updatedBefore) count++;
  if (filters.dueAfter || filters.dueBefore) count++;
  if (filters.includeArchived) count++;
  if (filters.onlyFavorites) count++;
  if (filters.authors && filters.authors.length > 0) count++;

  return count;
};

/**
 * CartaeItemFilter - Composant principal
 */
export const CartaeItemFilter: React.FC<CartaeItemFilterProps> = ({
  filters,
  onFiltersChange,
  availableTags = [],
  availableSources = [],
  availableAuthors = [],
  showResetButton = true,
  showActiveCount = true,
  style,
  className = '',
}) => {
  const activeCount = countActiveFilters(filters);

  // Toggle type
  const toggleType = (type: CartaeItemType) => {
    const current = filters.types || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, types: updated });
  };

  // Toggle priority
  const togglePriority = (priority: PriorityLevel) => {
    const current = filters.priorities || [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priorities: updated });
  };

  // Toggle status
  const toggleStatus = (status: ItemStatus) => {
    const current = filters.statuses || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, statuses: updated });
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onFiltersChange({ ...filters, tags: updated });
  };

  // Toggle source
  const toggleSource = (source: string) => {
    const current = filters.sources || [];
    const updated = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    onFiltersChange({ ...filters, sources: updated });
  };

  // Toggle author
  const toggleAuthor = (author: string) => {
    const current = filters.authors || [];
    const updated = current.includes(author)
      ? current.filter((a) => a !== author)
      : [...current, author];
    onFiltersChange({ ...filters, authors: updated });
  };

  // Reset all filters
  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div
      className={`cartae-item-filter ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} style={{ color: 'var(--color-text-primary, #1f2937)' }} />
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
            }}
          >
            Filtres
          </h3>
          {showActiveCount && activeCount > 0 && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--color-primary, #3b82f6)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {activeCount}
            </span>
          )}
        </div>

        {showResetButton && activeCount > 0 && (
          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
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
            <RotateCcw size={12} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Types Section */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '8px',
          }}
        >
          Types
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ITEM_TYPES.map((itemType) => {
            const isSelected = filters.types?.includes(itemType.value);
            return (
              <button
                key={itemType.value}
                onClick={() => toggleType(itemType.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: isSelected
                    ? `2px solid ${itemType.color}`
                    : '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: isSelected ? `${itemType.color}22` : 'var(--color-background-secondary, #f9fafb)',
                  color: isSelected ? itemType.color : 'var(--color-text-secondary, #6b7280)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={14} />}
                {itemType.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priorities Section */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '8px',
          }}
        >
          Priorités
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PRIORITIES.map((priority) => {
            const isSelected = filters.priorities?.includes(priority.value);
            return (
              <button
                key={priority.value}
                onClick={() => togglePriority(priority.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: isSelected
                    ? `2px solid ${priority.color}`
                    : '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: isSelected ? `${priority.color}22` : 'var(--color-background-secondary, #f9fafb)',
                  color: isSelected ? priority.color : 'var(--color-text-secondary, #6b7280)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={14} />}
                {priority.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Section */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '8px',
          }}
        >
          Statuts
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {STATUSES.map((status) => {
            const isSelected = filters.statuses?.includes(status.value);
            return (
              <button
                key={status.value}
                onClick={() => toggleStatus(status.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: isSelected
                    ? '2px solid var(--color-primary, #3b82f6)'
                    : '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: isSelected ? '#dbeafe' : 'var(--color-background-secondary, #f9fafb)',
                  color: isSelected
                    ? 'var(--color-primary, #3b82f6)'
                    : 'var(--color-text-secondary, #6b7280)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={14} />}
                {status.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags Section */}
      {availableTags.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #374151)',
              marginBottom: '8px',
            }}
          >
            <TagIcon size={14} />
            Tags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {availableTags.slice(0, 20).map((tag) => {
              const isSelected = filters.tags?.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 500,
                    border: isSelected
                      ? '2px solid #10b981'
                      : '1px solid var(--color-border, #d1d5db)',
                    borderRadius: '4px',
                    background: isSelected ? '#d1fae5' : '#f3f4f6',
                    color: isSelected ? '#10b981' : '#4b5563',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources Section */}
      {availableSources.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #374151)',
              marginBottom: '8px',
            }}
          >
            <Folder size={14} />
            Sources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {availableSources.map((source) => {
              const isSelected = filters.sources?.includes(source);
              return (
                <label
                  key={source}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: isSelected ? '#f0f9ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSource(source)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, #6b7280)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {source}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Special Filters */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '8px',
          }}
        >
          Options
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            marginBottom: '6px',
            borderRadius: '6px',
            background: filters.includeArchived ? '#fef3c7' : 'transparent',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={filters.includeArchived || false}
            onChange={(e) =>
              onFiltersChange({ ...filters, includeArchived: e.target.checked })
            }
            style={{ cursor: 'pointer' }}
          />
          <Archive size={14} style={{ color: '#6b7280' }} />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #6b7280)' }}>
            Inclure archivés
          </span>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '6px',
            background: filters.onlyFavorites ? '#fef3c7' : 'transparent',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={filters.onlyFavorites || false}
            onChange={(e) => onFiltersChange({ ...filters, onlyFavorites: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <Star size={14} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #6b7280)' }}>
            Seulement favoris
          </span>
        </label>
      </div>
    </div>
  );
};

export default CartaeItemFilter;
