/**
 * Route Planner - Synchronisation des tâches Microsoft Planner → PostgreSQL
 *
 * Workflow:
 * 1. Frontend → Extension capture token Graph (avec Tasks.Read)
 * 2. Frontend → POST /api/office365/planner/sync avec token dans header
 * 3. Backend → Appel Microsoft Graph API v1.0 (plans + tasks + details)
 * 4. Backend → Transformation en CartaeItem avec ALL fields
 * 5. Backend → Stockage PostgreSQL (cartae_items)
 *
 * Microsoft Graph API Documentation:
 * - Plans: https://learn.microsoft.com/en-us/graph/api/planneruser-list-plans
 * - Tasks: https://learn.microsoft.com/en-us/graph/api/plannerplan-list-tasks
 * - Task Details: https://learn.microsoft.com/en-us/graph/api/plannertaskdetails-get
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../db/client';

const router = Router();

/**
 * Interface pour un Plan Planner (projet/board)
 * Docs: https://learn.microsoft.com/en-us/graph/api/resources/plannerplan
 */
interface GraphPlan {
  id: string;
  title: string;
  owner?: string; // Group ID
  createdDateTime: string;
  createdBy?: {
    user?: {
      id: string;
      displayName?: string;
    };
    application?: {
      id: string;
      displayName?: string;
    };
  };
  container?: {
    type: string; // "group", "roster", "unknownFutureValue"
    containerId: string;
    url?: string;
  };
}

/**
 * Interface pour une Tâche Planner (COMPLETE avec TOUS les fields)
 * Docs: https://learn.microsoft.com/en-us/graph/api/resources/plannertask
 */
interface GraphTask {
  // Identifiers
  id: string;
  planId: string;
  bucketId?: string;
  title: string;

  // Dates
  createdDateTime: string;
  completedDateTime?: string;
  dueDateTime?: string;
  startDateTime?: string;

  // Status & Progress
  percentComplete: number; // 0-100
  completedBy?: {
    user?: {
      id: string;
      displayName?: string;
    };
    application?: {
      id: string;
      displayName?: string;
    };
  };

  // Priority & Order
  priority: number; // 0-10 (0 = highest, 10 = lowest)
  orderHint: string; // Sorting order within bucket

  // Assignments (qui travaille sur la tâche)
  assignments?: {
    [userId: string]: {
      '@odata.type': string;
      assignedDateTime: string;
      orderHint: string;
      assignedBy?: {
        user?: {
          id: string;
          displayName?: string;
        };
      };
    };
  };

  // References & Attachments
  referenceCount?: number;
  checklistItemCount?: number;
  activeChecklistItemCount?: number;
  conversationThreadId?: string;

  // Preview
  previewType?: 'automatic' | 'noPreview' | 'checklist' | 'description' | 'reference';

  // Applied Categories (labels/tags)
  appliedCategories?: {
    [categoryKey: string]: boolean;
  };

  // Metadata
  createdBy?: {
    user?: {
      id: string;
      displayName?: string;
    };
    application?: {
      id: string;
      displayName?: string;
    };
  };

  // E-Tag for concurrency
  '@odata.etag'?: string;
}

/**
 * Interface pour les détails d'une tâche (description, checklist, references)
 * Docs: https://learn.microsoft.com/en-us/graph/api/resources/plannertaskdetails
 */
interface GraphTaskDetails {
  id: string; // Same as task ID

  // Description (rich text)
  description?: string;
  previewType?: 'automatic' | 'noPreview' | 'checklist' | 'description' | 'reference';

  // References (liens externes)
  references?: {
    [referenceKey: string]: {
      '@odata.type': string;
      alias?: string;
      type?: string;
      previewPriority?: string;
      lastModifiedDateTime?: string;
      lastModifiedBy?: {
        user?: {
          id: string;
          displayName?: string;
        };
      };
    };
  };

  // Checklist (sous-tâches)
  checklist?: {
    [checklistItemId: string]: {
      '@odata.type': string;
      title: string;
      isChecked: boolean;
      orderHint: string;
      lastModifiedDateTime?: string;
      lastModifiedBy?: {
        user?: {
          id: string;
          displayName?: string;
        };
      };
    };
  };

  // E-Tag
  '@odata.etag'?: string;
}

/**
 * Interface pour un Bucket (colonne dans le board)
 * Docs: https://learn.microsoft.com/en-us/graph/api/resources/plannerbucket
 */
interface GraphBucket {
  id: string;
  name: string;
  planId: string;
  orderHint: string;
}

/**
 * Récupère tous les plans de l'utilisateur
 */
async function fetchUserPlans(accessToken: string): Promise<GraphPlan[]> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/planner/plans', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Impossible de lister les plans: HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Récupère toutes les tâches d'un plan
 */
