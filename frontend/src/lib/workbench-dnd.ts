import type {
  BenchToolDragPayload,
  DropTargetType,
  RackToolDragPayload,
  ToolbarDragPayload,
} from "@/types/workbench";

export const WORKBENCH_DRAG_MIME = "application/x-betalab-workbench-item";
export const BENCH_TOOL_DRAG_MIME = "application/x-betalab-bench-tool-item";
export const RACK_TOOL_DRAG_MIME = "application/x-betalab-rack-tool-item";
const DROP_TARGET_MIME_PREFIX = "application/x-betalab-drop-target-";

function getDropTargetMime(targetType: DropTargetType) {
  return `${DROP_TARGET_MIME_PREFIX}${targetType}`;
}

export function writeToolbarDragPayload(dataTransfer: DataTransfer, payload: ToolbarDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(WORKBENCH_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(getDropTargetMime(targetType), payload.itemId);
  });
  dataTransfer.effectAllowed = "copy";
}

export function writeBenchToolDragPayload(dataTransfer: DataTransfer, payload: BenchToolDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(BENCH_TOOL_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(getDropTargetMime(targetType), payload.sourceSlotId);
  });
  dataTransfer.effectAllowed = "move";
}

export function writeRackToolDragPayload(dataTransfer: DataTransfer, payload: RackToolDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(RACK_TOOL_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(getDropTargetMime(targetType), payload.rackSlotId);
  });
  dataTransfer.effectAllowed = "move";
}

function hasDragMime(dataTransfer: DataTransfer, mime: string) {
  return Array.from(dataTransfer.types ?? []).includes(mime);
}

export function hasCompatibleDropTarget(dataTransfer: DataTransfer, targetType: DropTargetType) {
  return hasDragMime(dataTransfer, getDropTargetMime(targetType));
}

export function readToolbarDragPayload(dataTransfer: DataTransfer): ToolbarDragPayload | null {
  const rawPayload =
    dataTransfer.getData(WORKBENCH_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<ToolbarDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "workspace_canvas" ||
          targetType === "rack_slot" ||
          targetType === "trash_bin",
      ) ?? [];

    if (
      (
        parsed.itemType === "tool" ||
        parsed.itemType === "liquid" ||
        parsed.itemType === "workspace_widget"
      ) &&
      typeof parsed.itemId === "string" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        itemId: parsed.itemId,
        itemType: parsed.itemType,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readBenchToolDragPayload(dataTransfer: DataTransfer): BenchToolDragPayload | null {
  const rawPayload =
    dataTransfer.getData(BENCH_TOOL_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<BenchToolDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "workspace_canvas" ||
          targetType === "rack_slot" ||
          targetType === "trash_bin",
      ) ?? [];

    if (
      typeof parsed.sourceSlotId === "string" &&
      typeof parsed.toolId === "string" &&
      typeof parsed.toolType === "string" &&
      typeof parsed.trashable === "boolean" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        sourceSlotId: parsed.sourceSlotId,
        toolId: parsed.toolId,
        toolType: parsed.toolType,
        trashable: parsed.trashable,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readRackToolDragPayload(dataTransfer: DataTransfer): RackToolDragPayload | null {
  const rawPayload = dataTransfer.getData(RACK_TOOL_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<RackToolDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "workspace_canvas" ||
          targetType === "rack_slot" ||
          targetType === "trash_bin",
      ) ?? [];

    if (
      typeof parsed.rackSlotId === "string" &&
      typeof parsed.toolId === "string" &&
      typeof parsed.toolType === "string" &&
      typeof parsed.trashable === "boolean" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        rackSlotId: parsed.rackSlotId,
        toolId: parsed.toolId,
        toolType: parsed.toolType,
        trashable: parsed.trashable,
      };
    }
  } catch {
    return null;
  }

  return null;
}
