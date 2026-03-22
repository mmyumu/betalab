"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent, MouseEvent as ReactMouseEvent } from "react";

import { FloatingWidget } from "@/components/floating-widget";
import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";
import { createExperiment, sendExperimentCommand } from "@/lib/api";
import {
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
  writeBenchToolDragPayload,
  writeRackToolDragPayload,
} from "@/lib/workbench-dnd";
import {
  pesticideWorkflowCategories,
} from "@/lib/pesticide-workflow-catalog";
import type { Experiment } from "@/types/experiment";
import type {
  BenchSlot,
  BenchToolDragPayload,
  BenchToolInstance,
  RackSlot,
  RackToolDragPayload,
  ToolbarDragPayload,
} from "@/types/workbench";

type WorkbenchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { experiment: Experiment; status: "ready" };

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load pesticide workbench";
const widgetIds = ["toolbar", "workbench", "trash", "rack", "instrument"] as const;
const workspaceEquipmentItemToWidgetId = {
  autosampler_rack_widget: "rack",
  lc_msms_instrument_widget: "instrument",
} as const;
const widgetTrashability: Record<WidgetId, boolean> = {
  toolbar: false,
  workbench: false,
  trash: false,
  rack: true,
  instrument: true,
};

type WidgetId = (typeof widgetIds)[number];
type WorkspaceEquipmentWidgetId = (typeof workspaceEquipmentItemToWidgetId)[keyof typeof workspaceEquipmentItemToWidgetId];

type WidgetLayout = {
  fallbackHeight: number;
  width: number;
  x: number;
  y: number;
};

