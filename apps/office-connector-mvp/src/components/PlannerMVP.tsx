/**
 * PlannerMVP - Composant React style Microsoft Planner
 *
 * Interface Planner-like avec vue Kanban et cartes de tâches
 */

import React, { useState, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { TokenInterceptorService } from '../services/auth/TokenInterceptorService';
import {
  PlannerService,
  type PlannerTask,
  type PlannerPlan,
  type PlannerBucket,
} from '../services/PlannerService';

interface PlannerMVPState {
  isLoading: boolean;
  error: string | null;
  plans: PlannerPlan[];
  selectedPlanId: string | null;
  buckets: PlannerBucket[];
  tasksByBucket: Map<string, PlannerTask[]>;
  filterMode: 'all' | 'me';
  currentUserId: string;
}

export const PlannerMVP: React.FC = () => {
  const [plannerService, setPlannerService] = useState<PlannerService | null>(null);
  const [state, setState] = useState<PlannerMVPState>({
    isLoading: false,
    error: null,
    plans: [],
    selectedPlanId: null,
    buckets: [],
    tasksByBucket: new Map(),
    filterMode: 'all',
    currentUserId: '',
  });

  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());

  // Initialisation
  useEffect(() => {
    const initService = async () => {
      if (typeof (window as any).cartaeBrowserStorage === 'undefined') {
        setState(prev => ({ ...prev, error: 'Extension Firefox requise' }));
        return;
      }

      const tokenService = new TokenInterceptorService();
      await tokenService.startMonitoring();

      const service = new PlannerService(tokenService);
      setPlannerService(service);

      loadPlans(service);
    };

    initService();
  }, []);

  const loadPlans = async (service?: PlannerService) => {
    const svc = service || plannerService;
    if (!svc) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const plans = await svc.listMyPlans();
      setState(prev => ({ ...prev, plans, isLoading: false }));

      // Sélectionner le premier plan par défaut
      if (plans.length > 0) {
        loadPlan(plans[0].id, svc);
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const loadPlan = async (planId: string, service?: PlannerService) => {
    const svc = service || plannerService;
    if (!svc) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, selectedPlanId: planId }));

    try {
      // Charger les buckets
      const buckets = await svc.getPlanBuckets(planId);

      // Charger les tâches de chaque bucket
      const tasksByBucket = new Map<string, PlannerTask[]>();

      for (const bucket of buckets) {
        const tasks = await svc.getBucketTasks(bucket.id);
        tasksByBucket.set(bucket.id, tasks);

        // Charger les noms des assignés
        for (const task of tasks) {
          for (const assignment of task.assignments) {
            if (!userNames.has(assignment.userId)) {
              const userInfo = await svc.getUserInfo(assignment.userId);
              setUserNames(prev => new Map(prev).set(assignment.userId, userInfo.displayName));
            }
          }
        }
      }

      setState(prev => ({
        ...prev,
        buckets,
        tasksByBucket,
        isLoading: false,
      }));

    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const getPriorityBadge = (priority: number): { label: string; color: string } => {
    if (priority <= 3) return { label: 'Urgent', color: '#d13438' };
    if (priority <= 5) return { label: 'Important', color: '#e97548' };
    if (priority <= 7) return { label: 'Medium', color: '#ffb900' };
    return { label: 'Low', color: '#00b294' };
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    if (days < 0) return '⚠️ Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedPlan = state.plans.find(p => p.id === state.selectedPlanId);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>📋 Planner</h1>
          {selectedPlan && (
            <select
              value={state.selectedPlanId || ''}
              onChange={(e) => loadPlan(e.target.value)}
              style={styles.planSelector}
            >
              {state.plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
          )}
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => setState(prev => ({ ...prev, filterMode: 'all' }))}
            style={{
              ...styles.filterButton,
              ...(state.filterMode === 'all' ? styles.filterButtonActive : {}),
            }}
          >
            All tasks
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, filterMode: 'me' }))}
            style={{
              ...styles.filterButton,
              ...(state.filterMode === 'me' ? styles.filterButtonActive : {}),
            }}
          >
            Assigned to me
          </button>
          <button onClick={() => loadPlans()} style={styles.refreshButton}>
            🔄
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {state.isLoading && (
        <div style={styles.loading}>Loading plan...</div>
      )}

      {state.error && (
        <div style={styles.error}>{state.error}</div>
      )}

      {/* Kanban Board */}
      {!state.isLoading && state.buckets.length > 0 && (
        <div style={styles.board}>
          {state.buckets.map(bucket => {
            const tasks = state.tasksByBucket.get(bucket.id) || [];

            // Calculate task height dynamically
            const getTaskHeight = (index: number): number => {
              const task = tasks[index];
              if (!task) return 80;
              let height = 80; // Base height
              if (task.percentComplete > 0) height += 15; // Progress bar
              if (task.hasDescription) height += 5; // Description icon
              if (task.assignments.length > 3) height += 5; // Extra assignees
              return height;
            };

            // TaskRow component for virtual scrolling
            const TaskRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
              const task = tasks[index];
              if (!task) return null;

              const priority = getPriorityBadge(task.priority);
              const isDueSoon = task.dueDateTime &&
                task.dueDateTime.getTime() - Date.now() < 86400000 * 3;

              return (
                <div style={{ ...style, padding: '6px 0' }}>
                  <div
                    style={{
                      ...styles.taskCard,
                      borderLeft: `4px solid ${priority.color}`,
                    }}
                  >
                    {/* Task Title */}
                    <div style={styles.taskTitle}>{task.title}</div>

                    {/* Progress Bar */}
                    {task.percentComplete > 0 && (
                      <div style={styles.progressContainer}>
                        <div
                          style={{
                            ...styles.progressBar,
                            width: `${task.percentComplete}%`,
                          }}
                        />
                        <span style={styles.progressText}>
                          {task.percentComplete}%
                        </span>
                      </div>
                    )}

                    {/* Task Footer */}
                    <div style={styles.taskFooter}>
                      {/* Assignees */}
                      <div style={styles.assignees}>
                        {task.assignments.slice(0, 3).map((assignment, idx) => (
                          <div
                            key={assignment.userId}
                            style={{
                              ...styles.avatar,
                              marginLeft: idx > 0 ? '-8px' : 0,
                              zIndex: 10 - idx,
                            }}
                            title={userNames.get(assignment.userId) || assignment.userId}
                          >
                            {getInitials(userNames.get(assignment.userId) || '??')}
                          </div>
                        ))}
                        {task.assignments.length > 3 && (
                          <div style={{ ...styles.avatar, marginLeft: '-8px' }}>
                            +{task.assignments.length - 3}
                          </div>
                        )}
                      </div>

                      {/* Due Date */}
                      {task.dueDateTime && (
                        <div
                          style={{
                            ...styles.dueDate,
                            ...(isDueSoon ? styles.dueDateUrgent : {}),
                          }}
                        >
                          📅 {formatDate(task.dueDateTime)}
                        </div>
                      )}
                    </div>

                    {/* Priority Badge */}
                    {task.priority <= 5 && (
                      <div
                        style={{
                          ...styles.priorityBadge,
                          backgroundColor: priority.color,
                        }}
                      >
                        {priority.label}
                      </div>
                    )}

                    {/* Description indicator */}
                    {task.hasDescription && (
                      <div style={styles.descriptionIcon}>📝</div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div key={bucket.id} style={styles.column}>
                {/* Column Header */}
                <div style={styles.columnHeader}>
                  <h3 style={styles.columnTitle}>{bucket.name}</h3>
                  <span style={styles.columnCount}>{tasks.length}</span>
                </div>

                {/* Tasks - Virtual Scrolling */}
                <div style={styles.tasksContainer}>
                  {tasks.length > 0 ? (
                    <List
                      height={Math.min(tasks.length * 90, window.innerHeight - 250)}
                      itemCount={tasks.length}
                      itemSize={getTaskHeight}
                      width="100%"
                    >
                      {TaskRow}
                    </List>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#605e5c' }}>
                      No tasks
                    </div>
                  )}
                  {/* Add Task Button - removed from inside map, will add after List */}
                  <button style={styles.addTaskButton}>
                    + Add task
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Column Button */}
          <button style={styles.addColumnButton}>
            + Add bucket
          </button>
        </div>
      )}

      {/* Empty State */}
      {!state.isLoading && state.plans.length === 0 && (
        <div style={styles.emptyState}>
          No plans found. Create a plan in Microsoft Planner first.
        </div>
      )}
    </div>
  );
};

// Styles Planner-like
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#faf9f8',
    color: '#323130',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #edebe9',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
  },
  planSelector: {
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #8a8886',
    borderRadius: '2px',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
  },
  filterButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '2px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#323130',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#edebe9',
    borderColor: '#8a8886',
  },
  refreshButton: {
    padding: '6px 12px',
    backgroundColor: '#0078d4',
    border: 'none',
    borderRadius: '2px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  loading: {
    padding: '32px',
    textAlign: 'center',
    color: '#605e5c',
  },
  error: {
    padding: '16px',
    margin: '16px',
    backgroundColor: '#fde7e9',
    border: '1px solid #d13438',
    borderRadius: '2px',
    color: '#a4262c',
  },
  board: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    overflowX: 'auto',
    flex: 1,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    width: '320px',
    minWidth: '320px',
    backgroundColor: '#f3f2f1',
    borderRadius: '2px',
    maxHeight: 'calc(100vh - 120px)',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #edebe9',
  },
  columnTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  columnCount: {
    fontSize: '12px',
    color: '#605e5c',
    backgroundColor: '#fff',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  tasksContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskCard: {
    position: 'relative',
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '2px',
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,0.132)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  progressContainer: {
    position: 'relative',
    width: '100%',
    height: '4px',
    backgroundColor: '#edebe9',
    borderRadius: '2px',
    marginBottom: '8px',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0078d4',
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
  progressText: {
    position: 'absolute',
    top: '-16px',
    right: '0',
    fontSize: '10px',
    color: '#605e5c',
  },
  taskFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  assignees: {
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#0078d4',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    border: '2px solid #fff',
  },
  dueDate: {
    fontSize: '12px',
    color: '#605e5c',
  },
  dueDateUrgent: {
    color: '#d13438',
    fontWeight: 600,
  },
  priorityBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#fff',
  },
  descriptionIcon: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    fontSize: '12px',
  },
  addTaskButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: '1px dashed #8a8886',
    borderRadius: '2px',
    color: '#323130',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  addColumnButton: {
    width: '200px',
    minWidth: '200px',
    padding: '12px',
    backgroundColor: '#f3f2f1',
    border: '1px dashed #8a8886',
    borderRadius: '2px',
    color: '#323130',
    fontSize: '14px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#605e5c',
    fontSize: '16px',
  },
};
