"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

import { FloatingWidget } from "@/components/floating-widget";
import { ActionBarPanel } from "@/components/action-bar-panel";
import { AppleIllustration } from "@/components/illustrations/apple-illustration";
import { CryogenicGrinderIllustration } from "@/components/illustrations/cryogenic-grinder-illustration";
import { InlineQuantityInput } from "@/components/inline-quantity-input";
import { InventoryWidget } from "@/components/inventory-widget";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { ProduceBasketWidget } from "@/components/produce-basket-widget";
import { RackWidget } from "@/components/rack-widget";
import { TrashWidget } from "@/components/trash-widget";
import { WorkbenchPanel } from "@/components/workbench-panel";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";
import { DraggableInventoryItem } from "@/components/draggable-inventory-item";
import { useLabExperiment } from "@/hooks/use-lab-experiment";
import {
  inferAnchoredLayout,
  type WidgetLayout,
  useWorkspaceLayout,
} from "@/hooks/use-workspace-layout";
import {
  createToolbarDragPayload,
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readProduceDragPayload,
  readRackToolDragPayload,
  readSampleLabelDragPayload,
  readTrashToolDragPayload,
  readToolbarDragPayload,
  readWorkspaceWidgetDragPayload,
  toDragDescriptor,
  writeBenchToolDragPayload,
  writeProduceDragPayload,
  writeRackToolDragPayload,
  writeSampleLabelDragPayload,
  writeTrashToolDragPayload,
  writeWorkspaceWidgetDragPayload,
} from "@/lib/workbench-dnd";
import {
  canToolAcceptLiquids,
  canToolAcceptProduce,
  getProduceLotDropTargets,
  getSampleLabelDropTargets,
  getToolDropTargets,
  getWorkspaceWidgetDropTargets,
  isWorkspaceWidgetDiscardable,
} from "@/lib/tool-drop-targets";
import {
  labToolCatalog,
  labWorkflowCategories,
} from "@/lib/lab-workflow-catalog";
import type {
  BenchSlot,
  BenchToolDragPayload,
  BenchToolInstance,
  DragDescriptor,
  DropTargetType,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  ProduceDragPayload,
  RackSlot,
  RackToolDragPayload,
  TrashToolDragPayload,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
  ToolbarDragPayload,
} from "@/types/workbench";

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load lab scene";
const widgetIds = [
  "inventory",
  "actions",
  "workbench",
  "trash",
  "rack",
  "instrument",
  "basket",
  "grinder",
] as const;
const workspaceEquipmentItemToWidgetId = {
  autosampler_rack_widget: "rack",
  lc_msms_instrument_widget: "instrument",
  cryogenic_grinder_widget: "grinder",
  produce_basket_widget: "basket",
} as const;
const widgetTrashability: Record<WidgetId, boolean> = {
  inventory: false,
  actions: false,
  workbench: false,
  trash: false,
  rack: true,
  instrument: true,
  grinder: true,
  basket: false,
};

type WidgetId = (typeof widgetIds)[number];
type WorkspaceEquipmentWidgetId = (typeof workspaceEquipmentItemToWidgetId)[keyof typeof workspaceEquipmentItemToWidgetId];

const widgetFrameSpecs: Record<WidgetId, WidgetLayout> = {
  inventory: {
    anchor: "top-left",
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    width: 202,
    fallbackHeight: 720,
  },
  actions: {
    anchor: "top-right",
    x: 1490,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    width: 92,
    fallbackHeight: 104,
  },
  workbench: { x: 234, y: 0, width: 1228, fallbackHeight: 860 },
  trash: { x: 1490, y: 126, width: 164, fallbackHeight: 214 },
  rack: { x: 234, y: 886, width: 548, fallbackHeight: 392 },
  instrument: { x: 812, y: 886, width: 650, fallbackHeight: 392 },
  basket: { x: 1490, y: 352, width: 198, fallbackHeight: 236 },
  grinder: { x: 980, y: 886, width: 430, fallbackHeight: 340 },
};
const rackSlotCount = 12;
const rackIllustrationViewBox = { height: 320, width: 560 };
const rackIllustrationBase = { x: 98, y: 106 };
const rackIllustrationGap = { x: 70, y: 84 };
const rackIllustrationColumns = Math.min(6, Math.max(rackSlotCount, 1));
const knifeCursor =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'%3E%3Cg transform='rotate(-142 12 12)'%3E%3Crect x='4.1' y='9.9' width='8.6' height='4.2' rx='1.2' fill='%230f172a'/%3E%3Crect x='4.1' y='9.9' width='8.6' height='4.2' rx='1.2' stroke='%230f172a' stroke-width='1.15'/%3E%3Cpath d='M12.7 9.9H15.9L19.8 12L15.9 14.1H12.7V9.9Z' fill='%23e2e8f0' stroke='%230f172a' stroke-width='1.15' stroke-linejoin='round'/%3E%3C/g%3E%3C/svg%3E\") 22 8, auto";

