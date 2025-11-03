import type { CartaeItem } from '@cartae/core';

/**
 * Status représentant les colonnes du Kanban
 */
export type KanbanStatus = 'backlog' | 'in_progress' | 'review' | 'done';

/**
 * Carte Kanban avec données CartaeItem enrichies
 */
export interface KanbanCard {
  id: string;
  originalItem: CartaeItem;
  status: KanbanStatus;
  title: string;
  content?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  assignee?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Colonne Kanban contenant plusieurs cartes
 */
export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  cards: KanbanCard[];
  color: string;
  order: number;
}

/**
 * Configuration complète du board Kanban
 */
export interface KanbanBoard {
  columns: KanbanColumn[];
  totalCards: number;
  lastUpdated: Date;
}

/**
 * Configuration des colonnes par défaut
 */
export const DEFAULT_COLUMNS: Omit<KanbanColumn, 'cards'>[] = [
  { id: 'backlog', title: 'Backlog', color: '#94a3b8', order: 0 },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6', order: 1 },
  { id: 'review', title: 'Review', color: '#f59e0b', order: 2 },
  { id: 'done', title: 'Done', color: '#10b981', order: 3 },
];
