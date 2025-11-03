import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CartaeItem } from '@cartae/core';
import type { IPluginContext } from '@cartae/plugin-system';
import { TablePlugin } from '../TablePlugin';

// Mock IPluginContext
const mockContext: IPluginContext = {
  events: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  },
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
};

// Mock CartaeItems
const mockItems: CartaeItem[] = [
  {
    id: '1',
    title: 'Test Email',
    type: 'email',
    source: {
      connector: 'office365',
      originalId: 'msg-1',
      lastSync: new Date('2025-11-01T10:00:00Z'),
    },
    content: 'Important meeting',
    metadata: {
      priority: 'high',
      status: 'new',
      customFields: {},
    },
    tags: ['urgent'],
    relationships: [],
    createdAt: new Date('2025-11-01T10:00:00Z'),
    updatedAt: new Date('2025-11-01T10:00:00Z'),
  },
  {
    id: '2',
    title: 'Test Document',
    type: 'document',
    source: {
      connector: 'sharepoint',
      originalId: 'doc-1',
      lastSync: new Date('2025-10-28T14:30:00Z'),
    },
    content: 'Project proposal',
    metadata: {
      priority: 'medium',
      status: 'in_progress',
      customFields: {},
    },
    tags: ['project'],
    relationships: [],
    createdAt: new Date('2025-10-28T14:30:00Z'),
    updatedAt: new Date('2025-10-28T14:30:00Z'),
  },
];

