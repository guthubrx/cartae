/**
 * FR: Commandes pour le pattern Command (undo/redo)
 * EN: Commands for Command pattern (undo/redo)
 */
import { MindMap, NodeID, Command } from './model';
export declare class AddNodeCommand implements Command {
  private nodeId;
  private parentId;
  private title;
  private position;
  constructor(
    nodeId: NodeID,
    parentId: NodeID | null,
    title: string,
    position?: {
      x: number;
      y: number;
    }
  );
  execute(state: MindMap): MindMap;
  undo(state: MindMap): MindMap;
  get description(): string;
  get timestamp(): number;
}
export declare class DeleteNodeCommand implements Command {
  private nodeId;
  private deletedNode;
  private deletedChildren;
  constructor(nodeId: NodeID);
  execute(state: MindMap): MindMap;
  undo(state: MindMap): MindMap;
  private deleteNodeRecursive;
  get description(): string;
  get timestamp(): number;
}
export declare class UpdateNodeTitleCommand implements Command {
  private nodeId;
  private newTitle;
  private previousTitle;
  constructor(nodeId: NodeID, newTitle: string);
  execute(state: MindMap): MindMap;
  undo(state: MindMap): MindMap;
  get description(): string;
  get timestamp(): number;
}
export declare class MoveNodeCommand implements Command {
  private nodeId;
  private newPosition;
  private previousPosition;
  constructor(
    nodeId: NodeID,
    newPosition: {
      x: number;
      y: number;
    }
  );
  execute(state: MindMap): MindMap;
  undo(state: MindMap): MindMap;
  get description(): string;
  get timestamp(): number;
}
export declare class ReparentNodeCommand implements Command {
  private nodeId;
  private newParentId;
  private newIndex;
  private previousParentId;
  private previousIndex;
  constructor(nodeId: NodeID, newParentId: NodeID | null, newIndex?: number);
  execute(state: MindMap): MindMap;
  undo(state: MindMap): MindMap;
  get description(): string;
  get timestamp(): number;
}
//# sourceMappingURL=commands.d.ts.map
