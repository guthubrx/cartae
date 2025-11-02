/**
 * FR: Commandes pour le pattern Command (undo/redo)
 * EN: Commands for Command pattern (undo/redo)
 */
import { produce } from 'immer';
// FR: Commande pour ajouter un nœud
// EN: Command to add a node
export class AddNodeCommand {
  nodeId;
  parentId;
  title;
  position;
  constructor(nodeId, parentId, title, position = { x: 0, y: 0 }) {
    this.nodeId = nodeId;
    this.parentId = parentId;
    this.title = title;
    this.position = position;
  }
  execute(state) {
    return produce(state, draft => {
      // FR: Créer le nouveau nœud
      // EN: Create the new node
      const newNode = {
        id: this.nodeId,
        parentId: this.parentId,
        title: this.title,
        children: [],
        collapsed: false,
        x: this.position.x,
        y: this.position.y,
        width: 200,
        height: 40,
      };
      // FR: Ajouter le nœud au dictionnaire
      // EN: Add node to dictionary
      draft.nodes[this.nodeId] = newNode;
      // FR: Ajouter l'enfant au parent si nécessaire
      // EN: Add child to parent if needed
      if (this.parentId) {
        const parent = draft.nodes[this.parentId];
        if (parent) {
          parent.children.push(this.nodeId);
        }
      }
    });
  }
  undo(state) {
    return produce(state, draft => {
      // FR: Supprimer le nœud du dictionnaire
      // EN: Remove node from dictionary
      delete draft.nodes[this.nodeId];
      // FR: Retirer l'enfant du parent si nécessaire
      // EN: Remove child from parent if needed
      if (this.parentId) {
        const parent = draft.nodes[this.parentId];
        if (parent) {
          parent.children = parent.children.filter(id => id !== this.nodeId);
        }
      }
    });
  }
  get description() {
    return `Ajouter le nœud "${this.title}"`;
  }
  get timestamp() {
    return Date.now();
  }
}
// FR: Commande pour supprimer un nœud
// EN: Command to delete a node
export class DeleteNodeCommand {
  nodeId;
  deletedNode = null;
  deletedChildren = [];
  constructor(nodeId) {
    this.nodeId = nodeId;
  }
  execute(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Sauvegarder le nœud et ses enfants pour l'undo
      // EN: Save node and its children for undo
      this.deletedNode = { ...node };
      this.deletedChildren = node.children
        .map(id => {
          const child = draft.nodes[id];
          return child ? { ...child } : null;
        })
        .filter(Boolean);
      // FR: Supprimer tous les descendants récursivement
      // EN: Delete all descendants recursively
      this.deleteNodeRecursive(draft, this.nodeId);
      // FR: Retirer l'enfant du parent
      // EN: Remove child from parent
      if (node.parentId) {
        const parent = draft.nodes[node.parentId];
        if (parent) {
          parent.children = parent.children.filter(id => id !== this.nodeId);
        }
      }
    });
  }
  undo(state) {
    if (!this.deletedNode) return state;
    return produce(state, draft => {
      // FR: Restaurer le nœud principal
      // EN: Restore main node
      if (this.deletedNode) {
        draft.nodes[this.deletedNode.id] = { ...this.deletedNode };
      }
      // FR: Restaurer les enfants
      // EN: Restore children
      this.deletedChildren.forEach(child => {
        if (child) {
          draft.nodes[child.id] = { ...child };
        }
      });
      // FR: Remettre l'enfant dans le parent
      // EN: Put child back in parent
      if (this.deletedNode && this.deletedNode.parentId) {
        const parent = draft.nodes[this.deletedNode.parentId];
        if (parent) {
          parent.children.push(this.deletedNode.id);
        }
      }
    });
  }
  deleteNodeRecursive(draft, nodeId) {
    const node = draft.nodes[nodeId];
    if (!node) return;
    // FR: Supprimer récursivement tous les enfants
    // EN: Recursively delete all children
    node.children.forEach(childId => {
      this.deleteNodeRecursive(draft, childId);
    });
    // FR: Supprimer le nœud
    // EN: Delete the node
    delete draft.nodes[nodeId];
  }
  get description() {
    return `Supprimer le nœud "${this.deletedNode?.title || 'inconnu'}"`;
  }
  get timestamp() {
    return Date.now();
  }
}
// FR: Commande pour modifier le titre d'un nœud
// EN: Command to modify node title
export class UpdateNodeTitleCommand {
  nodeId;
  newTitle;
  previousTitle = '';
  constructor(nodeId, newTitle) {
    this.nodeId = nodeId;
    this.newTitle = newTitle;
  }
  execute(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Sauvegarder l'ancien titre
      // EN: Save old title
      this.previousTitle = node.title;
      // FR: Mettre à jour le titre
      // EN: Update title
      node.title = this.newTitle;
    });
  }
  undo(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Restaurer l'ancien titre
      // EN: Restore old title
      node.title = this.previousTitle;
    });
  }
  get description() {
    return `Modifier le titre en "${this.newTitle}"`;
  }
  get timestamp() {
    return Date.now();
  }
}
// FR: Commande pour déplacer un nœud
// EN: Command to move a node
export class MoveNodeCommand {
  nodeId;
  newPosition;
  previousPosition = { x: 0, y: 0 };
  constructor(nodeId, newPosition) {
    this.nodeId = nodeId;
    this.newPosition = newPosition;
  }
  execute(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Sauvegarder l'ancienne position
      // EN: Save old position
      this.previousPosition = { x: node.x || 0, y: node.y || 0 };
      // FR: Mettre à jour la position
      // EN: Update position
      node.x = this.newPosition.x;
      node.y = this.newPosition.y;
    });
  }
  undo(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Restaurer l'ancienne position
      // EN: Restore old position
      node.x = this.previousPosition.x;
      node.y = this.previousPosition.y;
    });
  }
  get description() {
    return `Déplacer le nœud vers (${this.newPosition.x}, ${this.newPosition.y})`;
  }
  get timestamp() {
    return Date.now();
  }
}
// FR: Commande pour changer le parent d'un nœud
// EN: Command to change node parent
export class ReparentNodeCommand {
  nodeId;
  newParentId;
  newIndex;
  previousParentId = null;
  previousIndex = -1;
  constructor(nodeId, newParentId, newIndex = 0) {
    this.nodeId = nodeId;
    this.newParentId = newParentId;
    this.newIndex = newIndex;
  }
  execute(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Sauvegarder l'ancien parent et l'index
      // EN: Save old parent and index
      this.previousParentId = node.parentId;
      if (node.parentId) {
        const parent = draft.nodes[node.parentId];
        this.previousIndex = parent.children.indexOf(this.nodeId);
      }
      // FR: Retirer de l'ancien parent
      // EN: Remove from old parent
      if (node.parentId) {
        const oldParent = draft.nodes[node.parentId];
        if (oldParent) {
          oldParent.children = oldParent.children.filter(id => id !== this.nodeId);
        }
      }
      // FR: Ajouter au nouveau parent
      // EN: Add to new parent
      node.parentId = this.newParentId;
      if (this.newParentId) {
        const newParent = draft.nodes[this.newParentId];
        if (newParent) {
          newParent.children.splice(this.newIndex, 0, this.nodeId);
        }
      }
    });
  }
  undo(state) {
    return produce(state, draft => {
      const node = draft.nodes[this.nodeId];
      if (!node) return;
      // FR: Retirer du nouveau parent
      // EN: Remove from new parent
      if (node.parentId) {
        const currentParent = draft.nodes[node.parentId];
        if (currentParent) {
          currentParent.children = currentParent.children.filter(id => id !== this.nodeId);
        }
      }
      // FR: Remettre dans l'ancien parent
      // EN: Put back in old parent
      node.parentId = this.previousParentId;
      if (this.previousParentId) {
        const oldParent = draft.nodes[this.previousParentId];
        if (oldParent) {
          oldParent.children.splice(this.previousIndex, 0, this.nodeId);
        }
      }
    });
  }
  get description() {
    return `Déplacer le nœud vers un nouveau parent`;
  }
  get timestamp() {
    return Date.now();
  }
}
//# sourceMappingURL=commands.js.map
