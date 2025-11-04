/**
 * PlannerService
 * Service pour récupérer les tâches Planner via l'API Microsoft Graph
 */

import { Office365AuthService } from './Office365AuthService';
import { PlannerTask } from '../types/office365.types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const PLANNER_TASKS_ENDPOINT = '/me/planner/tasks';

export class PlannerService {
  constructor(private authService: Office365AuthService) {}

  /**
   * Récupère les tâches Planner de l'utilisateur
   */
  async getMyTasks(limit: number = 50): Promise<PlannerTask[]> {
    try {
      const token = await this.authService.getToken();
      const url =
        `${GRAPH_BASE_URL}${PLANNER_TASKS_ENDPOINT}?` +
        `$top=${Math.min(limit, 200)}&$orderby=createdDateTime desc`;

      const response = await fetch(url, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`Planner API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseTasksResponse(data);
    } catch (error) {
      console.error('[PlannerService] Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Recherche des tâches (filtre côté client)
   */
  async getTasksByStatus(status: string): Promise<PlannerTask[]> {
    try {
      // Récupérer toutes les tâches
      const allTasks = await this.getMyTasks(200);

      // Filtrer par statut
      return allTasks.filter((task) => task.status === status);
    } catch (error) {
      console.error('[PlannerService] Error filtering tasks by status:', error);
      return [];
    }
  }

  /**
   * Récupère une tâche par son ID
   */
  async getTaskById(id: string): Promise<PlannerTask | null> {
    try {
      const token = await this.authService.getToken();
      const url = `${GRAPH_BASE_URL}/me/planner/tasks/${id}`;

      const response = await fetch(url, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`Planner API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTaskResponse(data);
    } catch (error) {
      console.error('[PlannerService] Error fetching task by ID:', error);
      return null;
    }
  }

  /**
   * Récupère les tâches en retard
   */
  async getOverdueTasks(): Promise<PlannerTask[]> {
    try {
      const allTasks = await this.getMyTasks(200);
      const now = new Date();

      return allTasks.filter((task) => {
        if (!task.dueDateTime) return false;
        const dueDate = new Date(task.dueDateTime);
        return dueDate < now && task.status !== 'completed';
      });
    } catch (error) {
      console.error('[PlannerService] Error fetching overdue tasks:', error);
      return [];
    }
  }

  /**
   * Parse la réponse d'une liste de tâches
   */
  private parseTasksResponse(data: any): PlannerTask[] {
    if (!data.value || !Array.isArray(data.value)) {
      return [];
    }

    return data.value.map((item: any) => this.parseTaskResponse(item)).filter(Boolean);
  }

  /**
   * Parse une tâche individuelle
   */
  private parseTaskResponse(task: any): PlannerTask | null {
    if (!task.id) {
      return null;
    }

    return {
      id: task.id,
      title: task.title || '(No Title)',
      body: task.details?.description || '',
      status: (task.percentComplete === 100 ? 'completed' : 'inProgress') as any,
      dueDateTime: task.dueDateTime,
      createdDateTime: task.createdDateTime || new Date().toISOString(),
      priority: task.importance?.toLowerCase() === 'high' ? 1 : 0,
      planId: task.planId || '',
      bucketId: task.bucketId || '',
      assignedTo: task.assignedTo,
    };
  }

  /**
   * Construit les headers d'authentification
   */
  private buildHeaders(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
