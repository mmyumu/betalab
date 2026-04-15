import type { DragDescriptor } from "@/types/workbench";

export type DropAcceptanceContext = {
  activeDragItem: DragDescriptor | null;
  dataTransfer: DataTransfer | null;
};

export type DropTargetNode<TResolved> = {
  acceptsDrop: (context: DropAcceptanceContext) => boolean;
  children?: DropTargetNode<TResolved>[];
  resolveTarget: () => TResolved;
};

function resolveDeepestDropTarget<TResolved>(
  node: DropTargetNode<TResolved>,
  context: DropAcceptanceContext,
): TResolved | null {
  for (const child of node.children ?? []) {
    const resolvedChildTarget = resolveDeepestDropTarget(child, context);
    if (resolvedChildTarget !== null) {
      return resolvedChildTarget;
    }
  }

  if (!node.acceptsDrop(context)) {
    return null;
  }

  return node.resolveTarget();
}

export function resolveDropTargetFromDataTransfer<TResolved>(
  node: DropTargetNode<TResolved>,
  dataTransfer: DataTransfer,
): TResolved | null {
  return resolveDeepestDropTarget(node, {
    activeDragItem: null,
    dataTransfer,
  });
}

export function resolveDropTargetFromActiveDrag<TResolved>(
  node: DropTargetNode<TResolved>,
  activeDragItem: DragDescriptor | null,
): TResolved | null {
  return resolveDeepestDropTarget(node, {
    activeDragItem,
    dataTransfer: null,
  });
}
