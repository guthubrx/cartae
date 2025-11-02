/**
 * FR: Gestionnaire d'historique pour undo/redo
 * EN: History manager for undo/redo
 */

import { MindMap, Command, HistoryState } from '../model';

// FR: Gestionnaire d'historique avec limite configurable
// EN: History manager with configurable limit
export class HistoryManager {
  private state: HistoryState;

  constructor(limit: number = 100) {
    this.state = {
      commands: [],
      currentIndex: -1,
      limit,
    };
  }

  /**
   * FR: Ajouter une commande à l'historique
   * EN: Add a command to history
   */
  addCommand(command: Command): void {
    // FR: Supprimer les commandes après l'index actuel
    // EN: Remove commands after current index
    this.state.commands = this.state.commands.slice(0, this.state.currentIndex + 1);

    // FR: Ajouter la nouvelle commande
    // EN: Add new command
    this.state.commands.push(command);

    // FR: Appliquer la limite
    // EN: Apply limit
    if (this.state.commands.length > this.state.limit) {
      this.state.commands.shift();
    } else {
      this.state.currentIndex++;
    }
  }

  /**
   * FR: Annuler la dernière commande
   * EN: Undo last command
   */
  undo(map: MindMap): MindMap | null {
    if (!this.canUndo()) return null;

    const command = this.state.commands[this.state.currentIndex];
    this.state.currentIndex--;

    return command.undo(map);
  }

  /**
   * FR: Refaire la commande suivante
   * EN: Redo next command
   */
  redo(map: MindMap): MindMap | null {
    if (!this.canRedo()) return null;

    this.state.currentIndex++;
    const command = this.state.commands[this.state.currentIndex];

    return command.execute(map);
  }

  /**
   * FR: Vérifier si on peut annuler
   * EN: Check if can undo
   */
  canUndo(): boolean {
    return this.state.currentIndex >= 0;
  }

  /**
   * FR: Vérifier si on peut refaire
   * EN: Check if can redo
   */
  canRedo(): boolean {
    return this.state.currentIndex < this.state.commands.length - 1;
  }

  /**
   * FR: Obtenir l'historique des commandes
   * EN: Get command history
   */
  getHistory(): Command[] {
    return [...this.state.commands];
  }

  /**
   * FR: Obtenir la commande actuelle
   * EN: Get current command
   */
  getCurrentCommand(): Command | null {
    if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.commands.length) {
      return this.state.commands[this.state.currentIndex];
    }
    return null;
  }

  /**
   * FR: Vider l'historique
   * EN: Clear history
   */
  clear(): void {
    this.state = {
      commands: [],
      currentIndex: -1,
      limit: this.state.limit,
    };
  }

  /**
   * FR: Obtenir l'état de l'historique
   * EN: Get history state
   */
  getState(): HistoryState {
    return { ...this.state };
  }

  /**
   * FR: Restaurer l'état de l'historique
   * EN: Restore history state
   */
  setState(state: HistoryState): void {
    this.state = { ...state };
  }
}
