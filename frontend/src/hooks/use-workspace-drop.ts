import type { DragEvent, RefObject } from "react";

import { inferAnchoredLayout, type WidgetLayout } from "@/hooks/use-workspace-layout";
import {
  hasCompatibleDropTarget,
  readToolbarDragPayload,
  readWorkspaceWidgetDragPayload,
} from "@/lib/workbench-dnd";
import {
  getWorkspaceEquipmentWidgetId,
  isWorkspaceEquipmentWidgetId,
  type WorkspaceEquipmentWidgetId,
} from "@/lib/workspace-widget-ids";

type WorkspaceDropExperimentApi = {
  addWorkspaceWidget: (payload: {
    widget_id: string;
    anchor: string;
    offset_x: number;
    offset_y: number;
  }) => void;
};

type UseWorkspaceDropOptions = {
  clearDropTargets: () => void;
  dndDisabledByAction: boolean;
  experimentApi: WorkspaceDropExperimentApi;
  widgetHeights: Record<string, number>;
  widgetLayout: Record<string, WidgetLayout>;
  workspaceRef: RefObject<HTMLDivElement | null>;
};

export type WorkspaceDropHandlers = {
  handleWorkspaceDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleWorkspaceDrop: (event: DragEvent<HTMLDivElement>) => void;
};

export function useWorkspaceDrop({
  clearDropTargets,
  dndDisabledByAction,
  experimentApi,
  widgetHeights,
  widgetLayout,
  workspaceRef,
}: UseWorkspaceDropOptions): WorkspaceDropHandlers {
  const moveEquipmentWidgetIntoWorkspace = (
    widgetId: WorkspaceEquipmentWidgetId,
    clientX: number,
    clientY: number,
  ) => {
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const nextLayout = widgetLayout[widgetId];
    const widgetHeight = widgetHeights[widgetId] ?? nextLayout.fallbackHeight;
    const workspaceWidth = workspaceRect?.width ?? 0;
    const workspaceHeightValue = workspaceRect?.height ?? 0;
    const maxX =
      workspaceWidth > 0
        ? Math.max(workspaceWidth - nextLayout.width, 0)
        : Number.POSITIVE_INFINITY;
    const maxY =
      workspaceHeightValue > 0
        ? Math.max(workspaceHeightValue - widgetHeight, 0)
        : Number.POSITIVE_INFINITY;
    const safeClientX = Number.isFinite(clientX)
      ? clientX
      : (workspaceRect?.left ?? 0) + nextLayout.x + nextLayout.width / 2;
    const safeClientY = Number.isFinite(clientY)
      ? clientY
      : (workspaceRect?.top ?? 0) + nextLayout.y + 32;
    const unclampedX = safeClientX - (workspaceRect?.left ?? 0) - nextLayout.width / 2;
    const unclampedY = safeClientY - (workspaceRect?.top ?? 0) - 32;
    const nextX = Math.min(Math.max(unclampedX, 0), maxX);
    const nextY = Math.min(Math.max(unclampedY, 0), maxY);
    const nextAnchoredLayout = inferAnchoredLayout(
      { x: nextX, y: nextY },
      { height: widgetHeight, width: nextLayout.width },
      workspaceRect ? { height: workspaceRect.height, width: workspaceRect.width } : null,
    );

    void experimentApi.addWorkspaceWidget({
      widget_id: widgetId,
      anchor: nextAnchoredLayout.anchor,
      offset_x: nextAnchoredLayout.offsetX,
      offset_y: nextAnchoredLayout.offsetY,
    });
  };

  const handleWorkspaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-workspace-drop-exclude='true']")) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "workspace_canvas")) {
      event.preventDefault();
    }
  };

  const handleWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-workspace-drop-exclude='true']")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (toolbarPayload?.itemType === "workspace_widget") {
      const widgetId = getWorkspaceEquipmentWidgetId(toolbarPayload.itemId);
      if (!widgetId) {
        return;
      }
      event.preventDefault();
      moveEquipmentWidgetIntoWorkspace(widgetId, event.clientX, event.clientY);
      clearDropTargets();
      event.stopPropagation();
      return;
    }

    const workspaceWidgetPayload = readWorkspaceWidgetDragPayload(event.dataTransfer);
    if (!workspaceWidgetPayload || !isWorkspaceEquipmentWidgetId(workspaceWidgetPayload.widgetId)) {
      return;
    }
    event.preventDefault();
    moveEquipmentWidgetIntoWorkspace(workspaceWidgetPayload.widgetId, event.clientX, event.clientY);
    clearDropTargets();
    event.stopPropagation();
  };

  return { handleWorkspaceDragOver, handleWorkspaceDrop };
}
