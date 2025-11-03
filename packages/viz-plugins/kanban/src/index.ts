/**
 * Kanban Plugin - Visualisation en board Kanban avec drag & drop
 *
 * @package @cartae/kanban-plugin
 * @version 1.0.0
 *
 * Transforme les CartaeItems en board Kanban avec 4 colonnes:
 * - Backlog: Tâches non commencées
 * - In Progress: Tâches en cours
 * - Review: Tâches en revue
 * - Done: Tâches terminées
 *
 * Fonctionnalités:
 * - Mapping intelligent du status depuis metadata/tags/content
 * - Drag & drop entre colonnes (via @dnd-kit)
 * - Filtrage par tags, priorité, assigné
 * - Statistiques du board
 */

// Plugin principal
export { KanbanPlugin } from './KanbanPlugin';

// Types
export type {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanStatus,
} from './types/kanban';
export { DEFAULT_COLUMNS } from './types/kanban';

// Converters
export {
  cartaeItemToKanban,
  cartaeItemsToKanban,
} from './converters/cartaeItemToKanban';

// Composants React (renommés pour éviter conflit avec type KanbanBoard)
export { KanbanBoard as KanbanBoardView } from './components/KanbanBoard';
export { KanbanColumnComponent } from './components/KanbanColumn';
export { KanbanCardComponent } from './components/KanbanCard';

// Styles
import './styles/kanban.css';
