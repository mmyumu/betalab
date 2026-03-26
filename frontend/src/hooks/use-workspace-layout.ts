"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";

type WidgetLayout = {
  fallbackHeight: number;
  width: number;
  x: number;
  y: number;
};

type UseWorkspaceLayoutOptions<WidgetId extends string> = {
  getIsWidgetTrashable: (widgetId: WidgetId) => boolean;
  initialLayout: Record<WidgetId, WidgetLayout>;
  initialOrder: WidgetId[];
  onDiscardWidget: (widgetId: WidgetId) => void;
  onMoveWidget: (widgetId: WidgetId, nextPosition: { x: number; y: number }) => void;
  onWidgetDragStateChange?: (widgetId: WidgetId | null, isTrashDropActive: boolean) => void;
  presentWidgetIds: WidgetId[];
  syncKey: string | null;
  toolbarWidgetId: WidgetId;
  trashWidgetId: WidgetId;
  widgets: Array<{ id: WidgetId; x: number; y: number }>;
  workspaceRef: RefObject<HTMLDivElement | null>;
};

function isPointInsideWidget<WidgetId extends string>(
  widgetId: WidgetId,
  clientX: number,
  clientY: number,
  workspaceElement: HTMLDivElement | null,
  layout: Record<WidgetId, WidgetLayout>,
  heights: Record<WidgetId, number>,
) {
  if (!workspaceElement) {
    return false;
  }

  const workspaceRect = workspaceElement.getBoundingClientRect();
  const widgetPosition = layout[widgetId];
  const widgetHeight = heights[widgetId] ?? widgetPosition.fallbackHeight;
  const left = workspaceRect.left + widgetPosition.x;
  const top = workspaceRect.top + widgetPosition.y;

  return (
    clientX >= left &&
    clientX <= left + widgetPosition.width &&
    clientY >= top &&
    clientY <= top + widgetHeight
  );
}

