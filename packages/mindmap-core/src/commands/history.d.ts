/**
 * FR: Gestionnaire d'historique pour undo/redo
 * EN: History manager for undo/redo
 */
import { MindMap, Command, HistoryState } from '../model';
export declare class HistoryManager {
  private state;
  constructor(limit?: number);
  /**
   * FR: Ajouter une commande à l'historique
   * EN: Add a command to history
   */
  addCommand(command: Command): void;
  /**
   * FR: Annuler la dernière commande
   * EN: Undo last command
   */
  undo(map: MindMap): MindMap | null;
  /**
   * FR: Refaire la commande suivante
   * EN: Redo next command
   */
  redo(map: MindMap): MindMap | null;
  /**
   * FR: Vérifier si on peut annuler
   * EN: Check if can undo
   */
  canUndo(): boolean;
  /**
   * FR: Vérifier si on peut refaire
   * EN: Check if can redo
   */
  canRedo(): boolean;
  /**
   * FR: Obtenir l'historique des commandes
   * EN: Get command history
   */
  getHistory(): Command[];
  /**
   * FR: Obtenir la commande actuelle
   * EN: Get current command
   */
  getCurrentCommand(): Command | null;
  /**
   * FR: Vider l'historique
   * EN: Clear history
   */
  clear(): void;
  /**
   * FR: Obtenir l'état de l'historique
   * EN: Get history state
   */
  getState(): HistoryState;
  /**
   * FR: Restaurer l'état de l'historique
   * EN: Restore history state
   */
  setState(state: HistoryState): void;
}
//# sourceMappingURL=history.d.ts.map
