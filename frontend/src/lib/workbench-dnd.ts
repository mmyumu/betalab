import type {
  BenchToolDragPayload,
  DragDescriptor,
  DropTargetType,
  ProduceDragPayload,
  RackToolDragPayload,
  SampleLabelDragPayload,
  TrashToolDragPayload,
  ToolbarDragPayload,
  ToolbarItem,
  WorkspaceWidgetDragPayload,
} from "@/types/workbench";

export const WORKBENCH_DRAG_MIME = "application/x-betalab-workbench-item";
export const BENCH_TOOL_DRAG_MIME = "application/x-betalab-bench-tool-item";
export const RACK_TOOL_DRAG_MIME = "application/x-betalab-rack-tool-item";
export const TRASH_TOOL_DRAG_MIME = "application/x-betalab-trash-tool-item";
export const WORKSPACE_WIDGET_DRAG_MIME = "application/x-betalab-workspace-widget-item";
export const PRODUCE_DRAG_MIME = "application/x-betalab-produce-item";
export const SAMPLE_LABEL_DRAG_MIME = "application/x-betalab-sample-label-item";
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

export function createToolbarDragPayload(item: ToolbarItem): ToolbarDragPayload {
  if (item.itemType === "tool") {
    return {
      allowedDropTargets: item.allowedDropTargets,
      entityKind: "tool",
      itemId: item.id,
      itemType: "tool",
      sourceId: item.id,
      sourceKind: "palette",
      toolType: item.toolType,
    };
  }

  if (item.itemType === "liquid") {
    return {
      allowedDropTargets: item.allowedDropTargets,
      entityKind: "liquid",
      itemId: item.id,
      itemType: "liquid",
      liquidType: item.liquidType,
      sourceId: item.id,
      sourceKind: "palette",
    };
  }

  if (item.itemType === "sample_label") {
    return {
      allowedDropTargets: item.allowedDropTargets,
      entityKind: "sample_label",
      itemId: item.id,
      itemType: "sample_label",
      sourceId: item.id,
      sourceKind: "palette",
    };
  }

  return {
    allowedDropTargets: item.allowedDropTargets,
    entityKind: "workspace_widget",
    itemId: item.id,
    itemType: "workspace_widget",
    sourceId: item.id,
    sourceKind: "palette",
    widgetType: item.widgetType,
  };
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

export function writeTrashToolDragPayload(dataTransfer: DataTransfer, payload: TrashToolDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(TRASH_TOOL_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(getDropTargetMime(targetType), payload.trashToolId);
  });
  dataTransfer.effectAllowed = "move";
}

export function writeWorkspaceWidgetDragPayload(
  dataTransfer: DataTransfer,
  payload: WorkspaceWidgetDragPayload,
) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(WORKSPACE_WIDGET_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(getDropTargetMime(targetType), payload.widgetId);
  });
  dataTransfer.effectAllowed = "move";
}

export function writeProduceDragPayload(dataTransfer: DataTransfer, payload: ProduceDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(PRODUCE_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(getDropTargetMime(targetType), payload.produceLotId);
  });
  dataTransfer.effectAllowed = "move";
}

