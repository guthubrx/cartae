/**
 * PlannerService - Microsoft Planner via Graph API
 *
 * Service pour tâches Planner via Graph API v1.0
 *
 * Endpoints :
 * - GET /me/planner/tasks - Mes tâches
 * - GET /planner/plans/{id} - Détails d'un plan
 * - GET /planner/plans/{id}/buckets - Buckets d'un plan
 * - GET /planner/buckets/{id}/tasks - Tâches d'un bucket
 *
 * Documentation : https://learn.microsoft.com/graph/api/resources/planner-overview
 */

import type { IAuthService } from '../types/auth.types';
import { globalCache, CacheTTL } from './CacheService';

/**
 * Interface pour une tâche Planner
 */
export interface PlannerTask {
  id: string;
  title: string;
  bucketId: string;
  planId: string;
  percentComplete: number;
  startDateTime: Date | null;
  dueDateTime: Date | null;
  priority: number; // 0-10, 0=urgent, 5=important, 9=low
  assignments: Array<{
    userId: string;
    displayName?: string;
  }>;
  hasDescription: boolean;
  previewType: 'automatic' | 'noPreview' | 'checklist' | 'description' | 'reference';
  orderHint: string;
}

/**
 * Interface pour un bucket (colonne)
 */
export interface PlannerBucket {
  id: string;
  name: string;
  planId: string;
  orderHint: string;
}

/**
 * Interface pour un plan
 */
export interface PlannerPlan {
  id: string;
  title: string;
  owner: string; // Group ID
  createdDateTime: Date;
}

/**
 * Service Microsoft Planner
 */
export class PlannerService {
  private readonly GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

  constructor(private authService: IAuthService) {
    console.log('[PlannerService] Initialisé');
  }

  /**
   * Liste toutes mes tâches Planner
   */
  async listMyTasks(): Promise<PlannerTask[]> {
    try {
      console.log('[PlannerService] Liste de mes tâches...');

      const url = `${this.GRAPH_ENDPOINT}/me/planner/tasks`;

      const response = await this.sendGraphRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const tasks: PlannerTask[] = (data.value || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        bucketId: task.bucketId,
        planId: task.planId,
        percentComplete: task.percentComplete || 0,
        startDateTime: task.startDateTime ? new Date(task.startDateTime) : null,
        dueDateTime: task.dueDateTime ? new Date(task.dueDateTime) : null,
        priority: task.priority ?? 5,
        assignments: Object.keys(task.assignments || {}).map(userId => ({
          userId,
        })),
        hasDescription: task.hasDescription || false,
        previewType: task.previewType || 'automatic',
        orderHint: task.orderHint || '',
      }));

