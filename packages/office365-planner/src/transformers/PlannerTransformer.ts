/**
 * PlannerTransformer - Transforme Planner data → CartaeItem
 *
 * Convertit les tâches Microsoft Planner (Graph API) en format universel CartaeItem.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { CartaeMetadata, PriorityLevel, ItemStatus } from '@cartae/core/types/CartaeMetadata';
import type { PlannerTask } from '../services/PlannerService';

/**
 * Transforme un PlannerTask en CartaeItem
 *
 * @param task - Tâche Planner à transformer
 * @param options - Options de transformation (optionnel)
 * @returns CartaeItem formaté
 */
export function transformTaskToCartaeItem(
  task: PlannerTask,
  options?: {
    addDefaultTags?: boolean;
  }
): CartaeItem {
  const now = new Date();

  // Tags par défaut
  const tags: string[] = options?.addDefaultTags
    ? ['planner', 'task', 'office365']
    : [];

  // Tags auto depuis état
  if (task.percentComplete === 100) {
    tags.push('completed');
  } else if (task.percentComplete > 0) {
    tags.push('in-progress');
  }

  if (task.hasDescription) {
    tags.push('has-description');
  }

  // Conversion priorité Planner (0-10) → PriorityLevel
  const priority = mapPlannerPriority(task.priority);

  // Conversion statut depuis percentComplete
  const status = mapPlannerStatus(task.percentComplete);

  // Métadonnées
  const metadata: CartaeMetadata = {
    priority,
    status,
    dueDate: task.dueDateTime || undefined,
    startDate: task.startDateTime || undefined,
    progress: task.percentComplete,

    // Participants (assignés)
    participants: task.assignments.map(a => a.userId),

    // Champs extensibles Planner
    planner: {
      taskId: task.id,
      bucketId: task.bucketId,
      planId: task.planId,
      percentComplete: task.percentComplete,
      priority: task.priority,
      startDateTime: task.startDateTime,
      dueDateTime: task.dueDateTime,
      hasDescription: task.hasDescription,
      previewType: task.previewType,
      orderHint: task.orderHint,
      assignments: task.assignments.map(a => ({
        userId: a.userId,
        displayName: a.displayName,
      })),
    },
  };

  const cartaeItem: CartaeItem = {
    id: uuidv4(),
    type: 'task' as CartaeItemType,
    title: task.title,

    // Pas de contenu (description nécessite appel API séparé)
    content: undefined,

    metadata,
    tags,

    source: {
      connector: 'office365',
      originalId: task.id,
      url: `https://tasks.office.com/tasks/${task.id}`,
      lastSync: now,
      metadata: {
        service: 'planner-graph-api',
        version: 'v1.0',
        planId: task.planId,
        bucketId: task.bucketId,
      },
    },

    createdAt: task.startDateTime || now,
    updatedAt: now,

    archived: false,
    favorite: false,
  };

  return cartaeItem;
}

/**
 * Mappe la priorité Planner (0-10) vers PriorityLevel
 *
 * Planner:
 * - 0-1: Urgent
 * - 2-4: Important (high)
 * - 5-7: Medium
 * - 8-10: Low
 */
function mapPlannerPriority(plannerPriority: number): PriorityLevel {
  if (plannerPriority <= 1) return 'urgent';
  if (plannerPriority <= 4) return 'high';
  if (plannerPriority <= 7) return 'medium';
  return 'low';
}

/**
 * Mappe percentComplete → ItemStatus
 */
function mapPlannerStatus(percentComplete: number): ItemStatus {
  if (percentComplete === 0) return 'new';
  if (percentComplete === 100) return 'completed';
  return 'in_progress';
}

/**
 * Transforme un batch de tâches en CartaeItems
 */
export function transformTasksToCartaeItems(
  tasks: PlannerTask[],
  options?: Parameters<typeof transformTaskToCartaeItem>[1]
): CartaeItem[] {
  return tasks.map(task => transformTaskToCartaeItem(task, options));
}

/**
 * Type guard pour vérifier si un CartaeItem est une tâche Planner
 */
export function isPlannerTask(item: CartaeItem): boolean {
  return (
    item.type === 'task' &&
    item.source.connector === 'office365' &&
    typeof item.metadata.planner === 'object'
  );
}

/**
 * Helper pour calculer le temps restant avant échéance
 *
 * @param dueDate - Date d'échéance
 * @returns Jours restants (négatif si dépassé)
 */
export function getDaysUntilDue(dueDate: Date | null): number | null {
  if (!dueDate) return null;

  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Helper pour déterminer si une tâche est en retard
 */
export function isTaskOverdue(task: PlannerTask): boolean {
  if (!task.dueDateTime || task.percentComplete === 100) {
    return false;
  }

  return task.dueDateTime.getTime() < Date.now();
}
