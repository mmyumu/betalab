import {
  resolveDropTargetFromActiveDrag,
  resolveDropTargetFromDataTransfer,
  type DropTargetNode,
} from "@/lib/drop-target-resolver";
import {
  canToolAcceptLiquids,
  canToolAcceptProduce,
  canToolReceiveContents,
} from "@/lib/tool-drop-targets";
import { readDragDescriptor } from "@/lib/workbench-dnd";
import type { BenchToolInstance, DragDescriptor, DropTargetType } from "@/types/workbench";

type ToolDropResolution =
  | { kind: "parent" }
  | { kind: "tool"; tool: BenchToolInstance };

function toolHasLimsLabel(tool: BenchToolInstance) {
  return (tool.labels ?? []).some((label) => label.labelKind === "lims");
}

function canDescriptorResolveOnTool(
  descriptor: DragDescriptor | null,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
) {
  if (descriptor === null || tool === null) {
    return false;
  }

  if (!parentDropTargetTypes.some((targetType) => descriptor.allowedDropTargets.includes(targetType))) {
    return false;
  }

  if (descriptor.entityKind === "liquid") {
    return (
      canToolAcceptLiquids(tool.toolType) &&
      canToolReceiveContents(tool.toolType, tool.isSealed)
    );
  }

  if (descriptor.entityKind === "produce") {
    return (
      canToolAcceptProduce(tool.toolType) &&
      canToolReceiveContents(tool.toolType, tool.isSealed) &&
      (tool.produceLots?.length ?? 0) === 0
    );
  }

  if (descriptor.entityKind === "sample_label") {
    return true;
  }

  if (descriptor.entityKind === "lims_label_ticket") {
    return !toolHasLimsLabel(tool);
  }

  return false;
}

function buildToolDropTree({
  parentDropTargetTypes,
  tool,
}: {
  parentDropTargetTypes: DropTargetType[];
  tool: BenchToolInstance | null;
}): DropTargetNode<ToolDropResolution> {
  return {
    acceptsDrop: () => false,
    children:
      tool === null
        ? []
        : [
            {
              acceptsDrop: ({ activeDragItem, dataTransfer }) =>
                canDescriptorResolveOnTool(
                  dataTransfer === null ? activeDragItem : readDragDescriptor(dataTransfer),
                  { parentDropTargetTypes, tool },
                ),
              resolveTarget: () => ({ kind: "tool", tool }),
            },
          ],
    resolveTarget: () => ({ kind: "parent" }),
  };
}

export function resolveToolDropTargetFromDataTransfer(
  dataTransfer: DataTransfer,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
) {
  return resolveDropTargetFromDataTransfer(
    buildToolDropTree({ parentDropTargetTypes, tool }),
    dataTransfer,
  );
}

export function resolveToolDropTargetFromActiveDrag(
  dragDescriptor: DragDescriptor | null,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
) {
  return resolveDropTargetFromActiveDrag(
    buildToolDropTree({ parentDropTargetTypes, tool }),
    dragDescriptor,
  );
}

export function canResolveDropOnTool(
  dataTransfer: DataTransfer,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
) {
  return (
    resolveToolDropTargetFromDataTransfer(dataTransfer, {
      parentDropTargetTypes,
      tool,
    })?.kind === "tool"
  );
}

export function canResolveActiveDragOnTool(
  dragDescriptor: DragDescriptor | null,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
) {
  return (
    resolveToolDropTargetFromActiveDrag(dragDescriptor, {
      parentDropTargetTypes,
      tool,
    })?.kind === "tool"
  );
}