      console.log(`[PlannerService] ✅ ${tasks.length} tâches récupérées`);
      return tasks;

    } catch (error) {
      console.error('[PlannerService] ❌ Erreur liste tâches:', error);
      throw this.handleError(error, 'Impossible de lister les tâches');
    }
  }

  /**
   * Récupère les détails d'un plan
   */
  async getPlan(planId: string): Promise<PlannerPlan> {
    try {
      console.log(`[PlannerService] Récupération plan ${planId}...`);

      const url = `${this.GRAPH_ENDPOINT}/planner/plans/${planId}`;

      const response = await this.sendGraphRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const plan: PlannerPlan = {
        id: data.id,
        title: data.title,
        owner: data.owner,
        createdDateTime: new Date(data.createdDateTime),
      };

      console.log('[PlannerService] ✅ Plan récupéré');
      return plan;

    } catch (error) {
      console.error('[PlannerService] ❌ Erreur récupération plan:', error);
      throw this.handleError(error, 'Impossible de récupérer le plan');
    }
  }

  /**
   * Liste les buckets (colonnes) d'un plan
   */
  async getPlanBuckets(planId: string): Promise<PlannerBucket[]> {
    const cacheKey = `planner:plan:${planId}:buckets`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[PlannerService] Récupération buckets du plan ${planId}...`);

          const url = `${this.GRAPH_ENDPOINT}/planner/plans/${planId}/buckets`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const buckets: PlannerBucket[] = (data.value || []).map((bucket: any) => ({
            id: bucket.id,
            name: bucket.name,
            planId: bucket.planId,
            orderHint: bucket.orderHint || '',
          }));

          console.log(`[PlannerService] ✅ ${buckets.length} buckets récupérés`);
          return buckets;

        } catch (error) {
          console.error('[PlannerService] ❌ Erreur récupération buckets:', error);
          throw this.handleError(error, 'Impossible de récupérer les buckets');
        }
      },
      CacheTTL.PLANS
    );
  }

  /**
   * Liste les tâches d'un bucket
   */
  async getBucketTasks(bucketId: string): Promise<PlannerTask[]> {
    const cacheKey = `planner:bucket:${bucketId}:tasks`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[PlannerService] Récupération tâches du bucket ${bucketId}...`);

          const url = `${this.GRAPH_ENDPOINT}/planner/buckets/${bucketId}/tasks`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const tasks: PlannerTask[] = (data.value || []).map((task: any) => ({
            id: task.id,
            title: task.title,
            bucketId: task.bucketId,
            planId: task.planId,
            percentComplete: task.percentComplete || 0,
            startDateTime: task.startDateTime ? new Date(task.startDateTime) : null,
            dueDateTime: task.dueDateTime ? new Date(task.dueDateTime) : null,
            priority: task.priority ?? 5,
            assignments: Object.keys(task.assignments || {}).map(userId => ({
              userId,
            })),
            hasDescription: task.hasDescription || false,
            previewType: task.previewType || 'automatic',
            orderHint: task.orderHint || '',
          }));

          console.log(`[PlannerService] ✅ ${tasks.length} tâches récupérées`);
          return tasks;

        } catch (error) {
          console.error('[PlannerService] ❌ Erreur récupération tâches bucket:', error);
          throw this.handleError(error, 'Impossible de récupérer les tâches du bucket');
        }
      },
      CacheTTL.TASKS
    );
  }

  /**
   * Liste tous les plans où je suis membre
   * Note: Nécessite de passer par les groupes
   */
  async listMyPlans(): Promise<PlannerPlan[]> {
    const cacheKey = 'planner:plans:my';

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log('[PlannerService] Liste de mes plans...');

          // Approche 1 : Récupérer tous mes plans via mes tâches
          const tasksUrl = `${this.GRAPH_ENDPOINT}/me/planner/tasks`;
          const tasksResponse = await this.sendGraphRequest(tasksUrl, { method: 'GET' });
          const tasksData = JSON.parse(tasksResponse);

          // Extraire les planIds uniques
          const planIds = new Set<string>();
          for (const task of tasksData.value || []) {
            if (task.planId) {
              planIds.add(task.planId);
            }
          }

          const plans: PlannerPlan[] = [];

          // Pour chaque planId unique, récupérer les détails du plan
          for (const planId of planIds) {
            try {
              const plan = await this.getPlan(planId);
              plans.push(plan);
            } catch (error) {
              console.log(`[PlannerService] Impossible de récupérer plan ${planId}`);
            }
          }

          console.log(`[PlannerService] ✅ ${plans.length} plans récupérés`);
          return plans;

        } catch (error) {
          console.error('[PlannerService] ❌ Erreur liste plans:', error);
          throw this.handleError(error, 'Impossible de lister les plans');
        }
      },
      CacheTTL.PLANS
    );
  }

  /**
   * Récupère les informations d'un utilisateur (pour les assignations)
   */
  async getUserInfo(userId: string): Promise<{ displayName: string; email: string }> {
    const cacheKey = `planner:user:${userId}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          const url = `${this.GRAPH_ENDPOINT}/users/${userId}?$select=displayName,mail,userPrincipalName`;
          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          return {
            displayName: data.displayName || 'Unknown',
            email: data.mail || data.userPrincipalName || '',
          };
        } catch (error) {
          return { displayName: 'Unknown', email: '' };
        }
      },
      CacheTTL.USER_INFO
    );
  }

  /**
   * Envoie une requête Graph API
   */
  private async sendGraphRequest(url: string, options: { method: string; body?: string }): Promise<string> {
    // TEMPORAIRE: Proxy Graph API timeout - utiliser fetch direct
    // TODO Session 29: Fixer content-script proxy timeout
    console.log('[PlannerService] 🌐 Fetch direct avec token');
    const token = await this.authService.getToken('graph');

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    return responseText;
  }

  /**
   * Envoie via proxy extension (évite CORS)
   */
  private async sendViaExtensionProxy(url: string, options: { method: string; body?: string }): Promise<string> {
    const requestId = Math.random().toString(36).slice(2, 15);

    return new Promise((resolve, reject) => {
      // Handler pour la réponse
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'CARTAE_GRAPH_RESPONSE' && event.data.requestId === requestId) {
          window.removeEventListener('message', handler);

          const response = event.data.response;

          if (!response.success) {
            reject(new Error(response.error || 'Extension proxy error'));
            return;
          }

          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`HTTP ${response.status}: ${response.body}`));
            return;
          }

          resolve(response.body);
        }
      };

      window.addEventListener('message', handler);

      // Timeout 30s
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Extension proxy timeout'));
      }, 30000);

      // Envoyer requête via content script
      window.postMessage({
        type: 'CARTAE_GRAPH_REQUEST',
        requestId: requestId,
        url: url,
        method: options.method,
        headers: {},
        body: options.body
      }, '*');
    });
  }

  /**
   * Gère les erreurs
   */
  private handleError(error: any, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: ${String(error)}`);
  }
}
