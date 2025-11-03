import type { CartaeItem } from '@cartae/core';
import type { KanbanCard, KanbanStatus } from '../types/kanban';

/**
 * Convertit un CartaeItem en KanbanCard avec mapping intelligent du status
 *
 * Logique de mapping:
 * - Utilise metadata.status si disponible et valide
 * - Sinon, infère le status depuis:
 *   - Tags (#backlog, #in-progress, #done)
 *   - Type de contenu (new → backlog, completed → done)
 *   - Date (ancien → done, récent → backlog)
 */
export function cartaeItemToKanban(item: CartaeItem): KanbanCard {
  const status = inferStatus(item);
  const priority = inferPriority(item);

  return {
    id: item.id,
    originalItem: item,
    status,
    title: item.title,
    content: item.content,
    priority,
    tags: item.tags || [],
    assignee: extractAssignee(item),
    dueDate: extractDueDate(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Convertit un batch de CartaeItems en KanbanCards
 */
export function cartaeItemsToKanban(items: CartaeItem[]): KanbanCard[] {
  return items.map(cartaeItemToKanban);
}

/**
 * Infère le status Kanban depuis les métadonnées CartaeItem
 */
function inferStatus(item: CartaeItem): KanbanStatus {
  // 0. PRIORITÉ: Vérifier metadata.kanbanStatus (persisted drag & drop)
  if (item.metadata?.kanbanStatus) {
    const kanbanStatus = item.metadata.kanbanStatus.toString() as KanbanStatus;
    // Valider que c'est un status valide
    if (['backlog', 'in_progress', 'review', 'done'].includes(kanbanStatus)) {
      return kanbanStatus;
    }
  }

  // 1. Vérifier metadata.status explicite
  if (item.metadata?.status) {
    const metaStatus = item.metadata.status.toString().toLowerCase();
    if (metaStatus === 'completed' || metaStatus === 'done') return 'done';
    if (metaStatus === 'in_progress' || metaStatus === 'in progress') return 'in_progress';
    if (metaStatus === 'review' || metaStatus === 'pending') return 'review';
    if (metaStatus === 'new' || metaStatus === 'backlog') return 'backlog';
  }

  // 2. Vérifier les tags
  const tags = item.tags || [];
  if (tags.some(tag => /done|completed|finished/i.test(tag))) return 'done';
  if (tags.some(tag => /review|pending/i.test(tag))) return 'review';
  if (tags.some(tag => /progress|doing|wip/i.test(tag))) return 'in_progress';
  if (tags.some(tag => /backlog|todo|new/i.test(tag))) return 'backlog';

  // 3. Vérifier le contenu pour indices
  const content = (item.content || '').toLowerCase();
  if (/\[x\]|✓|✅|done|completed/i.test(content)) return 'done';
  if (/\[ \]|⏳|in progress|wip/i.test(content)) return 'in_progress';

  // 4. Inférer depuis l'âge (items anciens probablement done)
  const daysSinceUpdate = (Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 30) return 'done';
  if (daysSinceUpdate < 1) return 'backlog';

  // 5. Défaut: backlog
  return 'backlog';
}

/**
 * Infère la priorité depuis les métadonnées
 */
function inferPriority(item: CartaeItem): 'low' | 'medium' | 'high' | 'urgent' | undefined {
  // Vérifier metadata.priority explicite
  if (item.metadata?.priority) {
    const metaPriority = item.metadata.priority.toString().toLowerCase();
    if (['urgent', 'high', 'medium', 'low'].includes(metaPriority)) {
      return metaPriority as 'low' | 'medium' | 'high' | 'urgent';
    }
  }

  // Vérifier tags de priorité
  const tags = item.tags || [];
  if (tags.some(tag => /urgent|critical|p0/i.test(tag))) return 'urgent';
  if (tags.some(tag => /high|important|p1/i.test(tag))) return 'high';
  if (tags.some(tag => /low|minor|p3/i.test(tag))) return 'low';
  if (tags.some(tag => /medium|normal|p2/i.test(tag))) return 'medium';

  // Vérifier contenu pour indices
  const content = (item.content || '').toLowerCase();
  if (/urgent|asap|critical/i.test(content)) return 'urgent';
  if (/important|high priority/i.test(content)) return 'high';

  return undefined;
}

/**
 * Extrait le nom de l'assigné depuis les métadonnées
 */
function extractAssignee(item: CartaeItem): string | undefined {
  if (item.metadata?.assignee) {
    return item.metadata.assignee.toString();
  }
  if (item.metadata?.author) {
    return item.metadata.author.toString();
  }
  return undefined;
}

/**
 * Extrait la date d'échéance depuis les métadonnées
 */
function extractDueDate(item: CartaeItem): Date | undefined {
  if (item.metadata?.dueDate) {
    const date = new Date(item.metadata.dueDate as string | number | Date);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (item.metadata?.deadline) {
    const date = new Date(item.metadata.deadline as string | number | Date);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}
