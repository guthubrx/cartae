/**
 * PlannerTransformer
 * Transforme les tâches Planner en CartaeItems
 */

import { CartaeItem } from '@cartae/core';
import { BaseTransformer } from './BaseTransformer';
import { PlannerTask } from '../types/office365.types';

export class PlannerTransformer extends BaseTransformer {
  protected getItemType() {
    return 'task' as const;
  }

  protected getConnector() {
    return 'office365';
  }

  /**
   * Transforme une tâche Planner en CartaeItem
   */
  static toCartaeItem(task: PlannerTask): CartaeItem {
    const transformer = new PlannerTransformer();
    return transformer.transform(task);
  }

  /**
   * Transforme une liste de tâches
   */
  static toCartaeItems(tasks: PlannerTask[]): CartaeItem[] {
    return tasks.map((task) => PlannerTransformer.toCartaeItem(task));
  }

  /**
   * Transforme une tâche individuelle
   */
  private transform(task: PlannerTask): CartaeItem {
    // Créer l'item de base
    const item = this.createBaseCartaeItem(
      'task',
      task.title,
      task.id,
      `https://tasks.microsoft.com/`
    );

    // Ajouter le contenu (description)
    item.content = this.cleanContent(task.body, 500);

    // Ajouter les dates
    this.addCreatedDate(item, task.createdDateTime);
    if (task.dueDateTime) {
      this.addDueDate(item, task.dueDateTime);
    }

    // Ajouter le statut
    item.metadata.status = this.mapTaskStatus(task.status);

    // Ajouter la priorité
    item.metadata.priority = task.priority === 1 ? 'high' : 'medium';

    // Ajouter la progression
    const isCompleted = task.status === 'completed';
    item.metadata.progress = isCompleted ? 100 : 0;

    // Ajouter les tags
    item.tags = this.generateTaskTags(task);

    // Ajouter les métadonnées spécifiques Office365
    item.metadata.office365 = {
      taskId: task.id,
      planId: task.planId,
      bucketId: task.bucketId,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
    };

    // JSON-LD pour compatibilité W3C
    item['@context'] = 'https://www.w3.org/ns/activitystreams';
    item['@type'] = 'Task';

    return item;
  }

  /**
   * Mappe le statut Planner au statut CartaeItem
   */
  private mapTaskStatus(
    plannerStatus: string
  ): 'new' | 'in_progress' | 'pending' | 'completed' | 'cancelled' | 'blocked' {
    switch (plannerStatus) {
      case 'completed':
        return 'completed';
      case 'inProgress':
        return 'in_progress';
      case 'waitingOnOthers':
        return 'blocked';
      case 'deferred':
        return 'pending';
      case 'notStarted':
      default:
        return 'new';
    }
  }

  /**
   * Génère les tags pour une tâche
   */
  private generateTaskTags(task: PlannerTask): string[] {
    const tags = this.generateDefaultTags('task');

    // Tags basés sur le statut
    switch (task.status) {
      case 'completed':
        tags.push('#completed');
        tags.push('#done');
        break;
      case 'inProgress':
        tags.push('#in-progress');
        tags.push('#active');
        break;
      case 'waitingOnOthers':
        tags.push('#blocked');
        tags.push('#waiting');
        break;
      case 'deferred':
        tags.push('#deferred');
        tags.push('#on-hold');
        break;
      case 'notStarted':
        tags.push('#backlog');
        tags.push('#todo');
        break;
    }

    // Tags basés sur la priorité
    if (task.priority === 1) {
      tags.push('#high-priority');
    }

    // Tags pour les tâches en retard
    if (task.dueDateTime) {
      const dueDate = new Date(task.dueDateTime);
      const now = new Date();
      const isOverdue = dueDate < now && task.status !== 'completed';

      if (isOverdue) {
        tags.push('#overdue');
        tags.push('#urgent');
      } else {
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDue <= 3) {
          tags.push('#due-soon');
        }
      }
    }

    // Tags basés sur le titre
    const titleLower = task.title.toLowerCase();

    if (
      titleLower.includes('bug') ||
      titleLower.includes('issue') ||
      titleLower.includes('fix')
    ) {
      tags.push('#bug-fix');
    }

    if (
      titleLower.includes('feature') ||
      titleLower.includes('enhancement') ||
      titleLower.includes('improvement')
    ) {
      tags.push('#feature');
    }

    if (
      titleLower.includes('review') ||
      titleLower.includes('approved') ||
      titleLower.includes('approval')
    ) {
      tags.push('#review');
    }

    if (
      titleLower.includes('documentation') ||
      titleLower.includes('doc') ||
      titleLower.includes('readme')
    ) {
      tags.push('#documentation');
    }

    if (
      titleLower.includes('meeting') ||
      titleLower.includes('standup') ||
      titleLower.includes('sync')
    ) {
      tags.push('#meeting');
    }

    if (titleLower.includes('design') || titleLower.includes('ux')) {
      tags.push('#design');
    }

    // Tags pour les assignations
    if (task.assignedTo && Object.keys(task.assignedTo).length > 0) {
      tags.push('#assigned');
    } else {
      tags.push('#unassigned');
    }

    // Deduplicates tags
    return Array.from(new Set(tags));
  }
}