function isWorkspaceEquipmentWidgetId(value: WidgetId): value is WorkspaceEquipmentWidgetId {
  return value === "rack" || value === "instrument" || value === "basket" || value === "grinder";
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

function formatProduceLotMass(totalMassG: number) {
  if (totalMassG >= 1000) {
    return `${(totalMassG / 1000).toFixed(2)} kg`;
  }

  return `${Number.parseFloat(totalMassG.toFixed(0)).toString()} g`;
}

function formatProduceLotMetadata(produceLot: ExperimentProduceLot) {
  const unitLabel =
    produceLot.unitCount === null
      ? null
      : `${produceLot.unitCount} unit${produceLot.unitCount === 1 ? "" : "s"}`;
  const massLabel = formatProduceLotMass(produceLot.totalMassG);

  return unitLabel ? `${unitLabel} • ${massLabel}` : massLabel;
}

export function LabScene() {
  const { state, statusMessage, isCommandPending, loadExperiment, sendWorkbenchCommand } =
    useLabExperiment({
      defaultErrorMessage,
      defaultStatusMessage,
    });
  const [activeDropTargets, setActiveDropTargets] = useState<DropTargetType[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<DragDescriptor | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const isKnifeMode = activeActionId === "knife";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("input, textarea, select, [contenteditable='true']") ||
          target.getAttribute("role") === "textbox")
      ) {
        return;
      }

      if (event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      clearDropTargets();
      setActiveActionId((current) => (current === "knife" ? null : "knife"));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const handleApplySampleLabel = (slotId: string) => {
    clearDropTargets();
    void sendWorkbenchCommand("apply_sample_label_to_workbench_tool", {
      slot_id: slotId,
    });
  };

  const handleSampleLabelTextChange = (slotId: string, sampleLabelText: string) => {
    void sendWorkbenchCommand("update_workbench_tool_sample_label_text", {
      slot_id: slotId,
      sample_label_text: sampleLabelText,
    });
  };

  const handleMoveSampleLabel = (targetSlotId: string, payload: { sourceSlotId?: string }) => {
    if (!payload.sourceSlotId) {
      return;
    }

    clearDropTargets();
    void sendWorkbenchCommand("move_sample_label_between_workbench_tools", {
      source_slot_id: payload.sourceSlotId,
      target_slot_id: targetSlotId,
    });
  };

  const handleRestoreTrashedSampleLabel = (
    targetSlotId: string,
    payload: { trashSampleLabelId?: string },
  ) => {
    if (!payload.trashSampleLabelId) {
      return;
    }

    clearDropTargets();
    void sendWorkbenchCommand("restore_trashed_sample_label_to_workbench_tool", {
      target_slot_id: targetSlotId,
      trash_sample_label_id: payload.trashSampleLabelId,
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

  const handleWorkspaceWidgetLiquidVolumeChange = (
    widgetId: string,
    liquidId: string,
    volumeMl: number,
  ) => {
    void sendWorkbenchCommand("update_workspace_widget_liquid_volume", {
      widget_id: widgetId,
      liquid_entry_id: liquidId,
      volume_ml: volumeMl,
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
    return getToolDropTargets(tool.toolType);
  };

  const canDragBenchTool = (_slotId: string, tool: BenchToolInstance) => {
    if (isKnifeMode) {
      return false;
    }
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
    });
    const descriptor = {
      allowedDropTargets: getBenchToolAllowedDropTargets(tool),
      entityKind: "tool" as const,
      sourceId: slotId,
      sourceKind: "workbench" as const,
      toolId: tool.toolId,
      toolType: tool.toolType,
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
    if (payload.sourceKind === "basket") {
      void sendWorkbenchCommand("add_produce_lot_to_workbench_tool", {
        slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      void sendWorkbenchCommand("move_produce_lot_between_workbench_tools", {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      void sendWorkbenchCommand("restore_trashed_produce_lot_to_workbench_tool", {
        target_slot_id: targetSlotId,
        trash_produce_lot_id: payload.trashProduceLotId,
      });
    }

    clearDropTargets();
  };

  const handleWorkbenchProduceLotClick = (slotId: string, produceLot: ExperimentProduceLot) => {
    if (!isKnifeMode || produceLot.cutState === "cut") {
      return;
    }

    void sendWorkbenchCommand("cut_workbench_produce_lot", {
      slot_id: slotId,
      produce_lot_id: produceLot.id,
    });
  };

  const liveWidgetIds: WidgetId[] =
    state.status === "ready"
      ? [
          "inventory",
          "actions",
          ...state.experiment.workspace.widgets
            .filter((widget) => widget.isPresent)
            .map((widget) => widget.id),
        ]
      : ["inventory", "actions"];

  const {
    activeWidgetId,
    handleWidgetDragStart,
    handleWidgetHeightChange,
    widgetHeights,
    widgetLayout,
    widgetOrder,
    workspaceHeight,
  } = useWorkspaceLayout<WidgetId>({
    fixedWidgetIds: ["inventory", "actions"],
    getIsWidgetTrashable: (widgetId) => widgetTrashability[widgetId],
    initialLayout: widgetFrameSpecs,
    initialOrder: [...widgetIds],
    onDiscardWidget: (widgetId) => {
      clearDropTargets();
      void sendWorkbenchCommand("discard_workspace_widget", {
        widget_id: widgetId,
      });
    },
    onMoveWidget: (widgetId, nextPosition) => {
      void sendWorkbenchCommand("move_workspace_widget", {
        widget_id: widgetId,
        anchor: nextPosition.anchor,
        offset_x: nextPosition.offsetX,
        offset_y: nextPosition.offsetY,
      });
    },
    onWidgetDragStateChange: (widgetId, isTrashDropActive) => {
      setActiveDropTargets(isTrashDropActive && widgetId ? ["trash_bin"] : []);
    },
    presentWidgetIds: liveWidgetIds,
    syncKey:
      state.status === "ready"
        ? `${state.experiment.id}:${JSON.stringify(state.experiment.workspace.widgets)}`
        : null,
    trashWidgetId: "trash",
    widgets:
      state.status === "ready"
        ? state.experiment.workspace.widgets.map((widget) => ({
            anchor: widget.anchor,
            id: widget.id,
            offsetX: widget.offsetX,
            offsetY: widget.offsetY,
            x: widget.x,
            y: widget.y,
          }))
        : [],
    workspaceRef,
  });

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
    const nextAnchoredLayout = inferAnchoredLayout(
      { x: nextX, y: nextY },
      { height: widgetHeight, width: nextLayout.width },
      workspaceRect ? { height: workspaceRect.height, width: workspaceRect.width } : null,
    );

    void sendWorkbenchCommand("add_workspace_widget", {
      widget_id: widgetId,
      anchor: nextAnchoredLayout.anchor,
      offset_x: nextAnchoredLayout.offsetX,
      offset_y: nextAnchoredLayout.offsetY,
    });
  };

  const handleWorkspaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isKnifeMode) {
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
    if (isKnifeMode) {
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

  const handleGrinderDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "grinder_widget")) {
      event.preventDefault();
    }
  };

  const handleGrinderDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (!hasCompatibleDropTarget(event.dataTransfer, "grinder_widget")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (toolbarPayload?.itemType === "liquid") {
      event.preventDefault();
      clearDropTargets();
      void sendWorkbenchCommand("add_liquid_to_workspace_widget", {
        widget_id: "grinder",
        liquid_id: toolbarPayload.itemId,
      });
      return;
    }

    const producePayload = readProduceDragPayload(event.dataTransfer);
    if (!producePayload) {
      return;
    }

    event.preventDefault();
    clearDropTargets();

    if (producePayload.sourceKind === "basket") {
      void sendWorkbenchCommand("add_workspace_produce_lot_to_widget", {
        widget_id: "grinder",
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "workbench" && producePayload.sourceSlotId) {
      void sendWorkbenchCommand("move_workbench_produce_lot_to_widget", {
        widget_id: "grinder",
        source_slot_id: producePayload.sourceSlotId,
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "trash" && producePayload.trashProduceLotId) {
      void sendWorkbenchCommand("restore_trashed_produce_lot_to_widget", {
        widget_id: "grinder",
        trash_produce_lot_id: producePayload.trashProduceLotId,
      });
    }
  };

  const handleTrashDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "trash_bin")) {
      event.preventDefault();
    }
  };

  const handleTrashDrop = (event: DragEvent<HTMLButtonElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (!hasCompatibleDropTarget(event.dataTransfer, "trash_bin")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (toolbarPayload?.itemType === "sample_label") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_sample_label_from_palette", {
        sample_label_id: toolbarPayload.itemId,
      });
      return;
    }

    if (toolbarPayload?.itemType === "tool") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_tool_from_palette", {
        tool_id: toolbarPayload.itemId,
      });
      return;
    }

    if (toolbarPayload?.itemType === "workspace_widget") {
      const widgetId = getWorkspaceEquipmentWidgetId(toolbarPayload.itemId);
      if (!widgetId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_workspace_widget", {
        widget_id: widgetId,
      });
      return;
    }

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_workbench_tool", {
        slot_id: benchToolPayload.sourceSlotId,
      });
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_rack_tool", {
        rack_slot_id: rackToolPayload.rackSlotId,
      });
      return;
    }

    const producePayload = readProduceDragPayload(event.dataTransfer);
    if (producePayload?.sourceKind === "basket") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_workspace_produce_lot", {
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "workbench" && producePayload.sourceSlotId) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_produce_lot_from_workbench_tool", {
        slot_id: producePayload.sourceSlotId,
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    const sampleLabelPayload = readSampleLabelDragPayload(event.dataTransfer);
    if (sampleLabelPayload?.sourceKind === "workbench" && sampleLabelPayload.sourceSlotId) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void sendWorkbenchCommand("discard_sample_label_from_workbench_tool", {
        slot_id: sampleLabelPayload.sourceSlotId,
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
  const trashedProduceLots = state.experiment.trash.produceLots;
  const trashedSampleLabels = state.experiment.trash.sampleLabels;
  const trashedTools = state.experiment.trash.tools;
  const grinderWidget =
    state.experiment.workspace.widgets.find((widget) => widget.id === "grinder") ?? null;
  const trashedWidgets = state.experiment.workspace.widgets.filter(
    (widget) => isWorkspaceWidgetDiscardable(widget.id) && widget.isTrashed,
  );
  const grinderProduceLots = grinderWidget?.produceLots ?? [];
  const grinderLiquids = grinderWidget?.liquids ?? [];
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

  const handleRackSlotDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "rack_slot")) {
      event.preventDefault();
    }
  };

  const handleRackSlotDrop = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    if (isKnifeMode) {
      return;
    }
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
      toolbarPayload?.itemType === "tool" ? labToolCatalog[toolbarPayload.itemId] : null;
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
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getToolDropTargets(tool.toolType);

    writeRackToolDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "tool",
      rackSlotId: rackSlot.id,
      sourceId: rackSlot.id,
      sourceKind: "rack",
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
    const descriptor = {
      allowedDropTargets,
      entityKind: "tool" as const,
      sourceId: rackSlot.id,
      sourceKind: "rack" as const,
      toolId: tool.toolId,
      toolType: tool.toolType,
    };
    showDropTargets(descriptor.allowedDropTargets);
    setActiveDragItem(descriptor);
  };

  const handleTrashToolDragStart = (
    trashTool: TrashToolEntry,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getToolDropTargets(trashTool.tool.toolType);

    writeTrashToolDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "tool",
      sourceId: trashTool.id,
      sourceKind: "trash",
      toolId: trashTool.tool.toolId,
      toolType: trashTool.tool.toolType,
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
    });
  };

  const handleTrashedWidgetDragStart = (
    widget: ExperimentWorkspaceWidget,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getWorkspaceWidgetDropTargets(widget.id);

    writeWorkspaceWidgetDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "workspace_widget",
      sourceId: widget.id,
      sourceKind: "trash",
      widgetId: widget.id,
      widgetType: widget.widgetType,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "workspace_widget",
      sourceId: widget.id,
      sourceKind: "trash",
      widgetId: widget.id,
      widgetType: widget.widgetType,
    });
  };

  const handleTrashProduceLotDragStart = (
    trashProduceLot: TrashProduceLotEntry,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getProduceLotDropTargets();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: trashProduceLot.produceLot.id,
      produceType: trashProduceLot.produceLot.produceType,
      sourceId: trashProduceLot.produceLot.id,
      sourceKind: "trash",
      trashProduceLotId: trashProduceLot.id,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: trashProduceLot.produceLot.id,
      produceType: trashProduceLot.produceLot.produceType,
      sourceId: trashProduceLot.produceLot.id,
      sourceKind: "trash",
      trashProduceLotId: trashProduceLot.id,
    });
  };

  const handleBasketProduceDragStart = (
    produceLotId: string,
    produceType: "apple",
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getProduceLotDropTargets();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId,
      produceType,
      sourceId: produceLotId,
      sourceKind: "basket",
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "produce",
      produceLotId,
      produceType,
      sourceId: produceLotId,
      sourceKind: "basket",
    });
  };

  const handleWorkbenchProduceLotDragStart = (
    slotId: string,
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getProduceLotDropTargets();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
  };

  const handleWorkbenchSampleLabelDragStart = (
    slotId: string,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    if (tool.sampleLabelText === null || tool.sampleLabelText === undefined) {
      return;
    }

    const allowedDropTargets = getSampleLabelDropTargets();

    writeSampleLabelDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "sample_label",
      sampleLabelId: `${tool.id}-sample-label`,
      sampleLabelText: tool.sampleLabelText,
      sourceId: slotId,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "sample_label",
      sampleLabelId: `${tool.id}-sample-label`,
      sampleLabelText: tool.sampleLabelText,
      sourceId: slotId,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
  };

  const handleTrashSampleLabelDragStart = (
    trashSampleLabel: TrashSampleLabelEntry,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets = getSampleLabelDropTargets();

    writeSampleLabelDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "sample_label",
      sampleLabelId: trashSampleLabel.id,
      sampleLabelText: trashSampleLabel.sampleLabelText,
      sourceId: trashSampleLabel.id,
      sourceKind: "trash",
      trashSampleLabelId: trashSampleLabel.id,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "sample_label",
      sampleLabelId: trashSampleLabel.id,
      sampleLabelText: trashSampleLabel.sampleLabelText,
      sourceId: trashSampleLabel.id,
      sourceKind: "trash",
      trashSampleLabelId: trashSampleLabel.id,
    });
  };

  const isBenchSlotHighlighted = (slot: BenchSlot) => {
    if (isKnifeMode) {
      return false;
    }
    if (!activeDropTargets.includes("workbench_slot") || !activeDragItem) {
      return false;
    }

    if (activeDragItem.entityKind === "tool") {
      if (activeDragItem.sourceKind === "workbench") {
        return slot.tool === null && (slot.surfaceProduceLots?.length ?? 0) === 0 && slot.id !== activeDragItem.sourceId;
      }

      if (
        activeDragItem.sourceKind === "palette" ||
        activeDragItem.sourceKind === "rack" ||
        activeDragItem.sourceKind === "trash"
      ) {
        return slot.tool === null && (slot.surfaceProduceLots?.length ?? 0) === 0;
      }
    }

    if (activeDragItem.entityKind === "liquid") {
      return slot.tool !== null && canToolAcceptLiquids(slot.tool.toolType);
    }

    if (activeDragItem.entityKind === "produce") {
      if (slot.tool !== null) {
        return canToolAcceptProduce(slot.tool.toolType) && (slot.tool.produceLots?.length ?? 0) === 0;
      }

      return (slot.surfaceProduceLots?.length ?? 0) === 0;
    }

    if (activeDragItem.entityKind === "sample_label") {
      return slot.tool?.toolType === "sample_bag" && slot.tool.sampleLabelText === null;
    }

    return false;
  };

  const isRackSlotHighlighted =
    !isKnifeMode &&
    activeDropTargets.includes("rack_slot") &&
    activeDragItem?.entityKind === "tool" &&
    activeDragItem.toolType === "sample_vial";

  const isTrashEmpty =
    trashedTools.length === 0 &&
    trashedProduceLots.length === 0 &&
    trashedSampleLabels.length === 0 &&
    trashedWidgets.length === 0;
  const basketProduceLots = state.experiment.workspace.produceLots;
  const handleCreateAppleLot = () => {
    void sendWorkbenchCommand("create_produce_lot", {
      produce_type: "apple",
    });
  };
  const workspaceCursor = activeActionId === "knife" ? knifeCursor : undefined;

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
            style={{ cursor: workspaceCursor, minHeight: workspaceHeight }}
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
              id="inventory"
              isActive={activeWidgetId === "inventory"}
              label="Inventory Widget"
              onDragStart={(widgetId, event) => {
                if (isKnifeMode) {
                  return;
                }
                handleWidgetDragStart(widgetId, event);
              }}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.inventory}
              zIndex={10 + widgetOrder.indexOf("inventory")}
            >
              <ToolbarPanel
                categories={labWorkflowCategories}
                dragDisabled={isKnifeMode}
                onItemDragEnd={clearDropTargets}
                onItemDragStart={(item, allowedDropTargets) => {
                  if (isKnifeMode) {
                    return;
                  }
                  const payload = createToolbarDragPayload(item);
                  showDropTargets(allowedDropTargets);
                  setActiveDragItem(toDragDescriptor(payload));
                }}
              />
            </FloatingWidget>

            <FloatingWidget
              id="actions"
              isActive={activeWidgetId === "actions"}
              label="Actions Widget"
              onDragStart={(widgetId, event) => {
                if (isKnifeMode) {
                  return;
                }
                handleWidgetDragStart(widgetId, event);
              }}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.actions}
              zIndex={10 + widgetOrder.indexOf("actions")}
            >
              <ActionBarPanel
                activeActionId={activeActionId}
                onToggleAction={(actionId) => {
                  clearDropTargets();
                  setActiveActionId((current) => (current === actionId ? null : actionId));
                }}
              />
            </FloatingWidget>

            <FloatingWidget
              id="trash"
              isActive={activeWidgetId === "trash"}
              label="Trash Widget"
              onDragStart={(widgetId, event) => {
                if (isKnifeMode) {
                  return;
                }
                handleWidgetDragStart(widgetId, event);
              }}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.trash}
              zIndex={10 + widgetOrder.indexOf("trash")}
            >
              <TrashWidget
                dndDisabled={isKnifeMode}
                formatProduceLotMetadata={formatProduceLotMetadata}
                isDropHighlighted={isDropTargetHighlighted("trash_bin")}
                isEmpty={isTrashEmpty}
                isOpen={isTrashOpen}
                onDragOver={handleTrashDragOver}
                onDrop={handleTrashDrop}
                onItemDragEnd={clearDropTargets}
                onToggle={() => setIsTrashOpen((current) => !current)}
                onToolDragStart={handleTrashToolDragStart}
                onTrashedWidgetDragStart={handleTrashedWidgetDragStart}
                onTrashProduceLotDragStart={handleTrashProduceLotDragStart}
                onTrashSampleLabelDragStart={handleTrashSampleLabelDragStart}
                trashedProduceLots={trashedProduceLots}
                trashedSampleLabels={trashedSampleLabels}
                trashedTools={trashedTools}
                trashedWidgets={trashedWidgets}
              />
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
                        : widgetId === "grinder"
                          ? "Grinder Widget"
                          : "Produce Basket Widget"
                  }
                  onDragStart={(widgetId, event) => {
                    if (isKnifeMode) {
                      return;
                    }
                    handleWidgetDragStart(widgetId, event);
                  }}
                  onHeightChange={handleWidgetHeightChange}
                  position={widgetLayout[widgetId]}
                  zIndex={10 + widgetOrder.indexOf(widgetId)}
                >
                  {widgetId === "basket" ? (
                    <ProduceBasketWidget
                      dndDisabled={isKnifeMode}
                      formatProduceLotMetadata={formatProduceLotMetadata}
                      isOpen={isBasketOpen}
                      onCreateAppleLot={handleCreateAppleLot}
                      onItemDragEnd={clearDropTargets}
                      onProduceDragStart={handleBasketProduceDragStart}
                      onToggle={() => setIsBasketOpen((current) => !current)}
                      produceLots={basketProduceLots}
                    />
                  ) : widgetId === "rack" ? (
                    <RackWidget
                      dndDisabled={isKnifeMode}
                      getSlotPosition={getRackIllustrationSlotPosition}
                      isSlotHighlighted={isRackSlotHighlighted}
                      loadedCount={rackLoadedCount}
                      occupiedSlotLiquids={rackOccupiedSlotLiquids}
                      occupiedSlots={rackOccupiedSlots}
                      onItemDragEnd={clearDropTargets}
                      onRackSlotDragOver={handleRackSlotDragOver}
                      onRackSlotDrop={handleRackSlotDrop}
                      onRackToolDragStart={handleRackToolDragStart}
                      rackSlots={rackSlots}
                      slotCount={rackSlotCount}
                    />
                  ) : widgetId === "instrument" ? (
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
                  ) : (
                    <WorkspaceEquipmentWidget
                      dataDropHighlighted={isDropTargetHighlighted("grinder_widget") ? "true" : "false"}
                      dropZoneTestId="grinder-dropzone"
                      eyebrow="Cryogenic grinder"
                      onDragOver={handleGrinderDragOver}
                      onDrop={handleGrinderDrop}
                    >
                      <div className="space-y-4">
                        <CryogenicGrinderIllustration
                          className="mx-auto max-w-[24rem]"
                          testId="cryogenic-grinder-illustration"
                        />
                        <div className="space-y-2">
                          {grinderProduceLots.map((lot) => (
                            <DraggableInventoryItem
                              className="rounded-[0.9rem] bg-white"
                              contentClassName="flex-1"
                              dataTestId={`grinder-produce-${lot.id}`}
                              key={lot.id}
                              leading={
                                <div className="h-10 w-10 shrink-0">
                                  <AppleIllustration
                                    className="h-10 w-10"
                                    variant={lot.cutState === "cut" ? "cut" : "whole"}
                                  />
                                </div>
                              }
                              subtitle={
                                <span className="block truncate text-xs text-slate-500">
                                  {formatProduceLotMetadata(lot)}
                                </span>
                              }
                              title={
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {lot.label}
                                </span>
                              }
                            />
                          ))}
                          {grinderLiquids.map((liquid) => (
                            <DraggableInventoryItem
                              className="rounded-[0.9rem] bg-white"
                              contentClassName="flex-1"
                              dataTestId={`grinder-liquid-${liquid.id}`}
                              key={liquid.id}
                              subtitle={
                                <div className="mt-1 flex items-center justify-between gap-3">
                                  <span className="block truncate text-xs text-slate-500">
                                    Cooling medium
                                  </span>
                                  <InlineQuantityInput
                                    ariaLabel={`${liquid.name} mass`}
                                    inputStep={1}
                                    onChange={(value) => {
                                      handleWorkspaceWidgetLiquidVolumeChange("grinder", liquid.id, value);
                                    }}
                                    unitLabel="g"
                                    value={liquid.volume_ml}
                                    wheelStep={1}
                                  />
                                </div>
                              }
                              title={
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {liquid.name}
                                </span>
                              }
                            />
                          ))}
                          {grinderProduceLots.length === 0 && grinderLiquids.length === 0 ? (
                            <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white/75 px-4 py-4 text-sm text-slate-500">
                              Drop an apple lot or dry ice pellets into the grinder.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </WorkspaceEquipmentWidget>
                  )}
                </FloatingWidget>
              ))}

            <FloatingWidget
              id="workbench"
              isActive={activeWidgetId === "workbench"}
              label="Workbench Widget"
              onDragStart={(widgetId, event) => {
                if (isKnifeMode) {
                  return;
                }
                handleWidgetDragStart(widgetId, event);
              }}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.workbench}
              zIndex={5}
            >
              <WorkbenchPanel
                dndDisabled={isKnifeMode}
                onAddWorkbenchSlot={handleAddWorkbenchSlot}
                onApplySampleLabel={handleApplySampleLabel}
                canDragBenchTool={canDragBenchTool}
                isBenchSlotHighlighted={isBenchSlotHighlighted}
                onBenchToolDragEnd={clearDropTargets}
                onBenchToolDragStart={handleBenchToolDragStart}
                onBenchToolDrop={handleBenchToolDrop}
                onProduceLotClick={handleWorkbenchProduceLotClick}
                onMoveSampleLabel={handleMoveSampleLabel}
                onProduceLotDragStart={handleWorkbenchProduceLotDragStart}
                onProduceDrop={handleProduceDrop}
                onRemoveLiquid={handleRemoveLiquid}
                onRemoveWorkbenchSlot={handleRemoveWorkbenchSlot}
                onRestoreTrashedSampleLabel={handleRestoreTrashedSampleLabel}
                onSampleLabelDragEnd={clearDropTargets}
                onSampleLabelDragStart={handleWorkbenchSampleLabelDragStart}
                onSampleLabelTextChange={handleSampleLabelTextChange}
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
