import type { CartaeItem } from '@cartae/core';

/**
 * Configuration d'une colonne de la table
 */
export interface TableColumn {
  id: string;
  header: string;
  accessorKey: keyof CartaeItem | string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Configuration des colonnes par défaut
 */
export const DEFAULT_COLUMNS: TableColumn[] = [
  {
    id: 'title',
    header: 'Title',
    accessorKey: 'title',
    visible: true,
    sortable: true,
    filterable: true,
    minWidth: 200,
  },
  {
    id: 'type',
    header: 'Type',
    accessorKey: 'type',
    visible: true,
    sortable: true,
    filterable: true,
    width: 120,
  },
  {
    id: 'source',
    header: 'Source',
    accessorKey: 'source.connector',
    visible: true,
    sortable: true,
    filterable: true,
    width: 150,
  },
  {
    id: 'date',
    header: 'Date',
    accessorKey: 'updatedAt',
    visible: true,
    sortable: true,
    filterable: false,
    width: 180,
  },
  {
    id: 'tags',
    header: 'Tags',
    accessorKey: 'tags',
    visible: true,
    sortable: false,
    filterable: true,
    width: 200,
  },
  {
    id: 'priority',
    header: 'Priority',
    accessorKey: 'metadata.priority',
    visible: true,
    sortable: true,
    filterable: true,
    width: 100,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'metadata.status',
    visible: true,
    sortable: true,
    filterable: true,
    width: 120,
  },
];

/**
 * État de tri de la table
 */
export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

/**
 * État des filtres
 */
export interface FilterState {
  columnId: string;
  value: string | string[];
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in';
}

/**
 * Configuration de la table
 */
export interface TableConfig {
  columns: TableColumn[];
  sorting?: SortState;
  filters?: FilterState[];
  searchQuery?: string;
  pageSize?: number;
  currentPage?: number;
  enablePagination?: boolean;
  enableSearch?: boolean;
  enableColumnVisibility?: boolean;
}

/**
 * État complet de la table
 */
export interface TableState {
  items: CartaeItem[];
  config: TableConfig;
  selectedItems: string[];
  totalItems: number;
  filteredItems: number;
}

/**
 * Événements émis par le Table Plugin
 */
export interface TableEvents {
  'table:render': { items: CartaeItem[]; config: TableConfig; containerId: string };
  'table:sort': { columnId: string; direction: 'asc' | 'desc' };
  'table:filter': { filters: FilterState[] };
  'table:search': { query: string };
  'table:select': { itemIds: string[] };
  'table:item-clicked': { item: CartaeItem };
  'table:page-changed': { page: number };
  'table:column-visibility-changed': { columnId: string; visible: boolean };
}

/**
 * Options de rendu pour le Table Plugin
 */
export interface TableRenderOptions {
  containerId: string;
  config?: Partial<TableConfig>;
}