export function writeSampleLabelDragPayload(
  dataTransfer: DataTransfer,
  payload: SampleLabelDragPayload,
) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(SAMPLE_LABEL_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  payload.allowedDropTargets.forEach((targetType) => {
    dataTransfer.setData(
      getDropTargetMime(targetType),
      payload.sourceSlotId ?? payload.trashSampleLabelId ?? payload.sampleLabelId,
    );
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
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "tool" &&
      parsed.itemType === "tool" &&
      typeof parsed.itemId === "string" &&
      typeof parsed.toolType === "string" &&
      parsed.sourceKind === "palette" &&
      typeof parsed.sourceId === "string"
    ) {
      return {
        allowedDropTargets,
        entityKind: "tool",
        itemId: parsed.itemId,
        itemType: "tool",
        sourceId: parsed.sourceId,
        sourceKind: "palette",
        toolType: parsed.toolType,
      };
    }

    if (
      parsed.entityKind === "liquid" &&
      parsed.itemType === "liquid" &&
      typeof parsed.itemId === "string" &&
      typeof parsed.liquidType === "string" &&
      parsed.sourceKind === "palette" &&
      typeof parsed.sourceId === "string"
    ) {
      return {
        allowedDropTargets,
        entityKind: "liquid",
        itemId: parsed.itemId,
        itemType: "liquid",
        liquidType: parsed.liquidType,
        sourceId: parsed.sourceId,
        sourceKind: "palette",
      };
    }

    if (
      parsed.entityKind === "sample_label" &&
      parsed.itemType === "sample_label" &&
      typeof parsed.itemId === "string" &&
      parsed.sourceKind === "palette" &&
      typeof parsed.sourceId === "string"
    ) {
      return {
        allowedDropTargets,
        entityKind: "sample_label",
        itemId: parsed.itemId,
        itemType: "sample_label",
        sourceId: parsed.sourceId,
        sourceKind: "palette",
      };
    }

    if (
      parsed.entityKind === "workspace_widget" &&
      parsed.itemType === "workspace_widget" &&
      typeof parsed.itemId === "string" &&
      typeof parsed.widgetType === "string" &&
      parsed.sourceKind === "palette" &&
      typeof parsed.sourceId === "string"
    ) {
      return {
        allowedDropTargets,
        entityKind: "workspace_widget",
        itemId: parsed.itemId,
        itemType: "workspace_widget",
        sourceId: parsed.sourceId,
        sourceKind: "palette",
        widgetType: parsed.widgetType,
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
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "tool" &&
      typeof parsed.sourceSlotId === "string" &&
      typeof parsed.sourceId === "string" &&
      parsed.sourceKind === "workbench" &&
      typeof parsed.toolId === "string" &&
      typeof parsed.toolType === "string" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        entityKind: "tool",
        sourceId: parsed.sourceId,
        sourceKind: "workbench",
        sourceSlotId: parsed.sourceSlotId,
        toolId: parsed.toolId,
        toolType: parsed.toolType,
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
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "tool" &&
      typeof parsed.rackSlotId === "string" &&
      typeof parsed.sourceId === "string" &&
      parsed.sourceKind === "rack" &&
      typeof parsed.toolId === "string" &&
      typeof parsed.toolType === "string" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        entityKind: "tool",
        rackSlotId: parsed.rackSlotId,
        sourceId: parsed.sourceId,
        sourceKind: "rack",
        toolId: parsed.toolId,
        toolType: parsed.toolType,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readTrashToolDragPayload(dataTransfer: DataTransfer): TrashToolDragPayload | null {
  const rawPayload =
    dataTransfer.getData(TRASH_TOOL_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<TrashToolDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "workspace_canvas" ||
          targetType === "rack_slot" ||
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "tool" &&
      typeof parsed.trashToolId === "string" &&
      typeof parsed.sourceId === "string" &&
      parsed.sourceKind === "trash" &&
      typeof parsed.toolId === "string" &&
      typeof parsed.toolType === "string" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        entityKind: "tool",
        sourceId: parsed.sourceId,
        sourceKind: "trash",
        trashToolId: parsed.trashToolId,
        toolId: parsed.toolId,
        toolType: parsed.toolType,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readWorkspaceWidgetDragPayload(
  dataTransfer: DataTransfer,
): WorkspaceWidgetDragPayload | null {
  const rawPayload =
    dataTransfer.getData(WORKSPACE_WIDGET_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<WorkspaceWidgetDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "workspace_canvas" ||
          targetType === "rack_slot" ||
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "workspace_widget" &&
      typeof parsed.widgetId === "string" &&
      typeof parsed.widgetType === "string" &&
      typeof parsed.sourceId === "string" &&
      parsed.sourceKind === "trash" &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        entityKind: "workspace_widget",
        sourceId: parsed.sourceId,
        sourceKind: "trash",
        widgetId: parsed.widgetId,
        widgetType: parsed.widgetType,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readProduceDragPayload(dataTransfer: DataTransfer): ProduceDragPayload | null {
  const rawPayload =
    dataTransfer.getData(PRODUCE_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<ProduceDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "workspace_canvas" ||
          targetType === "rack_slot" ||
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "produce" &&
      typeof parsed.produceLotId === "string" &&
      typeof parsed.produceType === "string" &&
      typeof parsed.sourceId === "string" &&
      (parsed.sourceKind === "basket" ||
        (parsed.sourceKind === "workbench" && typeof parsed.sourceSlotId === "string") ||
        (parsed.sourceKind === "trash" && typeof parsed.trashProduceLotId === "string")) &&
      allowedDropTargets.length > 0
    ) {
      return {
        allowedDropTargets,
        entityKind: "produce",
        produceLotId: parsed.produceLotId,
        produceType: parsed.produceType,
        sourceId: parsed.sourceId,
        sourceKind: parsed.sourceKind,
        ...(parsed.sourceKind === "workbench" ? { sourceSlotId: parsed.sourceSlotId } : {}),
        ...(parsed.sourceKind === "trash" ? { trashProduceLotId: parsed.trashProduceLotId } : {}),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readSampleLabelDragPayload(
  dataTransfer: DataTransfer,
): SampleLabelDragPayload | null {
  const rawPayload =
    dataTransfer.getData(SAMPLE_LABEL_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<SampleLabelDragPayload>;
    const allowedDropTargets =
      parsed.allowedDropTargets?.filter(
        (targetType): targetType is DropTargetType =>
          targetType === "workbench_slot" ||
          targetType === "trash_bin" ||
          targetType === "grinder_widget",
      ) ?? [];

    if (
      parsed.entityKind === "sample_label" &&
      typeof parsed.sampleLabelId === "string" &&
      typeof parsed.sampleLabelText === "string" &&
      (parsed.sourceKind === "workbench" || parsed.sourceKind === "trash") &&
      typeof parsed.sourceId === "string" &&
      allowedDropTargets.length > 0 &&
      ((parsed.sourceKind === "workbench" && typeof parsed.sourceSlotId === "string") ||
        (parsed.sourceKind === "trash" && typeof parsed.trashSampleLabelId === "string"))
    ) {
      return {
        allowedDropTargets,
        entityKind: "sample_label",
        sampleLabelId: parsed.sampleLabelId,
        sampleLabelText: parsed.sampleLabelText,
        sourceId: parsed.sourceId,
        sourceKind: parsed.sourceKind,
        ...(parsed.sourceKind === "workbench" ? { sourceSlotId: parsed.sourceSlotId } : {}),
        ...(parsed.sourceKind === "trash"
          ? { trashSampleLabelId: parsed.trashSampleLabelId }
          : {}),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function toDragDescriptor(
  payload:
    | ToolbarDragPayload
    | BenchToolDragPayload
    | RackToolDragPayload
    | TrashToolDragPayload
    | WorkspaceWidgetDragPayload
    | ProduceDragPayload
    | SampleLabelDragPayload,
): DragDescriptor {
  if ("produceLotId" in payload) {
    return {
      allowedDropTargets: payload.allowedDropTargets,
      entityKind: "produce",
      produceLotId: payload.produceLotId,
      produceType: payload.produceType,
      sourceId: payload.sourceId,
      sourceKind: payload.sourceKind,
      ...(payload.sourceSlotId ? { sourceSlotId: payload.sourceSlotId } : {}),
      ...(payload.trashProduceLotId ? { trashProduceLotId: payload.trashProduceLotId } : {}),
    };
  }

  if ("itemType" in payload) {
    if (payload.itemType === "tool") {
      return {
        allowedDropTargets: payload.allowedDropTargets,
        entityKind: "tool",
        sourceId: payload.sourceId,
        sourceKind: payload.sourceKind,
        toolId: payload.itemId,
        toolType: payload.toolType,
      };
    }

    if (payload.itemType === "liquid") {
      return {
        allowedDropTargets: payload.allowedDropTargets,
        entityKind: "liquid",
        liquidId: payload.itemId,
        liquidType: payload.liquidType,
        sourceId: payload.sourceId,
        sourceKind: payload.sourceKind,
      };
    }

    if (payload.itemType === "sample_label") {
      return {
        allowedDropTargets: payload.allowedDropTargets,
        entityKind: "sample_label",
        sampleLabelId: payload.itemId,
        sourceId: payload.sourceId,
        sourceKind: payload.sourceKind,
      };
    }

    return {
      allowedDropTargets: payload.allowedDropTargets,
      entityKind: "workspace_widget",
      sourceId: payload.sourceId,
      sourceKind: payload.sourceKind,
      widgetId: payload.itemId,
      widgetType: payload.widgetType,
    };
  }

  if ("sampleLabelId" in payload) {
    return {
      allowedDropTargets: payload.allowedDropTargets,
      entityKind: "sample_label",
      sampleLabelId: payload.sampleLabelId,
      sampleLabelText: payload.sampleLabelText,
      sourceId: payload.sourceId,
      sourceKind: payload.sourceKind,
      ...(payload.sourceSlotId ? { sourceSlotId: payload.sourceSlotId } : {}),
      ...(payload.trashSampleLabelId
        ? { trashSampleLabelId: payload.trashSampleLabelId }
        : {}),
    };
  }

  if ("sourceSlotId" in payload || "rackSlotId" in payload || "trashToolId" in payload) {
    return {
      allowedDropTargets: payload.allowedDropTargets,
      entityKind: "tool",
      sourceId: payload.sourceId,
      sourceKind: payload.sourceKind,
      toolId: payload.toolId,
      toolType: payload.toolType,
    };
  }

  return {
    allowedDropTargets: payload.allowedDropTargets,
    entityKind: "workspace_widget",
    sourceId: payload.sourceId,
    sourceKind: payload.sourceKind,
    widgetId: payload.widgetId,
    widgetType: payload.widgetType,
  };
}

export function readDragDescriptor(dataTransfer: DataTransfer): DragDescriptor | null {
  const toolbarPayload = readToolbarDragPayload(dataTransfer);
  if (toolbarPayload) {
    return toDragDescriptor(toolbarPayload);
  }

  const benchToolPayload = readBenchToolDragPayload(dataTransfer);
  if (benchToolPayload) {
    return toDragDescriptor(benchToolPayload);
  }

  const rackToolPayload = readRackToolDragPayload(dataTransfer);
  if (rackToolPayload) {
    return toDragDescriptor(rackToolPayload);
  }

  const trashToolPayload = readTrashToolDragPayload(dataTransfer);
  if (trashToolPayload) {
    return toDragDescriptor(trashToolPayload);
  }

  const workspaceWidgetPayload = readWorkspaceWidgetDragPayload(dataTransfer);
  if (workspaceWidgetPayload) {
    return toDragDescriptor(workspaceWidgetPayload);
  }

  const producePayload = readProduceDragPayload(dataTransfer);
  if (producePayload) {
    return toDragDescriptor(producePayload);
  }

  const sampleLabelPayload = readSampleLabelDragPayload(dataTransfer);
  if (sampleLabelPayload) {
    return toDragDescriptor(sampleLabelPayload);
  }

  return null;
}
