"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent, MouseEvent as ReactMouseEvent } from "react";

import { FloatingWidget } from "@/components/floating-widget";
import { AppleIllustration } from "@/components/illustrations/apple-illustration";
import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { ProduceBasketIllustration } from "@/components/illustrations/produce-basket-illustration";
import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";
import { createExperiment, sendExperimentCommand } from "@/lib/api";
import { dragAffordanceClassName } from "@/lib/drag-affordance";
import {
  createToolbarDragPayload,
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readRackToolDragPayload,
  readTrashToolDragPayload,
  readToolbarDragPayload,
  readWorkspaceWidgetDragPayload,
  toDragDescriptor,
  writeBenchToolDragPayload,
  writeProduceDragPayload,
  writeRackToolDragPayload,
  writeTrashToolDragPayload,
  writeWorkspaceWidgetDragPayload,
} from "@/lib/workbench-dnd";
import { getToolDropTargets } from "@/lib/tool-drop-targets";
import {
  pesticideToolCatalog,
  pesticideWorkflowCategories,
} from "@/lib/pesticide-workflow-catalog";
import type { Experiment } from "@/types/experiment";
import type {
  BenchSlot,
  BenchToolDragPayload,
  BenchToolInstance,
  DragDescriptor,
  DropTargetType,
  ExperimentWorkspaceWidget,
  ProduceDragPayload,
  RackSlot,
  RackToolDragPayload,
  TrashToolDragPayload,
  TrashToolEntry,
  ToolbarDragPayload,
} from "@/types/workbench";

type WorkbenchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { experiment: Experiment; status: "ready" };

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load pesticide workbench";
const widgetIds = ["toolbar", "workbench", "trash", "rack", "instrument", "basket"] as const;
const workspaceEquipmentItemToWidgetId = {
  autosampler_rack_widget: "rack",
  lc_msms_instrument_widget: "instrument",
  produce_basket_widget: "basket",
} as const;
const widgetTrashability: Record<WidgetId, boolean> = {
  toolbar: false,
  workbench: false,
  trash: false,
  rack: true,
  instrument: true,
  basket: false,
};

type WidgetId = (typeof widgetIds)[number];
type WorkspaceEquipmentWidgetId = (typeof workspaceEquipmentItemToWidgetId)[keyof typeof workspaceEquipmentItemToWidgetId];

type WidgetLayout = {
  fallbackHeight: number;
  width: number;
  x: number;
  y: number;
};

const widgetFrameSpecs: Record<WidgetId, WidgetLayout> = {
  toolbar: { x: 0, y: 0, width: 202, fallbackHeight: 720 },
  workbench: { x: 234, y: 0, width: 1228, fallbackHeight: 860 },
  trash: { x: 1530, y: 0, width: 164, fallbackHeight: 214 },
  rack: { x: 234, y: 886, width: 548, fallbackHeight: 392 },
  instrument: { x: 812, y: 886, width: 650, fallbackHeight: 392 },
  basket: { x: 1460, y: 248, width: 320, fallbackHeight: 320 },
};
const rackSlotCount = 12;
const rackIllustrationViewBox = { height: 320, width: 560 };
const rackIllustrationBase = { x: 98, y: 106 };
const rackIllustrationGap = { x: 70, y: 84 };
const rackIllustrationColumns = Math.min(6, Math.max(rackSlotCount, 1));

function getLatestStatusMessage(experiment: Experiment) {
  return experiment.audit_log.at(-1) ?? defaultStatusMessage;
}

function isWidgetId(value: string): value is WidgetId {
  return widgetIds.includes(value as WidgetId);
}

function isWorkspaceEquipmentWidgetId(value: WidgetId): value is WorkspaceEquipmentWidgetId {
  return value === "rack" || value === "instrument" || value === "basket";
}

function getWorkspaceEquipmentWidgetId(itemId: string): WorkspaceEquipmentWidgetId | null {
  return workspaceEquipmentItemToWidgetId[itemId as keyof typeof workspaceEquipmentItemToWidgetId] ?? null;
}

function getRackIllustrationSlotPosition(slotIndex: number) {
  const column = slotIndex % rackIllustrationColumns;
  const row = Math.floor(slotIndex / rackIllustrationColumns);

  return {
    left: `${(rackIllustrationBase.x + column * rackIllustrationGap.x) / rackIllustrationViewBox.width * 100}%`,
    top: `${(rackIllustrationBase.y + row * rackIllustrationGap.y) / rackIllustrationViewBox.height * 100}%`,
  };
}

