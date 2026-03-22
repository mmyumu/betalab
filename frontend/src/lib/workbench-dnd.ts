import type { ToolbarDragPayload } from "@/types/workbench";

export const WORKBENCH_DRAG_MIME = "application/x-betalab-workbench-item";

export function writeToolbarDragPayload(dataTransfer: DataTransfer, payload: ToolbarDragPayload) {
  const serialized = JSON.stringify(payload);

  dataTransfer.setData(WORKBENCH_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", serialized);
  dataTransfer.effectAllowed = "copy";
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