export function useWorkspaceLayout<WidgetId extends string>({
  getIsWidgetTrashable,
  initialLayout,
  initialOrder,
  onDiscardWidget,
  onMoveWidget,
  onWidgetDragStateChange,
  presentWidgetIds,
  syncKey,
  toolbarWidgetId,
  trashWidgetId,
  widgets,
  workspaceRef,
}: UseWorkspaceLayoutOptions<WidgetId>) {
  const [activeWidgetId, setActiveWidgetId] = useState<WidgetId | null>(null);
  const [widgetLayout, setWidgetLayout] =
    useState<Record<WidgetId, WidgetLayout>>(initialLayout);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([...initialOrder]);
  const [widgetHeights, setWidgetHeights] = useState<Record<WidgetId, number>>(
    Object.fromEntries(
      Object.entries(initialLayout).map(([widgetId, layout]) => [
        widgetId,
        layout.fallbackHeight,
      ]),
    ) as Record<WidgetId, number>,
  );
  const widgetLayoutRef = useRef(widgetLayout);
  const widgetHeightsRef = useRef(widgetHeights);
  const dragStateRef = useRef<{
    pointerOffsetX: number;
    pointerOffsetY: number;
    widgetId: WidgetId;
  } | null>(null);

  useEffect(() => {
    widgetLayoutRef.current = widgetLayout;
  }, [widgetLayout]);

  useEffect(() => {
    widgetHeightsRef.current = widgetHeights;
  }, [widgetHeights]);

  useEffect(() => {
    if (!syncKey) {
      return;
    }

    const nextLayout = { ...initialLayout };
    widgets.forEach((widget) => {
      nextLayout[widget.id] = {
        ...initialLayout[widget.id],
        x: widget.x,
        y: widget.y,
      };
    });

    setWidgetLayout(nextLayout);
    setWidgetOrder([...initialOrder]);
  }, [syncKey]);

  const handleWidgetHeightChange = (widgetId: string, height: number) => {
    if (!(widgetId in initialLayout) || height <= 0) {
      return;
    }

    const typedWidgetId = widgetId as WidgetId;
    setWidgetHeights((current) => {
      if (current[typedWidgetId] === height) {
        return current;
      }

      return {
        ...current,
        [typedWidgetId]: height,
      };
    });
  };

  const handleWidgetDragStart = (
    widgetId: string,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!(widgetId in initialLayout)) {
      return;
    }
    if (typeof event.button === "number" && event.button > 0) {
      return;
    }

    const typedWidgetId = widgetId as WidgetId;
    event.preventDefault();

    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const workspaceLeft = workspaceRect?.left ?? 0;
    const workspaceTop = workspaceRect?.top ?? 0;
    const currentPosition = widgetLayoutRef.current[typedWidgetId];

    dragStateRef.current = {
      widgetId: typedWidgetId,
      pointerOffsetX: event.clientX - workspaceLeft - currentPosition.x,
      pointerOffsetY: event.clientY - workspaceTop - currentPosition.y,
    };
    setActiveWidgetId(typedWidgetId);
    setWidgetOrder((current) => [
      ...current.filter((id) => id !== typedWidgetId),
      typedWidgetId,
    ]);
    onWidgetDragStateChange?.(typedWidgetId, getIsWidgetTrashable(typedWidgetId));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dragState = dragStateRef.current;
      const workspaceNode = workspaceRef.current;
      if (!dragState || !workspaceNode) {
        return;
      }
      if (!Number.isFinite(moveEvent.clientX) || !Number.isFinite(moveEvent.clientY)) {
        return;
      }

      const nextWorkspaceRect = workspaceNode.getBoundingClientRect();
      const nextLayout = widgetLayoutRef.current[dragState.widgetId];
      const widgetHeight =
        widgetHeightsRef.current[dragState.widgetId] ?? nextLayout.fallbackHeight;

      const unclampedX = moveEvent.clientX - nextWorkspaceRect.left - dragState.pointerOffsetX;
      const unclampedY = moveEvent.clientY - nextWorkspaceRect.top - dragState.pointerOffsetY;

      const maxX =
        nextWorkspaceRect.width > 0
          ? Math.max(nextWorkspaceRect.width - nextLayout.width, 0)
          : Number.POSITIVE_INFINITY;
      const maxY =
        nextWorkspaceRect.height > 0
          ? Math.max(nextWorkspaceRect.height - widgetHeight, 0)
          : Number.POSITIVE_INFINITY;

      setWidgetLayout((current) => ({
        ...current,
        [dragState.widgetId]: {
          ...current[dragState.widgetId],
          x: Math.min(Math.max(unclampedX, 0), maxX),
          y: Math.min(Math.max(unclampedY, 0), maxY),
        },
      }));
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const dragState = dragStateRef.current;
      const draggedWidgetId = dragState?.widgetId;
      const shouldTrashWidget =
        draggedWidgetId &&
        getIsWidgetTrashable(draggedWidgetId) &&
        isPointInsideWidget(
          trashWidgetId,
          upEvent.clientX,
          upEvent.clientY,
          workspaceRef.current,
          widgetLayoutRef.current,
          widgetHeightsRef.current,
        );

      dragStateRef.current = null;
      setActiveWidgetId(null);
      onWidgetDragStateChange?.(null, false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (draggedWidgetId && draggedWidgetId !== toolbarWidgetId) {
        const nextLayout = widgetLayoutRef.current[draggedWidgetId];

        if (shouldTrashWidget) {
          onDiscardWidget(draggedWidgetId);
          return;
        }

        onMoveWidget(draggedWidgetId, {
          x: nextLayout.x,
          y: nextLayout.y,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const workspaceHeight = Math.max(
    ...presentWidgetIds.map((widgetId) => {
      const layout = widgetLayout[widgetId];
      const measuredHeight = widgetHeights[widgetId] ?? layout.fallbackHeight;
      return layout.y + measuredHeight + 48;
    }),
    1100,
  );

  return {
    activeWidgetId,
    handleWidgetDragStart,
    handleWidgetHeightChange,
    widgetHeights,
    widgetLayout,
    widgetOrder,
    workspaceHeight,
  };
}

export type { WidgetLayout };
