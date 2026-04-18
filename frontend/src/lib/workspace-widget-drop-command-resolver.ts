import { readToolbarDragPayload, readWorkspaceWidgetDragPayload } from "@/lib/workbench-dnd";
import {
  getWorkspaceEquipmentWidgetId,
  isWorkspaceEquipmentWidgetId,
  type WorkspaceEquipmentWidgetId,
} from "@/lib/workspace-widget-ids";

export type WorkspaceWidgetCanvasDrop =
  | { kind: "add_workspace_widget"; widgetId: WorkspaceEquipmentWidgetId };

export function resolveWorkspaceWidgetCanvasDrop(
  dataTransfer: DataTransfer,
): WorkspaceWidgetCanvasDrop | null {
  const toolbarPayload = readToolbarDragPayload(dataTransfer);
  if (toolbarPayload?.itemType === "workspace_widget") {
    const widgetId = getWorkspaceEquipmentWidgetId(toolbarPayload.itemId);
    if (widgetId) {
      return { kind: "add_workspace_widget", widgetId };
    }
  }

  const workspaceWidgetPayload = readWorkspaceWidgetDragPayload(dataTransfer);
  if (
    workspaceWidgetPayload &&
    isWorkspaceEquipmentWidgetId(workspaceWidgetPayload.widgetId)
  ) {
    return {
      kind: "add_workspace_widget",
      widgetId: workspaceWidgetPayload.widgetId,
    };
  }

  return null;
}
