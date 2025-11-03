import { describe, it, expect } from 'vitest';
import type { CartaeItem } from '@cartae/core';
import {
  cartaeItemsToTable,
  applyFilters,
  applySorting,
  applySearch,
  applyPagination,
  exportToCSV,
  exportToJSON,
} from '../converters/cartaeItemsToTable';
import { DEFAULT_COLUMNS } from '../types/TableTypes';

// Mock CartaeItems pour les tests
const mockItems: CartaeItem[] = [
  {
    id: '1',
    title: 'Email urgent CEO',
    type: 'email',
    source: {
      connector: 'office365',
      originalId: 'msg-1',
      lastSync: new Date('2025-11-01T10:00:00Z'),
    },
    content: 'Meeting tomorrow at 10am',
    metadata: {
      priority: 'high',
      status: 'new',
      customFields: {},
    },
    tags: ['urgent', 'meeting'],
    relationships: [],
    createdAt: new Date('2025-11-01T10:00:00Z'),
    updatedAt: new Date('2025-11-01T10:00:00Z'),
  },
  {
    id: '2',
    title: 'Project proposal document',
    type: 'document',
    source: {
      connector: 'sharepoint',
      originalId: 'doc-1',
      lastSync: new Date('2025-10-28T14:30:00Z'),
    },
    content: 'Q4 roadmap proposal',
    metadata: {
      priority: 'medium',
      status: 'in_progress',
      customFields: {},
    },
    tags: ['project', 'roadmap'],
    relationships: [],
    createdAt: new Date('2025-10-28T14:30:00Z'),
    updatedAt: new Date('2025-10-28T14:30:00Z'),
  },
  {
    id: '3',
    title: 'Bug fix PR review',
    type: 'task',
    source: {
      connector: 'github',
      originalId: 'pr-123',
      lastSync: new Date('2025-11-02T09:15:00Z'),
    },
    content: 'Fix authentication issue',
    metadata: {
      priority: 'urgent',
      status: 'review',
      customFields: {},
    },
    tags: ['bug', 'auth'],
    relationships: [],
    createdAt: new Date('2025-11-02T09:15:00Z'),
    updatedAt: new Date('2025-11-02T09:15:00Z'),
  },
];

describe('cartaeItemsToTable', () => {
  describe('applyFilters', () => {
    it('filtre par equals', () => {
      const result = applyFilters(mockItems, [
        { columnId: 'type', value: 'email', operator: 'equals' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filtre par contains', () => {
      const result = applyFilters(mockItems, [
        { columnId: 'title', value: 'project', operator: 'contains' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filtre par in (multiple values)', () => {
      const result = applyFilters(mockItems, [
        { columnId: 'type', value: ['email', 'task'], operator: 'in' },
      ]);
      expect(result).toHaveLength(2);
    });

    it('applique plusieurs filtres (AND)', () => {
      const result = applyFilters(mockItems, [
        { columnId: 'metadata.priority', value: 'urgent', operator: 'equals' },
        { columnId: 'type', value: 'task', operator: 'equals' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('retourne tous items si aucun filtre', () => {
      const result = applyFilters(mockItems, []);
      expect(result).toHaveLength(3);
    });
  });

  describe('applySorting', () => {
    it('trie par titre ascendant', () => {
      const result = applySorting(mockItems, { columnId: 'title', direction: 'asc' });
      expect(result[0].id).toBe('3'); // "Bug fix..." comes first
      expect(result[2].id).toBe('2'); // "Project..." comes last
    });

    it('trie par titre descendant', () => {
      const result = applySorting(mockItems, { columnId: 'title', direction: 'desc' });
      expect(result[0].id).toBe('2'); // "Project..." comes first
      expect(result[2].id).toBe('3'); // "Bug fix..." comes last
    });

    it('trie par date ascendant', () => {
      const result = applySorting(mockItems, { columnId: 'updatedAt', direction: 'asc' });
      expect(result[0].id).toBe('2'); // Oct 28
      expect(result[2].id).toBe('3'); // Nov 2
    });

    it('trie par date descendant', () => {
      const result = applySorting(mockItems, { columnId: 'updatedAt', direction: 'desc' });
      expect(result[0].id).toBe('3'); // Nov 2
      expect(result[2].id).toBe('2'); // Oct 28
    });

    it('retourne items inchangés si pas de tri', () => {
      const result = applySorting(mockItems, undefined);
      expect(result).toEqual(mockItems);
    });
  });

  describe('applySearch', () => {
    it('recherche dans le titre', () => {
      const result = applySearch(mockItems, 'CEO');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('recherche dans le contenu', () => {
      const result = applySearch(mockItems, 'roadmap');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('recherche dans les tags', () => {
      const result = applySearch(mockItems, 'auth');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('recherche dans le type', () => {
      const result = applySearch(mockItems, 'email');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('recherche case-insensitive', () => {
      const result = applySearch(mockItems, 'URGENT');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('retourne tous items si query vide', () => {
      const result = applySearch(mockItems, '');
      expect(result).toHaveLength(3);
    });

    it('retourne tableau vide si aucun match', () => {
      const result = applySearch(mockItems, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('applyPagination', () => {
    it('retourne première page', () => {
      const result = applyPagination(mockItems, 2, 1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('retourne deuxième page', () => {
      const result = applyPagination(mockItems, 2, 2);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('retourne tous items si pas de pagination', () => {
      const result = applyPagination(mockItems, undefined, undefined);
      expect(result).toEqual(mockItems);
    });
  });

  describe('cartaeItemsToTable', () => {
    it('applique recherche + tri + filtres + pagination', () => {
      const config = {
        columns: DEFAULT_COLUMNS,
        searchQuery: 'project',
        sorting: { columnId: 'title', direction: 'asc' as const },
        filters: [{ columnId: 'type', value: 'document', operator: 'equals' as const }],
        enablePagination: true,
        pageSize: 10,
        currentPage: 1,
      };

      const result = cartaeItemsToTable(mockItems, config);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('2');
      expect(result.totalItems).toBe(3);
      expect(result.filteredItems).toBe(1);
    });

    it('retourne tous items sans config', () => {
      const config = {
        columns: DEFAULT_COLUMNS,
      };

      const result = cartaeItemsToTable(mockItems, config);

      expect(result.items).toHaveLength(3);
      expect(result.totalItems).toBe(3);
      expect(result.filteredItems).toBe(3);
    });
  });

  describe('exportToCSV', () => {
    it('génère CSV avec header et données', () => {
      const csv = exportToCSV(mockItems.slice(0, 2), DEFAULT_COLUMNS);

      expect(csv).toContain('Title,Type,Source,Date,Tags,Priority,Status');
      expect(csv).toContain('Email urgent CEO');
      expect(csv).toContain('office365'); // source.connector
      expect(csv).toContain('"urgent, meeting"'); // Tags as array
    });

    it('échappe les virgules et guillemets', () => {
      const itemWithComma: CartaeItem = {
        ...mockItems[0],
        title: 'Email, urgent, CEO',
      };

      const csv = exportToCSV([itemWithComma], DEFAULT_COLUMNS);

      expect(csv).toContain('"Email, urgent, CEO"');
    });
  });

  describe('exportToJSON', () => {
    it('génère JSON formaté', () => {
      const json = exportToJSON(mockItems.slice(0, 1));

      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('1');
      expect(parsed[0].title).toBe('Email urgent CEO');
    });
  });
});