function isPointInsideWidget(
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

function buildWidgetLayout(workspaceWidgets: ExperimentWorkspaceWidget[]): Record<WidgetId, WidgetLayout> {
  const nextLayout: Record<WidgetId, WidgetLayout> = {
    toolbar: widgetFrameSpecs.toolbar,
    workbench: widgetFrameSpecs.workbench,
    trash: widgetFrameSpecs.trash,
    rack: widgetFrameSpecs.rack,
    instrument: widgetFrameSpecs.instrument,
    basket: widgetFrameSpecs.basket,
  };

  workspaceWidgets.forEach((widget) => {
    nextLayout[widget.id] = {
      ...widgetFrameSpecs[widget.id],
      x: widget.x,
      y: widget.y,
    };
  });

  return nextLayout;
}

export function PesticideWorkbench() {
  const [state, setState] = useState<WorkbenchState>({ status: "loading" });
  const [statusMessage, setStatusMessage] = useState(defaultStatusMessage);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [activeDropTargets, setActiveDropTargets] = useState<DropTargetType[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<DragDescriptor | null>(null);
  const [activeWidgetId, setActiveWidgetId] = useState<WidgetId | null>(null);
  const [widgetLayout, setWidgetLayout] =
    useState<Record<WidgetId, WidgetLayout>>(widgetFrameSpecs);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([...widgetIds]);
  const [widgetHeights, setWidgetHeights] = useState<Record<WidgetId, number>>({
    toolbar: widgetFrameSpecs.toolbar.fallbackHeight,
    workbench: widgetFrameSpecs.workbench.fallbackHeight,
    trash: widgetFrameSpecs.trash.fallbackHeight,
    rack: widgetFrameSpecs.rack.fallbackHeight,
    instrument: widgetFrameSpecs.instrument.fallbackHeight,
    basket: widgetFrameSpecs.basket.fallbackHeight,
  });
  const hasLoadedInitialExperiment = useRef(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
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
    if (state.status !== "ready") {
      return;
    }

    setWidgetLayout(buildWidgetLayout(state.experiment.workspace.widgets));
    setWidgetOrder([...widgetIds]);
  }, [
    state.status === "ready" ? state.experiment.id : null,
    state.status === "ready" ? JSON.stringify(state.experiment.workspace.widgets) : null,
  ]);

  const loadExperiment = async () => {
    setState({ status: "loading" });

    try {
      const experiment = await createExperiment();
      setState({ status: "ready", experiment });
      setStatusMessage(getLatestStatusMessage(experiment));
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : defaultErrorMessage,
      });
    }
  };

  useEffect(() => {
    if (hasLoadedInitialExperiment.current) {
      return;
    }

    hasLoadedInitialExperiment.current = true;
    void loadExperiment();
  }, []);

  const sendWorkbenchCommand = async (
    type: string,
    payload: Record<string, unknown>,
    options?: { onSuccess?: (updatedExperiment: Experiment) => void },
  ) => {
    if (state.status !== "ready" || isCommandPending) {
      return;
    }

    setIsCommandPending(true);

    try {
      let updatedExperiment: Experiment;

      try {
        updatedExperiment = await sendExperimentCommand(state.experiment.id, type, payload);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "Experiment not found") {
          throw error;
        }

        const recreatedExperiment = await createExperiment();
        updatedExperiment = await sendExperimentCommand(recreatedExperiment.id, type, payload);
      }

      setState({ status: "ready", experiment: updatedExperiment });
      setStatusMessage(getLatestStatusMessage(updatedExperiment));
      options?.onSuccess?.(updatedExperiment);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Workbench command failed");
    } finally {
      setIsCommandPending(false);
    }
  };

  const showDropTargets = (dropTargets: readonly DropTargetType[]) => {
    setActiveDropTargets([...dropTargets]);
  };

  const clearDropTargets = () => {
    setActiveDropTargets([]);
    setActiveDragItem(null);
  };

  const isDropTargetHighlighted = (targetType: DropTargetType) => {
    return activeDropTargets.includes(targetType);
  };

  const handleToolbarItemDrop = (slotId: string, payload: ToolbarDragPayload) => {
    if (payload.itemType === "tool") {
      clearDropTargets();
      void sendWorkbenchCommand("place_tool_on_workbench", {
        slot_id: slotId,
        tool_id: payload.itemId,
      });
      return;
    }

    if (payload.itemType !== "liquid") {
      return;
    }

    clearDropTargets();
    void sendWorkbenchCommand("add_liquid_to_workbench_tool", {
      slot_id: slotId,
      liquid_id: payload.itemId,
    });
  };

  const handleLiquidVolumeChange = (slotId: string, liquidId: string, volumeMl: number) => {
    void sendWorkbenchCommand("update_workbench_liquid_volume", {
      slot_id: slotId,
      liquid_entry_id: liquidId,
      volume_ml: volumeMl,
    });
  };

  const handleRemoveLiquid = (slotId: string, liquidId: string) => {
    void sendWorkbenchCommand("remove_liquid_from_workbench_tool", {
      slot_id: slotId,
      liquid_entry_id: liquidId,
    });
  };

  const handleAddWorkbenchSlot = () => {
    void sendWorkbenchCommand("add_workbench_slot", {});
  };

  const handleRemoveWorkbenchSlot = (slotId: string) => {
    void sendWorkbenchCommand("remove_workbench_slot", {
      slot_id: slotId,
    });
  };

  const getBenchToolAllowedDropTargets = (tool: BenchToolInstance) => {
    return getToolDropTargets(tool.toolType, { includeTrash: tool.trashable });
  };

  const canDragBenchTool = (_slotId: string, tool: BenchToolInstance) => {
    return getBenchToolAllowedDropTargets(tool).length > 0;
  };

  const handleBenchToolDragStart = (
    slotId: string,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => {
    if (!canDragBenchTool(slotId, tool)) {
      return;
    }

    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: [...getBenchToolAllowedDropTargets(tool)],
      entityKind: "tool",
      sourceId: slotId,
      sourceKind: "workbench",
      sourceSlotId: slotId,
      toolId: tool.toolId,
      toolType: tool.toolType,
      trashable: tool.trashable,
    });
    const descriptor = {
      allowedDropTargets: getBenchToolAllowedDropTargets(tool),
      entityKind: "tool" as const,
      sourceId: slotId,
      sourceKind: "workbench" as const,
      toolId: tool.toolId,
      toolType: tool.toolType,
      trashable: tool.trashable,
    };
    showDropTargets(descriptor.allowedDropTargets);
    setActiveDragItem(descriptor);
  };

  const handleBenchToolDrop = (
    targetSlotId: string,
    payload: BenchToolDragPayload | RackToolDragPayload | TrashToolDragPayload,
  ) => {
    if ("sourceSlotId" in payload) {
      if (payload.sourceSlotId === targetSlotId) {
        return;
      }

      void sendWorkbenchCommand("move_tool_between_workbench_slots", {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    if ("trashToolId" in payload) {
      void sendWorkbenchCommand("restore_trashed_tool_to_workbench_slot", {
        target_slot_id: targetSlotId,
        trash_tool_id: payload.trashToolId,
      });
      clearDropTargets();
      return;
    }

    void sendWorkbenchCommand("remove_rack_tool_to_workbench_slot", {
      rack_slot_id: payload.rackSlotId,
      target_slot_id: targetSlotId,
    });
    clearDropTargets();
  };

  const handleProduceDrop = (targetSlotId: string, payload: ProduceDragPayload) => {
    void sendWorkbenchCommand("add_produce_to_workbench_tool", {
      slot_id: targetSlotId,
      produce_item_id: payload.produceItemId,
    });
    clearDropTargets();
  };

  const handleWidgetHeightChange = (widgetId: string, height: number) => {
    if (!isWidgetId(widgetId)) {
      return;
    }
    if (height <= 0) {
      return;
    }

    setWidgetHeights((current) => {
      if (current[widgetId] === height) {
        return current;
      }

      return {
        ...current,
        [widgetId]: height,
      };
    });
  };

  const handleWidgetDragStart = (
    widgetId: string,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!isWidgetId(widgetId)) {
      return;
    }
    if (typeof event.button === "number" && event.button > 0) {
      return;
    }

    event.preventDefault();

    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const workspaceLeft = workspaceRect?.left ?? 0;
    const workspaceTop = workspaceRect?.top ?? 0;
    const currentPosition = widgetLayoutRef.current[widgetId];

    dragStateRef.current = {
      widgetId,
      pointerOffsetX: event.clientX - workspaceLeft - currentPosition.x,
      pointerOffsetY: event.clientY - workspaceTop - currentPosition.y,
    };
    setActiveDropTargets(widgetTrashability[widgetId] ? ["trash_bin"] : []);
    setActiveWidgetId(widgetId);
    setWidgetOrder((current) => [...current.filter((id) => id !== widgetId), widgetId]);

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
        widgetTrashability[draggedWidgetId] &&
        isPointInsideWidget(
          "trash",
          upEvent.clientX,
          upEvent.clientY,
          workspaceRef.current,
          widgetLayoutRef.current,
          widgetHeightsRef.current,
        );

      dragStateRef.current = null;
      clearDropTargets();
      setActiveWidgetId(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (draggedWidgetId && draggedWidgetId !== "toolbar") {
        const nextLayout = widgetLayoutRef.current[draggedWidgetId];

        if (shouldTrashWidget && widgetTrashability[draggedWidgetId]) {
          void sendWorkbenchCommand("discard_workspace_widget", {
            widget_id: draggedWidgetId,
          });
          return;
        }

        void sendWorkbenchCommand("move_workspace_widget", {
          widget_id: draggedWidgetId,
          x: nextLayout.x,
          y: nextLayout.y,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const liveWidgetIds: WidgetId[] =
    state.status === "ready"
      ? [
          "toolbar",
          ...state.experiment.workspace.widgets
            .filter((widget) => widget.isPresent)
            .map((widget) => widget.id),
        ]
      : ["toolbar"];

  const moveEquipmentWidgetIntoWorkspace = (
    widgetId: WorkspaceEquipmentWidgetId,
    clientX: number,
    clientY: number,
  ) => {
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const nextLayout = widgetLayoutRef.current[widgetId];
    const widgetHeight = widgetHeightsRef.current[widgetId] ?? nextLayout.fallbackHeight;
    const workspaceWidth = workspaceRect?.width ?? 0;
    const workspaceHeightValue = workspaceRect?.height ?? 0;
    const maxX =
      workspaceWidth > 0 ? Math.max(workspaceWidth - nextLayout.width, 0) : Number.POSITIVE_INFINITY;
    const maxY =
      workspaceHeightValue > 0 ? Math.max(workspaceHeightValue - widgetHeight, 0) : Number.POSITIVE_INFINITY;
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

    void sendWorkbenchCommand("add_workspace_widget", {
      widget_id: widgetId,
      x: nextX,
      y: nextY,
    });
    setWidgetOrder((current) => [...current.filter((id) => id !== widgetId), widgetId]);
  };

  const handleWorkspaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-workspace-drop-exclude='true']")) {
      return;
    }

    if (hasCompatibleDropTarget(event.dataTransfer, "workspace_canvas")) {
      event.preventDefault();
    }
  };

  const handleWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
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

  const handleTrashDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (hasCompatibleDropTarget(event.dataTransfer, "trash_bin")) {
      event.preventDefault();
    }
  };

  const handleTrashDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasCompatibleDropTarget(event.dataTransfer, "trash_bin")) {
      return;
    }

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload?.trashable) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_workbench_tool", {
        slot_id: benchToolPayload.sourceSlotId,
      });
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload?.trashable) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_rack_tool", {
        rack_slot_id: rackToolPayload.rackSlotId,
      });
    }
  };

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mx-auto max-w-[1800px] rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Laboratory workspace</h1>
          <p className="mt-4 text-sm text-slate-600">Creating pesticide workbench from backend...</p>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mx-auto max-w-[1800px] rounded-[2rem] border border-rose-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
            Backend connection error
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Laboratory workspace</h1>
          <p className="mt-4 text-sm text-slate-600">{state.message}</p>
          <button
            className="mt-6 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              void loadExperiment();
            }}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const workbench = state.experiment.workbench;
  const slots = workbench.slots;
  const rackSlots = state.experiment.rack.slots;
  const trashedTools = state.experiment.trash.tools;
  const trashedWidgets = state.experiment.workspace.widgets.filter(
    (widget) => widget.trashable && widget.isTrashed,
  );
  const rackLoadedCount = rackSlots.filter((slot) => slot.tool).length;
  const rackOccupiedSlots = rackSlots.flatMap((slot, index) =>
    slot.tool ? [index + 1] : [],
  );
  const rackOccupiedSlotLiquids = Object.fromEntries(
    rackSlots.flatMap((slot, index) =>
      slot.tool ? [[index + 1, slot.tool.liquids] as const] : [],
    ),
  );
  const instrumentStatus = rackLoadedCount > 0 ? ("ready" as const) : ("idle" as const);
  const workspaceHeight = Math.max(
    ...liveWidgetIds.map((widgetId) => {
      const layout = widgetLayout[widgetId];
      const measuredHeight = widgetHeights[widgetId] ?? layout.fallbackHeight;
      return layout.y + measuredHeight + 48;
    }),
    1100,
  );

  const handleRackSlotDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (hasCompatibleDropTarget(event.dataTransfer, "rack_slot")) {
      event.preventDefault();
    }
  };

  const handleRackSlotDrop = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    const targetRackSlot = rackSlots[slotIndex];
    if (!targetRackSlot) {
      return;
    }

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload?.toolType === "sample_vial") {
      event.preventDefault();
      event.stopPropagation();

      void sendWorkbenchCommand("place_workbench_tool_in_rack_slot", {
        source_slot_id: benchToolPayload.sourceSlotId,
        rack_slot_id: targetRackSlot.id,
      });
      clearDropTargets();
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    const toolbarTool =
      toolbarPayload?.itemType === "tool" ? pesticideToolCatalog[toolbarPayload.itemId] : null;
    if (toolbarTool?.toolType === "sample_vial") {
      event.preventDefault();
      event.stopPropagation();

      void sendWorkbenchCommand("place_tool_in_rack_slot", {
        rack_slot_id: targetRackSlot.id,
        tool_id: toolbarTool.id,
      });
      clearDropTargets();
      return;
    }

    const trashToolPayload = readTrashToolDragPayload(event.dataTransfer);
    if (trashToolPayload?.toolType === "sample_vial") {
      event.preventDefault();
      event.stopPropagation();

      void sendWorkbenchCommand("restore_trashed_tool_to_rack_slot", {
        rack_slot_id: targetRackSlot.id,
        trash_tool_id: trashToolPayload.trashToolId,
      });
      clearDropTargets();
    }
  };

  const handleRackToolDragStart = (
    rackSlot: RackSlot,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => {
    const allowedDropTargets: DropTargetType[] = tool.trashable
      ? ["workbench_slot", "trash_bin"]
      : ["workbench_slot"];

    writeRackToolDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "tool",
      rackSlotId: rackSlot.id,
      sourceId: rackSlot.id,
      sourceKind: "rack",
      toolId: tool.toolId,
      toolType: tool.toolType,
      trashable: tool.trashable,
    });
    const descriptor = {
      allowedDropTargets,
      entityKind: "tool" as const,
      sourceId: rackSlot.id,
      sourceKind: "rack" as const,
      toolId: tool.toolId,
      toolType: tool.toolType,
      trashable: tool.trashable,
    };
    showDropTargets(descriptor.allowedDropTargets);
    setActiveDragItem(descriptor);
  };

  const handleTrashToolDragStart = (
    trashTool: TrashToolEntry,
    dataTransfer: DataTransfer,
  ) => {
    const allowedDropTargets = getToolDropTargets(trashTool.tool.toolType);

    writeTrashToolDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "tool",
      sourceId: trashTool.id,
      sourceKind: "trash",
      toolId: trashTool.tool.toolId,
      toolType: trashTool.tool.toolType,
      trashable: trashTool.tool.trashable,
      trashToolId: trashTool.id,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "tool",
      sourceId: trashTool.id,
      sourceKind: "trash",
      toolId: trashTool.tool.toolId,
      toolType: trashTool.tool.toolType,
      trashable: trashTool.tool.trashable,
    });
  };

  const handleTrashedWidgetDragStart = (
    widget: ExperimentWorkspaceWidget,
    dataTransfer: DataTransfer,
  ) => {
    writeWorkspaceWidgetDragPayload(dataTransfer, {
      allowedDropTargets: ["workspace_canvas"],
      entityKind: "workspace_widget",
      sourceId: widget.id,
      sourceKind: "trash",
      trashable: widget.trashable,
      widgetId: widget.id,
      widgetType: widget.widgetType,
    });
    showDropTargets(["workspace_canvas"]);
    setActiveDragItem({
      allowedDropTargets: ["workspace_canvas"],
      entityKind: "workspace_widget",
      sourceId: widget.id,
      sourceKind: "trash",
      trashable: widget.trashable,
      widgetId: widget.id,
      widgetType: widget.widgetType,
    });
  };

  const handleBasketProduceDragStart = (
    produceItemId: string,
    produceType: "apple",
    dataTransfer: DataTransfer,
  ) => {
    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "produce",
      produceItemId,
      produceType,
      sourceId: produceItemId,
      sourceKind: "basket",
      trashable: false,
    });
    showDropTargets(["workbench_slot"]);
    setActiveDragItem({
      allowedDropTargets: ["workbench_slot"],
      entityKind: "produce",
      produceItemId,
      produceType,
      sourceId: produceItemId,
      sourceKind: "basket",
      trashable: false,
    });
  };

  const isBenchSlotHighlighted = (slot: BenchSlot) => {
    if (!activeDropTargets.includes("workbench_slot") || !activeDragItem) {
      return false;
    }

    if (activeDragItem.entityKind === "tool") {
      if (activeDragItem.sourceKind === "workbench") {
        return slot.tool === null && slot.id !== activeDragItem.sourceId;
      }

      if (
        activeDragItem.sourceKind === "palette" ||
        activeDragItem.sourceKind === "rack" ||
        activeDragItem.sourceKind === "trash"
      ) {
        return slot.tool === null;
      }
    }

    if (activeDragItem.entityKind === "liquid") {
      return slot.tool !== null && slot.tool.accepts_liquids;
    }

    if (activeDragItem.entityKind === "produce") {
      return slot.tool?.toolType === "sample_bag";
    }

    return false;
  };

  const isRackSlotHighlighted =
    activeDropTargets.includes("rack_slot") &&
    activeDragItem?.entityKind === "tool" &&
    activeDragItem.toolType === "sample_vial";

  const isTrashEmpty = trashedTools.length === 0 && trashedWidgets.length === 0;
  const basketProduceItems = state.experiment.workspace.produceItems;
  const handleCreateApple = () => {
    void sendWorkbenchCommand("create_produce_item", {
      produce_type: "apple",
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight xl:text-[3.25rem]">
            Laboratory workspace
          </h1>
        </header>

        <section className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,0.55))] p-4 shadow-[0_28px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-6">
          <div className="rounded-[1.6rem] border border-white/70 bg-white/65 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Custom layout
              </p>
              <p className="min-w-0 truncate text-sm text-slate-600">
                {isCommandPending ? `${statusMessage} Syncing...` : statusMessage}
              </p>
            </div>
          </div>

          <div
            className={`relative mt-4 overflow-hidden rounded-[2rem] border border-dashed bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),rgba(248,250,252,0.7)_40%,rgba(226,232,240,0.55)_100%)] transition-colors ${
              isDropTargetHighlighted("workspace_canvas")
                ? "border-sky-300/90 ring-2 ring-sky-200/80"
                : "border-slate-300/80"
            }`}
            data-drop-highlighted={isDropTargetHighlighted("workspace_canvas") ? "true" : "false"}
            data-testid="widget-workspace"
            onDragOverCapture={handleWorkspaceDragOver}
            onDropCapture={handleWorkspaceDrop}
            ref={workspaceRef}
            style={{ minHeight: workspaceHeight }}
          >
            <div
              className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px]"
              data-testid="workspace-drop-surface-grid"
            />
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_26%)]"
              data-testid="workspace-drop-surface-glow"
            />

            <FloatingWidget
              id="toolbar"
              isActive={activeWidgetId === "toolbar"}
              label="Toolbar Widget"
              onDragStart={handleWidgetDragStart}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.toolbar}
              zIndex={10 + widgetOrder.indexOf("toolbar")}
            >
              <ToolbarPanel
                categories={pesticideWorkflowCategories}
                onItemDragEnd={clearDropTargets}
                onItemDragStart={(item, allowedDropTargets) => {
                  const payload = createToolbarDragPayload(item);
                  showDropTargets(allowedDropTargets);
                  setActiveDragItem(toDragDescriptor(payload));
                }}
              />
            </FloatingWidget>

            <FloatingWidget
              id="trash"
              isActive={activeWidgetId === "trash"}
              label="Trash Widget"
              onDragStart={handleWidgetDragStart}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.trash}
              zIndex={10 + widgetOrder.indexOf("trash")}
            >
              <section className="relative overflow-visible">
                <div className="overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.95))] shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
                  <div
                    className={`${dragAffordanceClassName} border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur`}
                    data-widget-drag-handle="true"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                      Trash
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <div
                      className={`flex min-h-32 flex-col items-center justify-center rounded-[1.2rem] border border-dashed bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),rgba(226,232,240,0.92))] px-3 py-4 text-center transition-colors ${
                        isDropTargetHighlighted("trash_bin")
                          ? "border-rose-300 bg-rose-50/70 ring-2 ring-rose-200/80"
                          : "border-slate-300"
                      }`}
                      aria-haspopup="dialog"
                      data-drop-highlighted={isDropTargetHighlighted("trash_bin") ? "true" : "false"}
                      data-testid="trash-dropzone"
                      onClick={() => setIsTrashOpen(true)}
                      onDragOver={handleTrashDragOver}
                      onDrop={handleTrashDrop}
                    >
                      <svg
                        aria-hidden="true"
                        className="h-[4.5rem] w-[4.5rem] text-slate-500"
                        fill="none"
                        viewBox="0 0 96 96"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M28 30H68"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="6"
                        />
                        <path
                          d="M38 20H58"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="6"
                        />
                        <path
                          d="M34 30V67C34 73 37 76 43 76H53C59 76 62 73 62 67V30"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="6"
                        />
                        <path
                          d="M44 40V63"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="6"
                        />
                        <path
                          d="M52 40V63"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="6"
                        />
                        <path
                          d="M24 30H72"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                {isTrashOpen ? (
                  <div
                    className="absolute left-0 top-full z-[220] mt-3 w-[26rem] max-w-[min(26rem,calc(100vw-2rem))]"
                    data-testid="trash-dialog-overlay"
                  >
                    <div
                      className="w-full rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                      role="dialog"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <p className="text-sm text-slate-600">
                          Drag an item back to a valid target to restore it.
                        </p>
                        <button
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                          onClick={() => setIsTrashOpen(false)}
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                      <div className="max-h-[28rem] space-y-2 overflow-y-auto p-3">
                        {trashedTools.map((trashTool) => {
                          const totalVolume = trashTool.tool.liquids.reduce(
                            (sum, liquid) => sum + liquid.volume_ml,
                            0,
                          );

                          return (
                            <div
                              className={`${dragAffordanceClassName} flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2`}
                              data-testid={`trash-tool-${trashTool.id}`}
                              draggable
                              key={trashTool.id}
                              onDragEnd={clearDropTargets}
                              onDragStart={(event) => handleTrashToolDragStart(trashTool, event.dataTransfer)}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {trashTool.tool.label}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {trashTool.originLabel}
                                  {totalVolume > 0 ? ` • ${totalVolume} mL` : ""}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                                Tool
                              </span>
                            </div>
                          );
                        })}
                        {trashedWidgets.map((widget) => (
                          <div
                            className={`${dragAffordanceClassName} flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2`}
                            data-testid={`trash-widget-${widget.id}`}
                            draggable
                            key={widget.id}
                            onDragEnd={clearDropTargets}
                            onDragStart={(event) => handleTrashedWidgetDragStart(widget, event.dataTransfer)}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{widget.label}</p>
                              <p className="truncate text-xs text-slate-500">Workspace widget</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                              Widget
                            </span>
                          </div>
                        ))}
                        {isTrashEmpty ? (
                          <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            Trash is empty.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            </FloatingWidget>

            {liveWidgetIds
              .filter(isWorkspaceEquipmentWidgetId)
              .map((widgetId) => (
                <FloatingWidget
                  id={widgetId}
                  isActive={activeWidgetId === widgetId}
                  key={widgetId}
                  label={
                    widgetId === "rack"
                      ? "Rack Widget"
                      : widgetId === "instrument"
                        ? "Instrument Widget"
                        : "Produce Basket Widget"
                  }
                  onDragStart={handleWidgetDragStart}
                  onHeightChange={handleWidgetHeightChange}
                  position={widgetLayout[widgetId]}
                  zIndex={10 + widgetOrder.indexOf(widgetId)}
                >
                  {widgetId === "basket" ? (
                    <section className="relative overflow-visible">
                      <WorkspaceEquipmentWidget
                        eyebrow="Produce basket"
                      >
                        <div className="space-y-4">
                          <button
                            aria-expanded={isBasketOpen}
                            aria-haspopup="dialog"
                            className="block w-full rounded-[1.4rem] border border-slate-200/80 bg-white/90 px-3 py-4 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
                            data-testid="basket-open-button"
                            onClick={() => setIsBasketOpen(true)}
                            type="button"
                          >
                            <ProduceBasketIllustration
                              className="mx-auto max-w-[18rem]"
                              itemCount={6}
                            />
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200/80 bg-white/90 px-3 py-3">
                              <p className="text-sm text-slate-500">
                                Click the basket to create a fruit or vegetable input.
                              </p>
                              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                                {basketProduceItems.length} item{basketProduceItems.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </button>
                        </div>
                      </WorkspaceEquipmentWidget>
                      {isBasketOpen ? (
                        <div
                          className="absolute left-0 top-full z-[220] mt-3 w-[24rem] max-w-[min(24rem,calc(100vw-2rem))]"
                          data-testid="basket-dialog-overlay"
                        >
                          <div
                            className="w-full rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                            role="dialog"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                  Create produce
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Start the produce library for sample preparation.
                                </p>
                              </div>
                              <button
                                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                                onClick={() => setIsBasketOpen(false)}
                                type="button"
                              >
                                Close
                              </button>
                            </div>
                            <div className="space-y-4 p-4">
                              <button
                                className="w-full rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100/80"
                                data-testid="basket-create-apple-button"
                                onClick={handleCreateApple}
                                type="button"
                              >
                                <span className="flex items-center gap-3">
                                  <AppleIllustration className="h-12 w-12 shrink-0" />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-900">Create apple</span>
                                    <span className="mt-1 block text-sm text-slate-500">
                                      Add a first produce item to the basket.
                                    </span>
                                  </span>
                                </span>
                              </button>
                              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Basket contents
                                </p>
                                <div className="mt-3 space-y-2">
                                  {basketProduceItems.length > 0 ? (
                                    basketProduceItems.map((item) => (
                                      <div
                                        className={`${dragAffordanceClassName} flex items-center justify-between gap-3 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2`}
                                        data-testid={`basket-produce-${item.id}`}
                                        draggable
                                        key={item.id}
                                        onDragEnd={clearDropTargets}
                                        onDragStart={(event) =>
                                          handleBasketProduceDragStart(
                                            item.id,
                                            item.produceType,
                                            event.dataTransfer,
                                          )}
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <AppleIllustration
                                            className="h-10 w-10 shrink-0"
                                            testId={`basket-produce-illustration-${item.id}`}
                                          />
                                          <span className="truncate text-sm font-semibold text-slate-900">
                                            {item.label}
                                          </span>
                                        </div>
                                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                                          {item.produceType}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-slate-500">No produce created yet.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : widgetId === "rack" ? (
                    <WorkspaceEquipmentWidget
                      eyebrow="Autosampler rack"
                    >
                      <div className="space-y-4">
                        <div className="relative mx-auto max-w-[30rem]">
                          <AutosamplerRackIllustration
                            className="w-full"
                            occupiedSlotLiquids={rackOccupiedSlotLiquids}
                            occupiedSlots={rackOccupiedSlots}
                            slotCount={rackSlotCount}
                            testId="autosampler-rack-illustration"
                            tone={rackLoadedCount > 0 ? "active" : "neutral"}
                          />
                          {rackSlots.map((rackSlot, slotIndex) => {
                            const position = getRackIllustrationSlotPosition(slotIndex);
                            const tool = rackSlot.tool;

                            return (
                              <div
                                className={`absolute h-14 w-12 -translate-x-1/2 -translate-y-[70%] rounded-full transition-colors ${
                                  isRackSlotHighlighted
                                    ? "bg-sky-200/45 ring-2 ring-sky-300/90"
                                    : ""
                                } ${tool ? dragAffordanceClassName : ""}`}
                                data-drop-highlighted={isRackSlotHighlighted ? "true" : "false"}
                                data-testid={`rack-illustration-slot-${slotIndex + 1}`}
                                key={rackSlot.id}
                                draggable={Boolean(tool)}
                                onDragEnd={clearDropTargets}
                                onDragOver={handleRackSlotDragOver}
                                onDragStart={(event) => {
                                  if (!tool) {
                                    return;
                                  }
                                  handleRackToolDragStart(rackSlot, tool, event.dataTransfer);
                                }}
                                onDrop={(event) => handleRackSlotDrop(event, slotIndex)}
                                style={position}
                              />
                            );
                          })}
                        </div>
                        <div
                          className="rounded-[1.2rem] border border-slate-200/80 bg-white/90 px-3 py-3"
                          data-testid="rack-summary"
                        >
                          {rackLoadedCount > 0 ? (
                            <div className="space-y-1.5">
                              {rackSlots.map((rackSlot, slotIndex) => {
                                const tool = rackSlot.tool;
                                if (!tool) {
                                  return null;
                                }

                                return (
                                  <div
                                    className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-1.5"
                                    data-testid={`rack-slot-summary-${slotIndex + 1}`}
                                    key={rackSlot.id}
                                  >
                                    <div className="min-w-0 flex-1 text-sm text-slate-700">
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        P{slotIndex + 1}
                                      </span>
                                      <span className="mx-2 text-slate-300">•</span>
                                      <span className="truncate font-semibold text-slate-900">
                                        {tool.label}
                                      </span>
                                    </div>
                                    <div
                                      className={`${dragAffordanceClassName} shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600`}
                                      data-testid={`rack-slot-tool-${slotIndex + 1}`}
                                      draggable
                                      onDragEnd={clearDropTargets}
                                      onDragStart={(event) => handleRackToolDragStart(rackSlot, tool, event.dataTransfer)}
                                    >
                                      {tool.liquids.reduce(
                                        (total, liquid) => total + liquid.volume_ml,
                                        0,
                                      )} mL
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              No vial staged yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </WorkspaceEquipmentWidget>
                  ) : (
                    <WorkspaceEquipmentWidget
                      eyebrow="LC-MS/MS"
                      footer={
                        instrumentStatus === "ready"
                          ? "The instrument reads as sequence-ready because the rack now contains at least one autosampler vial."
                          : "Populate the rack with at least one autosampler vial to switch the instrument preview into a ready state."
                      }
                    >
                      <LcMsMsInstrumentIllustration
                        className="mx-auto max-w-[36rem]"
                        status={instrumentStatus}
                        testId="lc-msms-instrument-illustration"
                      />
                    </WorkspaceEquipmentWidget>
                  )}
                </FloatingWidget>
              ))}

            <FloatingWidget
              id="workbench"
              isActive={activeWidgetId === "workbench"}
              label="Workbench Widget"
              onDragStart={handleWidgetDragStart}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.workbench}
              zIndex={10 + widgetOrder.indexOf("workbench")}
            >
              <PesticideWorkbenchPanel
                onAddWorkbenchSlot={handleAddWorkbenchSlot}
                canDragBenchTool={canDragBenchTool}
                isBenchSlotHighlighted={isBenchSlotHighlighted}
                onBenchToolDragEnd={clearDropTargets}
                onBenchToolDragStart={handleBenchToolDragStart}
                onBenchToolDrop={handleBenchToolDrop}
                onProduceDrop={handleProduceDrop}
                onRemoveLiquid={handleRemoveLiquid}
                onRemoveWorkbenchSlot={handleRemoveWorkbenchSlot}
                onLiquidVolumeChange={handleLiquidVolumeChange}
                slots={slots}
                statusMessage={statusMessage}
                onToolbarItemDrop={handleToolbarItemDrop}
              />
            </FloatingWidget>
          </div>
        </section>
      </div>
    </main>
  );
}