const initialWidgetLayout: Record<WidgetId, WidgetLayout> = {
  toolbar: { x: 0, y: 0, width: 202, fallbackHeight: 720 },
  workbench: { x: 234, y: 0, width: 1228, fallbackHeight: 860 },
  trash: { x: 1530, y: 0, width: 164, fallbackHeight: 214 },
  rack: { x: 234, y: 886, width: 548, fallbackHeight: 392 },
  instrument: { x: 812, y: 886, width: 650, fallbackHeight: 392 },
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
  return value === "rack" || value === "instrument";
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

export function PesticideWorkbench() {
  const [state, setState] = useState<WorkbenchState>({ status: "loading" });
  const [statusMessage, setStatusMessage] = useState(defaultStatusMessage);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState<WidgetId | null>(null);
  const [widgetLayout, setWidgetLayout] =
    useState<Record<WidgetId, WidgetLayout>>(initialWidgetLayout);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([...widgetIds]);
  const [visibleEquipmentWidgets, setVisibleEquipmentWidgets] = useState<WorkspaceEquipmentWidgetId[]>([]);
  const [widgetHeights, setWidgetHeights] = useState<Record<WidgetId, number>>({
    toolbar: initialWidgetLayout.toolbar.fallbackHeight,
    workbench: initialWidgetLayout.workbench.fallbackHeight,
    trash: initialWidgetLayout.trash.fallbackHeight,
    rack: initialWidgetLayout.rack.fallbackHeight,
    instrument: initialWidgetLayout.instrument.fallbackHeight,
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

    setVisibleEquipmentWidgets([]);
    setWidgetLayout(initialWidgetLayout);
    setWidgetOrder([...widgetIds]);
  }, [state.status === "ready" ? state.experiment.id : null]);

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
      const updatedExperiment = await sendExperimentCommand(state.experiment.id, type, payload);
      setState({ status: "ready", experiment: updatedExperiment });
      setStatusMessage(getLatestStatusMessage(updatedExperiment));
      options?.onSuccess?.(updatedExperiment);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Workbench command failed");
    } finally {
      setIsCommandPending(false);
    }
  };

  const handleToolbarItemDrop = (slotId: string, payload: ToolbarDragPayload) => {
    if (payload.itemType === "tool") {
      void sendWorkbenchCommand("place_tool_on_workbench", {
        slot_id: slotId,
        tool_id: payload.itemId,
      });
      return;
    }

    if (payload.itemType !== "liquid") {
      return;
    }

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

  const getBenchToolAllowedDropTargets = (tool: BenchToolInstance) => {
    const allowedDropTargets: ("workbench_slot" | "rack_slot" | "trash_bin")[] = ["workbench_slot"];

    if (tool.toolType === "sample_vial") {
      allowedDropTargets.push("rack_slot");
    }
    if (tool.trashable) {
      allowedDropTargets.push("trash_bin");
    }

    return allowedDropTargets;
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
      sourceSlotId: slotId,
      toolId: tool.toolId,
      toolType: tool.toolType,
      trashable: tool.trashable,
    });
  };

  const handleBenchToolDrop = (
    targetSlotId: string,
    payload: BenchToolDragPayload | RackToolDragPayload,
  ) => {
    if ("sourceSlotId" in payload) {
      if (payload.sourceSlotId === targetSlotId) {
        return;
      }

      void sendWorkbenchCommand("move_tool_between_workbench_slots", {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
      });
      return;
    }

    void sendWorkbenchCommand("remove_rack_tool_to_workbench_slot", {
      rack_slot_id: payload.rackSlotId,
      target_slot_id: targetSlotId,
    });
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
      setActiveWidgetId(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (shouldTrashWidget && draggedWidgetId && isWorkspaceEquipmentWidgetId(draggedWidgetId)) {
        setVisibleEquipmentWidgets((current) => current.filter((id) => id !== draggedWidgetId));
        setStatusMessage(
          draggedWidgetId === "rack"
            ? "Autosampler rack removed from workspace."
            : "LC-MS/MS removed from workspace.",
        );
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const liveWidgetIds: WidgetId[] = ["toolbar", "workbench", "trash", ...visibleEquipmentWidgets];

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

    setWidgetLayout((current) => ({
      ...current,
      [widgetId]: {
        ...current[widgetId],
        x: Math.min(Math.max(unclampedX, 0), maxX),
        y: Math.min(Math.max(unclampedY, 0), maxY),
      },
    }));
    setVisibleEquipmentWidgets((current) =>
      current.includes(widgetId) ? current : [...current, widgetId],
    );
    setWidgetOrder((current) => [...current.filter((id) => id !== widgetId), widgetId]);
  };

  const handleWorkspaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (hasCompatibleDropTarget(event.dataTransfer, "workspace_canvas")) {
      event.preventDefault();
    }
  };

  const handleWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
    const payload = readToolbarDragPayload(event.dataTransfer);
    if (!payload || payload.itemType !== "workspace_widget") {
      return;
    }

    const widgetId = getWorkspaceEquipmentWidgetId(payload.itemId);
    if (!widgetId) {
      return;
    }

    event.preventDefault();
    moveEquipmentWidgetIntoWorkspace(widgetId, event.clientX, event.clientY);
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
      void sendWorkbenchCommand("discard_workbench_tool", {
        slot_id: benchToolPayload.sourceSlotId,
      });
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload?.trashable) {
      event.preventDefault();
      event.stopPropagation();
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
            Betalab prototype
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pesticide prep workbench</h1>
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pesticide prep workbench</h1>
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
  const placedTools = slots.filter((slot) => slot.tool).length;
  const liquidTransfers = slots.reduce(
    (total, slot) => total + (slot.tool?.liquids.length ?? 0),
    0,
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
    const payload = readBenchToolDragPayload(event.dataTransfer);
    if (!payload || payload.toolType !== "sample_vial") {
      return;
    }

    const targetRackSlot = rackSlots[slotIndex];
    if (!targetRackSlot) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    void sendWorkbenchCommand("place_workbench_tool_in_rack_slot", {
      source_slot_id: payload.sourceSlotId,
      rack_slot_id: targetRackSlot.id,
    });
  };

  const handleRackToolDragStart = (
    rackSlot: RackSlot,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => {
    writeRackToolDragPayload(dataTransfer, {
      allowedDropTargets: tool.trashable ? ["workbench_slot", "trash_bin"] : ["workbench_slot"],
      rackSlotId: rackSlot.id,
      toolId: tool.toolId,
      toolType: tool.toolType,
      trashable: tool.trashable,
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto max-w-[1800px]">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight xl:text-[3.25rem]">
                Pesticide prep workbench
              </h1>
              <p className="mt-2 max-w-5xl text-sm text-slate-600 xl:text-base">
                Start from an empty bench, place QuEChERS prep tools, and add the first liquids of
                the pesticide extraction workflow before moving toward cleanup and LC-MS/MS.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 xl:min-w-[18rem]">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white xl:px-5 xl:py-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Placed tools</p>
                <p className="mt-1 text-lg font-semibold xl:text-2xl">{placedTools}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:px-5 xl:py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Liquid drops</p>
                <p className="mt-1 text-lg font-semibold xl:text-2xl">{liquidTransfers}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,0.55))] p-4 shadow-[0_28px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-6">
          <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/70 bg-white/65 px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Custom layout
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Drag the widget handles to compose your own workspace.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              {liveWidgetIds.length} widgets live
            </div>
          </div>

          <div
            className="relative mt-4 overflow-hidden rounded-[2rem] border border-dashed border-slate-300/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),rgba(248,250,252,0.7)_40%,rgba(226,232,240,0.55)_100%)]"
            data-testid="widget-workspace"
            onDragOverCapture={handleWorkspaceDragOver}
            onDropCapture={handleWorkspaceDrop}
            ref={workspaceRef}
            style={{ minHeight: workspaceHeight }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_26%)]" />

            <FloatingWidget
              id="toolbar"
              isActive={activeWidgetId === "toolbar"}
              label="Toolbar Widget"
              onDragStart={handleWidgetDragStart}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.toolbar}
              zIndex={10 + widgetOrder.indexOf("toolbar")}
            >
              <ToolbarPanel categories={pesticideWorkflowCategories} />
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
              <section className="overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.95))] shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
                <div className="border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Trash
                  </p>
                </div>
                <div className="px-4 py-4">
                <div
                  className="flex min-h-32 flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),rgba(226,232,240,0.92))] px-3 py-4 text-center"
                  data-testid="trash-dropzone"
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
              </section>
            </FloatingWidget>

            {liveWidgetIds
              .filter(isWorkspaceEquipmentWidgetId)
              .map((widgetId) => (
                <FloatingWidget
                  id={widgetId}
                  isActive={activeWidgetId === widgetId}
                  key={widgetId}
                  label={widgetId === "rack" ? "Rack Widget" : "Instrument Widget"}
                  onDragStart={handleWidgetDragStart}
                  onHeightChange={handleWidgetHeightChange}
                  position={widgetLayout[widgetId]}
                  zIndex={10 + widgetOrder.indexOf(widgetId)}
                >
                  {widgetId === "rack" ? (
                    <WorkspaceEquipmentWidget
                      eyebrow="Workspace Equipment"
                      title="Autosampler rack"
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
                                className={`absolute h-14 w-12 -translate-x-1/2 -translate-y-[70%] rounded-full ${
                                  tool ? "cursor-grab active:cursor-grabbing" : ""
                                }`}
                                data-testid={`rack-illustration-slot-${slotIndex + 1}`}
                                key={rackSlot.id}
                                draggable={Boolean(tool)}
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
                                      className="shrink-0 cursor-grab rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 active:cursor-grabbing"
                                      data-testid={`rack-slot-tool-${slotIndex + 1}`}
                                      draggable
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
                      badge={instrumentStatus === "ready" ? "Ready" : "Idle"}
                      description="Single LC-MS/MS system widget with LC and MS/MS modules kept visually distinct for pedagogy."
                      eyebrow="Workspace Equipment"
                      footer={
                        instrumentStatus === "ready"
                          ? "The instrument reads as sequence-ready because the rack now contains at least one autosampler vial."
                          : "Populate the rack with at least one autosampler vial to switch the instrument preview into a ready state."
                      }
                      title="LC-MS/MS"
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
                canDragBenchTool={canDragBenchTool}
                onBenchToolDragStart={handleBenchToolDragStart}
                onBenchToolDrop={handleBenchToolDrop}
                onRemoveLiquid={handleRemoveLiquid}
                onLiquidVolumeChange={handleLiquidVolumeChange}
                slots={slots}
                statusMessage={isCommandPending ? `${statusMessage} Syncing...` : statusMessage}
                onToolbarItemDrop={handleToolbarItemDrop}
              />
            </FloatingWidget>
          </div>
        </section>
      </div>
    </main>
  );
}
