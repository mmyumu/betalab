import { canResolveActiveDragOnTool, canResolveDropOnTool } from "@/lib/tool-drop-resolver";
import {
  readLimsLabelTicketDragPayload,
  readSampleLabelDragPayload,
  readToolbarDragPayload,
} from "@/lib/workbench-dnd";
import type {
  BenchToolInstance,
  DragDescriptor,
  DropTargetType,
} from "@/types/workbench";
import type { LabelDragPayload } from "@/lib/label-drop-command-resolver";

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
  return canResolveDropOnTool(dataTransfer, { parentDropTargetTypes, tool });
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
  return canResolveActiveDragOnTool(dragDescriptor, { parentDropTargetTypes, tool });
}