async function fetchPlanTasks(planId: string, accessToken: string): Promise<GraphTask[]> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Impossible de lister les tâches du plan ${planId}: HTTP ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Récupère les détails d'une tâche (description, checklist, references)
 */
async function fetchTaskDetails(
  taskId: string,
  accessToken: string
): Promise<GraphTaskDetails | null> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/planner/tasks/${taskId}/details`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Si 404, la tâche n'a pas de détails (normal)
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      console.warn(
        `[Planner] Impossible de récupérer les détails de la tâche ${taskId}: ${errorText}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(
      `[Planner] Erreur lors de la récupération des détails de la tâche ${taskId}:`,
      error
    );
    return null;
  }
}

/**
 * Récupère tous les buckets d'un plan
 */
async function fetchPlanBuckets(planId: string, accessToken: string): Promise<GraphBucket[]> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/planner/plans/${planId}/buckets`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Planner] Impossible de lister les buckets du plan ${planId}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.warn(`[Planner] Erreur lors de la récupération des buckets du plan ${planId}:`, error);
    return [];
  }
}

/**
 * Transforme une tâche Planner en CartaeItem
 */
function taskToCartaeItem(
  task: GraphTask,
  details: GraphTaskDetails | null,
  plan: GraphPlan,
  bucket: GraphBucket | null,
  userId: string
): any {
  // Extraire les assignés
  const assignees: string[] = [];
  if (task.assignments) {
    Object.keys(task.assignments).forEach(userIdKey => {
      assignees.push(userIdKey);
    });
  }

  // Extraire les catégories appliquées
  const categories: string[] = [];
  if (task.appliedCategories) {
    Object.keys(task.appliedCategories).forEach(categoryKey => {
      if (task.appliedCategories![categoryKey]) {
        categories.push(categoryKey);
      }
    });
  }

  // Extraire la checklist
  const checklistItems: any[] = [];
  if (details?.checklist) {
    Object.entries(details.checklist).forEach(([itemId, item]) => {
      checklistItems.push({
        id: itemId,
        title: item.title,
        isChecked: item.isChecked,
        orderHint: item.orderHint,
        lastModifiedDateTime: item.lastModifiedDateTime,
        lastModifiedBy: item.lastModifiedBy,
      });
    });
  }

  // Extraire les références
  const references: any[] = [];
  if (details?.references) {
    Object.entries(details.references).forEach(([refKey, ref]) => {
      references.push({
        key: refKey,
        alias: ref.alias,
        type: ref.type,
        previewPriority: ref.previewPriority,
        lastModifiedDateTime: ref.lastModifiedDateTime,
        lastModifiedBy: ref.lastModifiedBy,
      });
    });
  }

  // Déterminer le statut
  let status = 'in_progress';
  if (task.percentComplete === 100 || task.completedDateTime) {
    status = 'completed';
  } else if (task.percentComplete === 0) {
    status = 'todo';
  }

  // Créer le CartaeItem
  const cartaeItem = {
    user_id: userId,
    title: task.title,
    type: 'task', // Type Cartae pour les tâches
    content: details?.description || '',
    tags: categories.length > 0 ? categories : null,
    categories: [plan.title], // Le plan comme catégorie principale
    source: {
      connector: 'planner',
      sourceId: task.id,
    },
    archived: false,
    favorite: false,
    created_at: new Date(task.createdDateTime),
    updated_at: new Date(), // Utiliser maintenant comme date de dernière sync

    metadata: {
      // Plan info
      planId: plan.id,
      planTitle: plan.title,
      planOwner: plan.owner,
      planContainer: plan.container,

      // Bucket info
      bucketId: bucket?.id,
      bucketName: bucket?.name,
      bucketOrderHint: bucket?.orderHint,

      // Task status
      status,
      percentComplete: task.percentComplete,
      completedDateTime: task.completedDateTime,
      completedBy: task.completedBy,

      // Dates
      dueDate: task.dueDateTime,
      startDate: task.startDateTime,

      // Priority & Order
      priority: task.priority,
      orderHint: task.orderHint,

      // Assignees
      assignees,
      assignments: task.assignments,

      // Counts
      referenceCount: task.referenceCount || 0,
      checklistItemCount: task.checklistItemCount || 0,
      activeChecklistItemCount: task.activeChecklistItemCount || 0,

      // Preview
      previewType: task.previewType,

      // Conversation
      conversationThreadId: task.conversationThreadId,

      // Created by
      createdBy: task.createdBy,

      // Applied categories
      appliedCategories: task.appliedCategories,

      // Details
      taskDetails: {
        description: details?.description,
        checklist: checklistItems,
        checklistCount: checklistItems.length,
        checklistCompletedCount: checklistItems.filter(item => item.isChecked).length,
        references,
        referencesCount: references.length,
      },

      // E-Tags for concurrency
      etag: task['@odata.etag'],
      detailsEtag: details?.['@odata.etag'],
    },
  };

  return cartaeItem;
}

/**
 * POST /api/office365/planner/sync
 * Synchronise les tâches Planner de l'utilisateur dans PostgreSQL
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const accessToken = req.headers['x-office365-token'] as string;
    const { userId, maxTasks = 100 } = req.body;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Missing access token in X-Office365-Token header',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId in request body',
      });
    }

    console.log(`[Planner] Synchronisation des tâches pour user ${userId}...`);

    // 1. Récupérer tous les plans de l'utilisateur
    console.log('[Planner] Récupération des plans...');
    const plans = await fetchUserPlans(accessToken);
    console.log(`[Planner] ${plans.length} plan(s) trouvé(s)`);

    let totalTasks = 0;
    let itemsImported = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];

    // 2. Pour chaque plan, récupérer les buckets et les tâches
    for (const plan of plans) {
      try {
        console.log(`[Planner] Traitement du plan "${plan.title}" (${plan.id})...`);

        // Récupérer les buckets du plan
        const buckets = await fetchPlanBuckets(plan.id, accessToken);
        const bucketsMap = new Map<string, GraphBucket>();
        buckets.forEach(bucket => bucketsMap.set(bucket.id, bucket));

        // Récupérer les tâches du plan
        const tasks = await fetchPlanTasks(plan.id, accessToken);
        console.log(`[Planner] ${tasks.length} tâche(s) dans le plan "${plan.title}"`);

        // Limiter le nombre de tâches
        const tasksToProcess = tasks.slice(0, maxTasks - totalTasks);

        for (const task of tasksToProcess) {
          try {
            // Récupérer les détails de la tâche
            const details = await fetchTaskDetails(task.id, accessToken);

            // Trouver le bucket correspondant
            const bucket = task.bucketId ? bucketsMap.get(task.bucketId) || null : null;

            // Transformer en CartaeItem
            const cartaeItem = taskToCartaeItem(task, details, plan, bucket, userId);

            // Insérer dans PostgreSQL (avec upsert basé sur source->>'sourceId')
            const query = `
              INSERT INTO cartae_items (
                user_id, title, type, content, tags, categories,
                source, archived, favorite,
                created_at, updated_at, metadata
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT ((source->>'sourceId'), user_id)
              WHERE source->>'connector' = 'planner'
              DO UPDATE SET
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                tags = EXCLUDED.tags,
                categories = EXCLUDED.categories,
                updated_at = EXCLUDED.updated_at,
                metadata = EXCLUDED.metadata
              RETURNING id, (xmax = 0) AS inserted
            `;

            const values = [
              cartaeItem.user_id,
              cartaeItem.title,
              cartaeItem.type,
              cartaeItem.content,
              cartaeItem.tags,
              cartaeItem.categories,
              JSON.stringify(cartaeItem.source),
              cartaeItem.archived,
              cartaeItem.favorite,
              cartaeItem.created_at,
              cartaeItem.updated_at,
              JSON.stringify(cartaeItem.metadata),
            ];

            const result = await pool.query(query, values);
            const wasInserted = result.rows[0].inserted;

            if (wasInserted) {
              itemsImported++;
            } else {
              itemsSkipped++;
            }

            totalTasks++;
          } catch (taskError) {
            const errorMsg = `Erreur lors du traitement de la tâche ${task.id}: ${taskError instanceof Error ? taskError.message : 'Unknown error'}`;
            console.error(`[Planner] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        // Arrêter si on a atteint la limite
        if (totalTasks >= maxTasks) {
          console.log(`[Planner] Limite de ${maxTasks} tâches atteinte`);
          break;
        }
      } catch (planError) {
        const errorMsg = `Erreur lors du traitement du plan ${plan.id}: ${planError instanceof Error ? planError.message : 'Unknown error'}`;
        console.error(`[Planner] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(
      `[Planner] ✅ Synchronisation terminée: ${itemsImported} importées, ${itemsSkipped} mises à jour, ${errors.length} erreur(s)`
    );

    return res.json({
      success: true,
      itemsImported,
      itemsSkipped,
      totalProcessed: totalTasks,
      plansProcessed: plans.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Planner] Erreur synchronisation:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/office365/planner/items
 * Récupère les tâches Planner depuis PostgreSQL
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { userId, limit = 100 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId query parameter',
      });
    }

    const query = `
      SELECT * FROM cartae_items
      WHERE user_id = $1 AND source->>'connector' = 'planner'
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    return res.json({
      success: true,
      count: result.rows.length,
      items: result.rows,
    });
  } catch (error) {
    console.error('[Planner] Erreur récupération items:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /sync-stream - Synchronisation Planner avec streaming SSE (progression temps réel)
 *
 * Envoie des événements Server-Sent Events avec la progression :
 * - event: progress → { current: number, total: number, phase: string }
 * - event: complete → { success: boolean, itemsImported: number, ... }
 */
router.post('/sync-stream', async (req: Request, res: Response) => {
  const accessToken = req.headers['x-office365-token'] as string;
  const { userId, maxTasks = 100 } = req.body;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Missing Office365 token' });
  }

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  // Configuration SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Fonction helper pour envoyer des événements SSE
  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Phase 1 : Récupération des plans
    sendEvent('progress', {
      phase: 'plans',
      current: 0,
      total: 0,
      message: 'Récupération des plans...',
    });
    const plans = await fetchUserPlans(accessToken);
    sendEvent('progress', {
      phase: 'plans',
      current: plans.length,
      total: plans.length,
      message: `${plans.length} plans trouvés`,
    });

    let totalTasks = 0;
    let itemsImported = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];

    // Phase 2 : Compter le nombre total de tâches
    sendEvent('progress', {
      phase: 'counting',
      current: 0,
      total: 0,
      message: 'Comptage des tâches...',
    });
    let tasksCount = 0;
    for (const plan of plans) {
      const tasks = await fetchPlanTasks(plan.id, accessToken);
      tasksCount += Math.min(tasks.length, maxTasks - tasksCount);
      if (tasksCount >= maxTasks) break;
    }
    sendEvent('progress', {
      phase: 'counting',
      current: tasksCount,
      total: tasksCount,
      message: `${tasksCount} tâches à synchroniser`,
    });

    // Phase 3 : Synchronisation avec progression
    sendEvent('progress', {
      phase: 'syncing',
      current: 0,
      total: tasksCount,
      message: 'Synchronisation en cours...',
    });

    for (const plan of plans) {
      if (totalTasks >= maxTasks) break;

      // Récupérer les buckets du plan
      const buckets = await fetchPlanBuckets(plan.id, accessToken);
      const bucketsMap = new Map<string, GraphBucket>();
      buckets.forEach(bucket => bucketsMap.set(bucket.id, bucket));

      // Récupérer les tâches du plan
      const tasks = await fetchPlanTasks(plan.id, accessToken);
      const tasksToProcess = tasks.slice(0, maxTasks - totalTasks);

      for (const task of tasksToProcess) {
        try {
          // Récupérer les détails de la tâche
          const details = await fetchTaskDetails(task.id, accessToken);
          const bucket = task.bucketId ? bucketsMap.get(task.bucketId) || null : null;

          // Transformer en CartaeItem
          const cartaeItem = taskToCartaeItem(task, details, plan, bucket, userId);

          // Upsert dans PostgreSQL
          const query = `
            INSERT INTO cartae_items (
              user_id, title, type, content, tags, categories,
              source, archived, favorite,
              created_at, updated_at, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT ((source->>'sourceId'), user_id)
            WHERE source->>'connector' = 'planner'
            DO UPDATE SET
              title = EXCLUDED.title,
              content = EXCLUDED.content,
              tags = EXCLUDED.tags,
              categories = EXCLUDED.categories,
              updated_at = EXCLUDED.updated_at,
              metadata = EXCLUDED.metadata
            RETURNING id
          `;

          const values = [
            cartaeItem.user_id,
            cartaeItem.title,
            cartaeItem.type,
            cartaeItem.content,
            cartaeItem.tags,
            cartaeItem.categories,
            JSON.stringify(cartaeItem.source),
            cartaeItem.archived,
            cartaeItem.favorite,
            cartaeItem.created_at,
            cartaeItem.updated_at,
            JSON.stringify(cartaeItem.metadata),
          ];

          const result = await pool.query(query, values);

          if (result.rows.length > 0) {
            itemsImported++;
          } else {
            itemsSkipped++;
          }

          totalTasks++;

          // Envoyer la progression
          sendEvent('progress', {
            phase: 'syncing',
            current: totalTasks,
            total: tasksCount,
            message: `Synchronisation : ${totalTasks}/${tasksCount} tâches`,
          });
        } catch (error) {
          console.error('[Planner/Stream] Erreur traitement tâche:', task.id, error);
          errors.push(
            `Erreur tâche ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          itemsSkipped++;
          totalTasks++;

          sendEvent('progress', {
            phase: 'syncing',
            current: totalTasks,
            total: tasksCount,
            message: `Synchronisation : ${totalTasks}/${tasksCount} tâches (1 erreur)`,
          });
        }
      }
    }

    // Envoyer le résultat final
    sendEvent('complete', {
      success: true,
      itemsImported,
      itemsSkipped,
      totalProcessed: totalTasks,
      plansProcessed: plans.length,
      errors: errors.length > 0 ? errors : undefined,
    });

    res.end();
  } catch (error) {
    console.error('[Planner/Stream] Erreur synchronisation:', error);

    sendEvent('error', {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.end();
  }
});

export default router;
