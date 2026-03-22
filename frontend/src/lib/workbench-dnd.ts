import type { ToolbarDragPayload } from "@/types/workbench";

export const WORKBENCH_DRAG_MIME = "application/x-betalab-workbench-item";
export const WORKBENCH_TARGET_DRAG_MIME = "application/x-betalab-workbench-target-item";
export const WORKSPACE_WIDGET_DRAG_MIME = "application/x-betalab-workspace-widget-item";

export function writeToolbarDragPayload(dataTransfer: DataTransfer, payload: ToolbarDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(WORKBENCH_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  if (payload.itemType === "workspace_widget") {
    dataTransfer.setData(WORKSPACE_WIDGET_DRAG_MIME, payload.itemId);
  } else {
    dataTransfer.setData(WORKBENCH_TARGET_DRAG_MIME, payload.itemId);
  }
  dataTransfer.effectAllowed = "copy";
}

function hasDragMime(dataTransfer: DataTransfer, mime: string) {
  return Array.from(dataTransfer.types ?? []).includes(mime);
}

export function hasWorkbenchTargetDragPayload(dataTransfer: DataTransfer) {
  return hasDragMime(dataTransfer, WORKBENCH_TARGET_DRAG_MIME);
}

export function hasWorkspaceWidgetDragPayload(dataTransfer: DataTransfer) {
  return hasDragMime(dataTransfer, WORKSPACE_WIDGET_DRAG_MIME);
}

export function readToolbarDragPayload(dataTransfer: DataTransfer): ToolbarDragPayload | null {
  const rawPayload =
    dataTransfer.getData(WORKBENCH_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<ToolbarDragPayload>;

    if (
      (
        parsed.itemType === "tool" ||
        parsed.itemType === "liquid" ||
        parsed.itemType === "workspace_widget"
      ) &&
      typeof parsed.itemId === "string"
    ) {
      return {
        itemId: parsed.itemId,
        itemType: parsed.itemType,
      };
    }
  } catch {
    return null;
  }

  return null;
}
