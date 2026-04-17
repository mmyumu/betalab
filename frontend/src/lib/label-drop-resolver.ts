import {
  resolveDropTargetFromActiveDrag,
  resolveDropTargetFromDataTransfer,
  type DropTargetNode,
} from "@/lib/drop-target-resolver";
import {
  readLimsLabelTicketDragPayload,
  readSampleLabelDragPayload,
  readToolbarDragPayload,
} from "@/lib/workbench-dnd";
import type {
  BenchToolInstance,
  DragDescriptor,
  DropTargetType,
  LimsLabelTicketDragPayload,
  SampleLabelDragPayload,
  ToolbarDragPayload,
} from "@/types/workbench";

type LabelDragPayload =
  | { kind: "palette_sample_label"; payload: ToolbarDragPayload }
  | { kind: "workbench_sample_label"; payload: SampleLabelDragPayload }
  | { kind: "trash_sample_label"; payload: SampleLabelDragPayload }
  | { kind: "lims_label_ticket"; payload: LimsLabelTicketDragPayload };

type LabelDropResolution =
  | { kind: "parent" }
  | { kind: "tool"; tool: BenchToolInstance };

export function readLabelDragPayload(dataTransfer: DataTransfer): LabelDragPayload | null {
  const toolbarPayload = readToolbarDragPayload(dataTransfer);
  if (toolbarPayload?.itemType === "sample_label") {
    return { kind: "palette_sample_label", payload: toolbarPayload };
  }

  const sampleLabelPayload = readSampleLabelDragPayload(dataTransfer);
  if (sampleLabelPayload?.sourceKind === "workbench") {
    return { kind: "workbench_sample_label", payload: sampleLabelPayload };
  }
  if (sampleLabelPayload?.sourceKind === "trash") {
    return { kind: "trash_sample_label", payload: sampleLabelPayload };
  }

  const limsTicketPayload = readLimsLabelTicketDragPayload(dataTransfer);
  if (limsTicketPayload) {
    return { kind: "lims_label_ticket", payload: limsTicketPayload };
  }

  return null;
}

function toolHasLimsLabel(tool: BenchToolInstance) {
  return (tool.labels ?? []).some((label) => label.labelKind === "lims");
}

function canAllowedDropTargetsResolveOnTool(
  allowedDropTargets: DropTargetType[],
  {
    isLimsTicket,
    parentDropTargetTypes,
    tool,
  }: {
    isLimsTicket: boolean;
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
) {
  if (tool === null) {
    return false;
  }
  if (!parentDropTargetTypes.some((targetType) => allowedDropTargets.includes(targetType))) {
    return false;
  }
  if (isLimsTicket) {
    return !toolHasLimsLabel(tool);
  }
  return true;
}

function buildLabelDropTree({
  parentDropTargetTypes,
  tool,
}: {
  parentDropTargetTypes: DropTargetType[];
  tool: BenchToolInstance | null;
}): DropTargetNode<LabelDropResolution> {
  return {
    acceptsDrop: () => false,
    children:
      tool === null
        ? []
        : [
            {
              acceptsDrop: ({ activeDragItem, dataTransfer }) => {
                const labelDrag =
                  dataTransfer === null
                    ? activeDragItem === null ||
                      (activeDragItem.entityKind !== "sample_label" &&
                        activeDragItem.entityKind !== "lims_label_ticket")
                      ? null
                      : {
                          allowedDropTargets: activeDragItem.allowedDropTargets ?? [],
                          isLimsTicket: activeDragItem.entityKind === "lims_label_ticket",
                        }
                    : (() => {
                        const payload = readLabelDragPayload(dataTransfer);
                        if (payload === null) {
                          return null;
                        }
                        return {
                          allowedDropTargets: payload.payload.allowedDropTargets ?? [],
                          isLimsTicket: payload.kind === "lims_label_ticket",
                        };
                      })();

                if (labelDrag === null) {
                  return false;
                }

                return canAllowedDropTargetsResolveOnTool(labelDrag.allowedDropTargets, {
                  isLimsTicket: labelDrag.isLimsTicket,
                  parentDropTargetTypes,
                  tool,
                });
              },
              resolveTarget: () => ({ kind: "tool", tool }),
            },
          ],
    resolveTarget: () => ({ kind: "parent" }),
  };
}

export function canResolveLabelDropOnTool(
  dataTransfer: DataTransfer,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
): boolean {
  return (
    resolveDropTargetFromDataTransfer(
      buildLabelDropTree({
        parentDropTargetTypes,
        tool,
      }),
      dataTransfer,
    )?.kind === "tool"
  );
}

export function canResolveActiveLabelDragOnTool(
  dragDescriptor: DragDescriptor | null,
  {
    parentDropTargetTypes,
    tool,
  }: {
    parentDropTargetTypes: DropTargetType[];
    tool: BenchToolInstance | null;
  },
): boolean {
  return (
    resolveDropTargetFromActiveDrag(
      buildLabelDropTree({
        parentDropTargetTypes,
        tool,
      }),
      dragDescriptor,
    )?.kind === "tool"
  );
}
