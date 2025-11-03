import type { CartaeItem } from '@cartae/core';
import type { Plugin, PluginManifest, IPluginContext } from '@cartae/plugin-system';
import { cartaeItemsToKanban } from './converters/cartaeItemToKanban';
import type { KanbanBoard, KanbanColumn, KanbanCard, KanbanStatus } from './types/kanban';
import { DEFAULT_COLUMNS } from './types/kanban';

/**
 * KanbanPlugin - Visualisation en board Kanban avec 4 colonnes et drag & drop
 *
 * Transforme les CartaeItems en cartes Kanban organisées par status:
 * - Backlog: Nouvelles tâches, non commencées
 * - In Progress: Tâches en cours
 * - Review: Tâches en revue ou en attente
 * - Done: Tâches terminées
 */
export class KanbanPlugin implements Plugin {
  readonly manifest: PluginManifest = {
    id: '@cartae/kanban-plugin',
    name: 'Kanban Board',
    version: '1.0.0',
    description: 'Interactive Kanban board with drag & drop, filters, and smart status mapping',
    author: 'Cartae Team',
    main: './dist/index.js',
    permissions: ['storage'],
  };

  private cards: KanbanCard[] = [];
  private filters: {
    tags?: string[];
    priority?: string[];
    assignee?: string;
    search?: string;
  } = {};

  /**
   * Active le plugin
   */
  async activate(_context: IPluginContext): Promise<void> {
    // Plugin activé
  }

  /**
   * Désactive le plugin
   */
  async deactivate(): Promise<void> {
    this.cleanup();
  }

  /**
   * Transforme des CartaeItems en KanbanBoard
   */
  transform(items: CartaeItem[]): KanbanBoard {
    // Convertir items en cartes Kanban
    this.cards = cartaeItemsToKanban(items);

    // Appliquer filtres et générer board
    return this.buildBoard();
  }

  /**
   * Construit le board Kanban avec colonnes et cartes filtrées
   */
  private buildBoard(): KanbanBoard {
    const filteredCards = this.applyFilters(this.cards);
    const columns = this.organizeIntoColumns(filteredCards);

    return {
      columns,
      totalCards: filteredCards.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Organise les cartes filtrées dans les colonnes Kanban
   */
  private organizeIntoColumns(cards: KanbanCard[]): KanbanColumn[] {
    return DEFAULT_COLUMNS.map((columnDef) => {
      const columnCards = cards
        .filter((card) => card.status === columnDef.id)
        .sort((a, b) => {
          // Tri par priorité (urgent > high > medium > low)
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          const aPriority = priorityOrder[a.priority || 'medium'];
          const bPriority = priorityOrder[b.priority || 'medium'];
          if (aPriority !== bPriority) return aPriority - bPriority;

          // Puis par date de mise à jour (plus récent en premier)
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        });

      return {
        ...columnDef,
        cards: columnCards,
      };
    });
  }

  /**
   * Applique les filtres actifs sur les cartes
   */
  private applyFilters(cards: KanbanCard[]): KanbanCard[] {
    let filtered = [...cards];

    if (this.filters.tags && this.filters.tags.length > 0) {
      filtered = filtered.filter((card) =>
        this.filters.tags!.some((tag) => card.tags.includes(tag))
      );
    }

    if (this.filters.priority && this.filters.priority.length > 0) {
      filtered = filtered.filter((card) =>
        card.priority && this.filters.priority!.includes(card.priority)
      );
    }

    if (this.filters.assignee) {
      filtered = filtered.filter((card) =>
        card.assignee === this.filters.assignee
      );
    }

    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter((card) =>
        card.title.toLowerCase().includes(searchLower) ||
        (card.content || '').toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Définit les filtres actifs
   */
  setFilters(filters: typeof this.filters): void {
    this.filters = { ...filters };
  }

  /**
   * Réinitialise tous les filtres
   */
  clearFilters(): void {
    this.filters = {};
  }

  /**
   * Déplace une carte vers une nouvelle colonne (status)
   */
  moveCard(cardId: string, newStatus: KanbanStatus): KanbanCard | null {
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) return null;

    card.status = newStatus;
    card.updatedAt = new Date();

    // Mettre à jour l'item original metadata
    if (card.originalItem.metadata) {
      card.originalItem.metadata.kanbanStatus = newStatus;
    } else {
      card.originalItem.metadata = { kanbanStatus: newStatus };
    }

    return card;
  }

  /**
   * Récupère les statistiques du board
   */
  getStats(): {
    totalCards: number;
    byStatus: Record<KanbanStatus, number>;
    byPriority: Record<string, number>;
  } {
    const byStatus = {
      backlog: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    const byPriority: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };

    this.cards.forEach((card) => {
      byStatus[card.status]++;
      const priority = card.priority || 'none';
      byPriority[priority]++;
    });

    return {
      totalCards: this.cards.length,
      byStatus,
      byPriority,
    };
  }

  /**
   * Recherche des cartes par texte (title + content)
   */
  searchCards(query: string): KanbanCard[] {
    const queryLower = query.toLowerCase();
    return this.cards.filter(
      (card) =>
        card.title.toLowerCase().includes(queryLower) ||
        (card.content || '').toLowerCase().includes(queryLower)
    );
  }

  /**
   * Récupère toutes les cartes pour un status donné
   */
  getCardsByStatus(status: KanbanStatus): KanbanCard[] {
    return this.cards.filter((card) => card.status === status);
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    this.cards = [];
    this.filters = {};
  }

  /**
   * Exporte le board en JSON
   */
  exportToJSON(): string {
    const board = this.buildBoard();
    return JSON.stringify(board, null, 2);
  }
}
