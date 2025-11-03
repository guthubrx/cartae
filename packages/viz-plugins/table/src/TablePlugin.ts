import type { CartaeItem } from '@cartae/core';
import type {
  VizPluginInterface,
  VizCapabilities,
  RenderOptions,
  RenderResult,
  IPluginContext,
  PluginManifest,
} from '@cartae/plugin-system';
import { cartaeItemsToTable, exportToCSV, exportToJSON } from './converters/cartaeItemsToTable';
import type {
  TableConfig,
  TableState,
  DEFAULT_COLUMNS,
  FilterState,
  SortState,
} from './types/TableTypes';
import { DEFAULT_COLUMNS as COLUMNS } from './types/TableTypes';

/**
 * Table Plugin - Affiche les CartaeItems dans un tableau interactif
 * avec TanStack Table v8
 */
export class TablePlugin implements VizPluginInterface {
  public readonly manifest: PluginManifest = {
    id: 'table-plugin',
    name: 'Table Plugin',
    version: '0.1.0',
    description: 'Interactive data table with filtering, sorting, and search',
    author: 'Cartae Team',
    main: './dist/index.js',
    category: 'productivity',
  };

  public readonly capabilities: VizCapabilities = {
    canEdit: false,
    canSelectMultiple: true,
    canDragDrop: false,
    canZoomPan: false,
    canExport: true,
    exportFormats: ['json'],
  };

  private context?: IPluginContext;

  private currentItems: CartaeItem[] = [];

  private currentState: TableState = {
    items: [],
    config: {
      columns: COLUMNS,
      enablePagination: true,
      enableSearch: true,
      enableColumnVisibility: true,
      pageSize: 50,
      currentPage: 1,
    },
    selectedItems: [],
    totalItems: 0,
    filteredItems: 0,
  };

  private containerId?: string;

  /**
   * Active le plugin
   */
  async activate(context: IPluginContext): Promise<void> {
    this.context = context;
    console.log('[TablePlugin] Plugin activé');
  }

  /**
   * Désactive le plugin
   */
  async deactivate(): Promise<void> {
    await this.cleanup();
    this.context = undefined;
    console.log('[TablePlugin] Plugin désactivé');
  }

  /**
   * Rend la table avec les items
   */
  async render(items: CartaeItem[], options: RenderOptions): Promise<RenderResult> {
    this.currentItems = items;
    this.containerId = options.containerId;

    // Merge config if provided
    if (options.config) {
      this.currentState.config = {
        ...this.currentState.config,
        ...options.config,
      };
    }

    // Process items (filter, sort, paginate)
    const {
      items: processedItems,
      totalItems,
      filteredItems,
    } = cartaeItemsToTable(items, this.currentState.config);

    this.currentState.items = processedItems;
    this.currentState.totalItems = totalItems;
    this.currentState.filteredItems = filteredItems;

    // Emit event for React component to render
    if (this.context) {
      this.context.events.emit('table:render', {
        items: processedItems,
        config: this.currentState.config,
        containerId: options.containerId,
      });
    }

    return {
      success: true,
      renderedAt: new Date(),
      itemCount: processedItems.length,
    };
  }

  /**
   * Met à jour la table avec de nouveaux items
   */
  async update(items: CartaeItem[]): Promise<RenderResult> {
    if (!this.containerId) {
      throw new Error('[TablePlugin] Cannot update: no container ID set');
    }

    return this.render(items, { containerId: this.containerId });
  }

  /**
   * Rafraîchit la table
   */
  async refresh(): Promise<void> {
    if (!this.containerId) {
      console.warn('[TablePlugin] Cannot refresh: no container ID set');
      return;
    }

    await this.render(this.currentItems, { containerId: this.containerId });
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    this.currentItems = [];
    this.currentState = {
      items: [],
      config: {
        columns: COLUMNS,
        enablePagination: true,
        enableSearch: true,
        enableColumnVisibility: true,
        pageSize: 50,
        currentPage: 1,
      },
      selectedItems: [],
      totalItems: 0,
      filteredItems: 0,
    };
    this.containerId = undefined;
  }

  /**
   * Récupère les items sélectionnés
   */
  getSelectedItems(): CartaeItem[] {
    return this.currentItems.filter(item => this.currentState.selectedItems.includes(item.id));
  }

  /**
   * Sélectionne des items
   */
  async selectItems(itemIds: string[]): Promise<void> {
    this.currentState.selectedItems = itemIds;

    if (this.context) {
      this.context.events.emit('table:select', { itemIds });
    }
  }

  /**
   * Exporte la table
   * Note: Only 'json' format is supported via standard VizPluginInterface.
   * For CSV export, use exportToCSV() utility function directly.
   */
  async export(format: 'png' | 'svg' | 'pdf' | 'json'): Promise<Blob> {
    if (format !== 'json') {
      throw new Error(
        `[TablePlugin] Unsupported export format: ${format}. Only 'json' is supported.`
      );
    }

    const content = exportToJSON(this.currentState.items);
    return new Blob([content], { type: 'application/json' });
  }

  /**
   * Exporte la table en CSV (méthode helper non-standard)
   */
  async exportToCSV(): Promise<Blob> {
    const content = exportToCSV(this.currentState.items, this.currentState.config.columns);
    return new Blob([content], { type: 'text/csv' });
  }

  /**
   * Récupère l'état de la vue
   */
  getViewState(): Record<string, unknown> {
    return {
      config: this.currentState.config,
      selectedItems: this.currentState.selectedItems,
    };
  }

  /**
   * Définit l'état de la vue
   */
  async setViewState(state: Record<string, unknown>): Promise<void> {
    if (state.config) {
      this.currentState.config = state.config as TableConfig;
    }

    if (state.selectedItems) {
      this.currentState.selectedItems = state.selectedItems as string[];
    }

    await this.refresh();
  }

  /**
   * Applique un tri
   */
  async sort(columnId: string, direction: 'asc' | 'desc'): Promise<void> {
    this.currentState.config.sorting = { columnId, direction };

    if (this.context) {
      this.context.events.emit('table:sort', { columnId, direction });
    }

    await this.refresh();
  }

  /**
   * Applique des filtres
   */
  async filter(filters: FilterState[]): Promise<void> {
    this.currentState.config.filters = filters;

    if (this.context) {
      this.context.events.emit('table:filter', { filters });
    }

    await this.refresh();
  }

  /**
   * Applique une recherche
   */
  async search(query: string): Promise<void> {
    this.currentState.config.searchQuery = query;

    if (this.context) {
      this.context.events.emit('table:search', { query });
    }

    await this.refresh();
  }

  /**
   * Change de page
   */
  async setPage(page: number): Promise<void> {
    this.currentState.config.currentPage = page;

    if (this.context) {
      this.context.events.emit('table:page-changed', { page });
    }

    await this.refresh();
  }

  /**
   * Change la visibilité d'une colonne
   */
  async toggleColumnVisibility(columnId: string, visible: boolean): Promise<void> {
    const column = this.currentState.config.columns.find(col => col.id === columnId);

    if (column) {
      column.visible = visible;

      if (this.context) {
        this.context.events.emit('table:column-visibility-changed', { columnId, visible });
      }

      await this.refresh();
    }
  }

  /**
   * Récupère l'état actuel de la table
   */
  getState(): TableState {
    return { ...this.currentState };
  }
}
