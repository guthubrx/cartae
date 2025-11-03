import type { CartaeItem } from '@cartae/core';
import type { FilterState, SortState, TableConfig } from '../types/TableTypes';

/**
 * Applique les filtres sur les items
 */
export function applyFilters(items: CartaeItem[], filters: FilterState[]): CartaeItem[] {
  if (!filters || filters.length === 0) {
    return items;
  }

  return items.filter(item =>
    filters.every(filter => {
      const value = getNestedValue(item, filter.columnId);

      if (value === null || value === undefined) {
        return false;
      }

      const stringValue = String(value).toLowerCase();
      const filterValue = Array.isArray(filter.value)
        ? filter.value.map(v => String(v).toLowerCase())
        : String(filter.value).toLowerCase();

      switch (filter.operator) {
        case 'equals':
          return stringValue === filterValue;
        case 'contains':
          return stringValue.includes(filterValue as string);
        case 'startsWith':
          return stringValue.startsWith(filterValue as string);
        case 'endsWith':
          return stringValue.endsWith(filterValue as string);
        case 'in':
          return Array.isArray(filterValue) && filterValue.includes(stringValue);
        default:
          return true;
      }
    })
  );
}

/**
 * Applique le tri sur les items
 */
export function applySorting(items: CartaeItem[], sorting?: SortState): CartaeItem[] {
  if (!sorting) {
    return items;
  }

  return [...items].sort((a, b) => {
    const aValue = getNestedValue(a, sorting.columnId);
    const bValue = getNestedValue(b, sorting.columnId);

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return sorting.direction === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return sorting.direction === 'asc' ? -1 : 1;

    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return sorting.direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Handle arrays (tags)
    if (Array.isArray(aValue) && Array.isArray(bValue)) {
      const aStr = aValue.join(',');
      const bStr = bValue.join(',');
      return sorting.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }

    // Handle strings and numbers
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (sorting.direction === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    }
    return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
  });
}

/**
 * Applique la recherche globale sur les items
 */
export function applySearch(items: CartaeItem[], searchQuery?: string): CartaeItem[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return items;
  }

  const query = searchQuery.toLowerCase();

  return items.filter(item => {
    // Search in title
    if (item.title.toLowerCase().includes(query)) {
      return true;
    }

    // Search in content
    if (item.content?.toLowerCase().includes(query)) {
      return true;
    }

    // Search in tags
    if (item.tags?.some(tag => tag.toLowerCase().includes(query))) {
      return true;
    }

    // Search in type
    if (item.type.toLowerCase().includes(query)) {
      return true;
    }

    // Search in source connector
    if (item.source.connector.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });
}

/**
 * Applique la pagination sur les items
 */
export function applyPagination(
  items: CartaeItem[],
  pageSize?: number,
  currentPage?: number
): CartaeItem[] {
  if (!pageSize || !currentPage) {
    return items;
  }

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return items.slice(start, end);
}

/**
 * Convertit CartaeItem[] en données table avec filtrage/tri/pagination
 */
export function cartaeItemsToTable(
  items: CartaeItem[],
  config: TableConfig
): {
  items: CartaeItem[];
  totalItems: number;
  filteredItems: number;
} {
  let processedItems = [...items];

  // 1. Apply search
  if (config.searchQuery) {
    processedItems = applySearch(processedItems, config.searchQuery);
  }

  // 2. Apply filters
  if (config.filters && config.filters.length > 0) {
    processedItems = applyFilters(processedItems, config.filters);
  }

  const filteredCount = processedItems.length;

  // 3. Apply sorting
  if (config.sorting) {
    processedItems = applySorting(processedItems, config.sorting);
  }

  // 4. Apply pagination
  if (config.enablePagination && config.pageSize && config.currentPage) {
    processedItems = applyPagination(processedItems, config.pageSize, config.currentPage);
  }

  return {
    items: processedItems,
    totalItems: items.length,
    filteredItems: filteredCount,
  };
}

/**
 * Récupère une valeur imbriquée d'un objet via un chemin (ex: "metadata.priority")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Exporte les items en CSV
 */
export function exportToCSV(items: CartaeItem[], columns: TableConfig['columns']): string {
  const visibleColumns = columns.filter(col => col.visible);

  // Header row
  const header = visibleColumns.map(col => col.header).join(',');

  // Data rows
  const rows = items.map(item =>
    visibleColumns
      .map(col => {
        const value = getNestedValue(item, col.accessorKey);

        if (value === null || value === undefined) {
          return '';
        }

        if (Array.isArray(value)) {
          return `"${value.join(', ')}"`;
        }

        if (value instanceof Date) {
          return value.toISOString();
        }

        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Exporte les items en JSON
 */
export function exportToJSON(items: CartaeItem[]): string {
  return JSON.stringify(items, null, 2);
}