describe('TablePlugin', () => {
  let plugin: TablePlugin;

  beforeEach(() => {
    plugin = new TablePlugin();
    vi.clearAllMocks();
  });

  describe('Plugin Metadata', () => {
    it('a les bonnes métadonnées', () => {
      expect(plugin.manifest.id).toBe('table-plugin');
      expect(plugin.manifest.name).toBe('Table Plugin');
      expect(plugin.manifest.version).toBe('0.1.0');
      expect(plugin.manifest.description).toBeTruthy();
    });

    it('déclare les bonnes capabilities', () => {
      expect(plugin.capabilities.canEdit).toBe(false);
      expect(plugin.capabilities.canSelectMultiple).toBe(true);
      expect(plugin.capabilities.canDragDrop).toBe(false);
      expect(plugin.capabilities.canZoomPan).toBe(false);
      expect(plugin.capabilities.canExport).toBe(true);
      expect(plugin.capabilities.exportFormats).toContain('json');
      expect(plugin.capabilities.exportFormats).toHaveLength(1); // Only JSON via standard interface
      // Note: CSV export available via exportToCSV() helper method
    });
  });

  describe('activate/deactivate', () => {
    it('active le plugin avec contexte', async () => {
      await plugin.activate(mockContext);
      expect(plugin['context']).toBe(mockContext);
    });

    it('désactive le plugin et nettoie', async () => {
      await plugin.activate(mockContext);
      await plugin.deactivate();
      expect(plugin['context']).toBeUndefined();
    });
  });

  describe('render', () => {
    beforeEach(async () => {
      await plugin.activate(mockContext);
    });

    it('rend la table avec items', async () => {
      const result = await plugin.render(mockItems, { containerId: 'test-container' });

      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(2);
      expect(result.renderedAt).toBeInstanceOf(Date);
    });

    it('émet event table:render', async () => {
      await plugin.render(mockItems, { containerId: 'test-container' });

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:render', {
        items: expect.any(Array),
        config: expect.any(Object),
        containerId: 'test-container',
      });
    });

    it('applique config custom', async () => {
      const customConfig = {
        pageSize: 10,
        currentPage: 1,
        searchQuery: 'Test',
      };

      await plugin.render(mockItems, {
        containerId: 'test-container',
        config: customConfig,
      });

      const state = plugin.getState();
      expect(state.config.pageSize).toBe(10);
      expect(state.config.searchQuery).toBe('Test');
    });
  });

  describe('update', () => {
    it('met à jour avec nouveaux items', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      const newItems = mockItems.slice(0, 1);
      const result = await plugin.update(newItems);

      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1);
    });

    it('throw error si pas de containerId', async () => {
      await plugin.activate(mockContext);

      await expect(plugin.update(mockItems)).rejects.toThrow('no container ID set');
    });
  });

  describe('refresh', () => {
    it('rafraîchit la table', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      vi.clearAllMocks();
      await plugin.refresh();

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:render', expect.any(Object));
    });

    it('log warning si pas de containerId', async () => {
      await plugin.activate(mockContext);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await plugin.refresh();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot refresh: no container ID set')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('selectItems', () => {
    it('sélectionne des items', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.selectItems(['1']);

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:select', { itemIds: ['1'] });
    });

    it('getSelectedItems retourne items sélectionnés', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.selectItems(['1', '2']);
      const selected = plugin.getSelectedItems();

      expect(selected).toHaveLength(2);
      expect(selected[0].id).toBe('1');
      expect(selected[1].id).toBe('2');
    });
  });

  describe('sort', () => {
    it('applique un tri', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.sort('title', 'asc');

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:sort', {
        columnId: 'title',
        direction: 'asc',
      });

      const state = plugin.getState();
      expect(state.config.sorting).toEqual({ columnId: 'title', direction: 'asc' });
    });
  });

  describe('filter', () => {
    it('applique des filtres', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      const filters = [{ columnId: 'type', value: 'email', operator: 'equals' as const }];
      await plugin.filter(filters);

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:filter', { filters });

      const state = plugin.getState();
      expect(state.config.filters).toEqual(filters);
    });
  });

  describe('search', () => {
    it('applique une recherche', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.search('Test');

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:search', { query: 'Test' });

      const state = plugin.getState();
      expect(state.config.searchQuery).toBe('Test');
    });
  });

  describe('setPage', () => {
    it('change de page', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.setPage(2);

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:page-changed', { page: 2 });

      const state = plugin.getState();
      expect(state.config.currentPage).toBe(2);
    });
  });

  describe('toggleColumnVisibility', () => {
    it('change visibilité colonne', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.toggleColumnVisibility('tags', false);

      expect(mockContext.events.emit).toHaveBeenCalledWith('table:column-visibility-changed', {
        columnId: 'tags',
        visible: false,
      });

      const state = plugin.getState();
      const tagsColumn = state.config.columns.find(col => col.id === 'tags');
      expect(tagsColumn?.visible).toBe(false);
    });
  });

  describe('export', () => {
    beforeEach(async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });
    });

    it('exporte en JSON via interface standard', async () => {
      const blob = await plugin.export('json');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);
      // Note: Blob content reading not fully supported in jsdom
      // JSON export functionality is tested in cartaeItemsToTable.test.ts
    });

    it('exporte en CSV via méthode helper', async () => {
      const blob = await plugin.exportToCSV();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
      expect(blob.size).toBeGreaterThan(0);
      // Note: Blob content reading not fully supported in jsdom
      // CSV export functionality is tested in cartaeItemsToTable.test.ts
    });

    it('throw error pour format non supporté', async () => {
      await expect(plugin.export('pdf')).rejects.toThrow('Unsupported export format');
    });
  });

  describe('getViewState/setViewState', () => {
    it('récupère et définit view state', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });

      await plugin.selectItems(['1']);
      await plugin.sort('title', 'desc');

      const state = plugin.getViewState();

      expect(state.config).toBeDefined();
      expect(state.selectedItems).toEqual(['1']);

      // Reset plugin
      const newPlugin = new TablePlugin();
      await newPlugin.activate(mockContext);
      await newPlugin.render(mockItems, { containerId: 'test-container' });
      await newPlugin.setViewState(state);

      const restoredState = newPlugin.getState();
      expect(restoredState.selectedItems).toEqual(['1']);
      expect(restoredState.config.sorting?.direction).toBe('desc');
    });
  });

  describe('cleanup', () => {
    it('nettoie toutes les ressources', async () => {
      await plugin.activate(mockContext);
      await plugin.render(mockItems, { containerId: 'test-container' });
      await plugin.selectItems(['1']);

      await plugin.cleanup();

      const state = plugin.getState();
      expect(state.items).toHaveLength(0);
      expect(state.selectedItems).toHaveLength(0);
      expect(state.totalItems).toBe(0);
    });
  });
});
