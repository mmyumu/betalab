"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

import { FloatingWidget } from "@/components/floating-widget";
import { ActionBarPanel } from "@/components/action-bar-panel";
import { AppleIllustration } from "@/components/illustrations/apple-illustration";
import { CryogenicGrinderIllustration } from "@/components/illustrations/cryogenic-grinder-illustration";
import { QuantitySelectionCard } from "@/components/quantity-selection-card";
import { InventoryWidget } from "@/components/inventory-widget";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { ProduceBasketWidget } from "@/components/produce-basket-widget";
import { RackWidget } from "@/components/rack-widget";
import { TemperatureIndicator } from "@/components/temperature-indicator";
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
  readWorkspaceLiquidDragPayload,
  readWorkspaceWidgetDragPayload,
  toDragDescriptor,
  writeBenchToolDragPayload,
  writeProduceDragPayload,
  writeRackToolDragPayload,
  writeSampleLabelDragPayload,
  writeTrashToolDragPayload,
  writeWorkspaceLiquidDragPayload,
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
  labLiquidCatalog,
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
  WorkspaceLiquidDragPayload,
} from "@/types/workbench";

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load lab scene";
const ambientTemperatureC = 20;
const cryogenicTickMs = 1000;
const grinderRunDurationMs = 2600;
const grinderColdThresholdC = 8;
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
  rack: { x: 234, y: 886, width: 500, fallbackHeight: 392 },
  instrument: { x: 812, y: 886, width: 650, fallbackHeight: 392 },
  basket: { x: 1490, y: 352, width: 198, fallbackHeight: 236 },
  grinder: { x: 980, y: 886, width: 430, fallbackHeight: 340 },
};
const rackSlotCount = 12;
const rackIllustrationViewBox = { height: 290, width: 480 };
const rackIllustrationBase = { x: 142, y: 91 };
const rackIllustrationGap = { x: 61, y: 49 };
const rackIllustrationColumns = Math.min(4, Math.max(rackSlotCount, 1));
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
  const experimentApi = useLabExperiment({
    defaultErrorMessage,
    defaultStatusMessage,
  });
  const { state, statusMessage, isCommandPending, loadExperiment } = experimentApi;
  const [pendingQuantityDraft, setPendingQuantityDraft] = useState<{
    itemId: string;
    name: string;
    quantity: number;
    stepAmount: number;
    targetId: string;
    targetKind: "bench_slot" | "workspace_widget";
    unitLabel: "g" | "mL";
  } | null>(null);
  const [activeDropTargets, setActiveDropTargets] = useState<DropTargetType[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<DragDescriptor | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isGrinderRunning, setIsGrinderRunning] = useState(false);
  const [grinderFeedback, setGrinderFeedback] = useState<"neutral" | "overload" | "jammed">(
    "neutral",
  );
  const [grinderProgressPercent, setGrinderProgressPercent] = useState(0);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const grinderRunTimeoutRef = useRef<number | null>(null);
  const grinderProgressIntervalRef = useRef<number | null>(null);
  const isKnifeMode = activeActionId === "knife";

  const stopGrinderRun = () => {
    if (grinderRunTimeoutRef.current !== null) {
      window.clearTimeout(grinderRunTimeoutRef.current);
      grinderRunTimeoutRef.current = null;
    }
    if (grinderProgressIntervalRef.current !== null) {
      window.clearInterval(grinderProgressIntervalRef.current);
      grinderProgressIntervalRef.current = null;
    }

    setIsGrinderRunning(false);
    setGrinderProgressPercent(0);
  };

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const hasActiveCryogenics = state.experiment.workspace.widgets.some((widget) => {
      const dryIceMass =
        widget.liquids?.find((liquid) => liquid.liquidId === "dry_ice_pellets")?.volume_ml ?? 0;
      const hasColdProduce = (widget.produceLots ?? []).some(
        (lot) => (lot.temperatureC ?? ambientTemperatureC) < ambientTemperatureC - 0.1,
      );

      return dryIceMass > 0 || hasColdProduce;
    });

    if (!hasActiveCryogenics) {
      return;
    }

    if (pendingQuantityDraft) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (isCommandPending) {
        return;
      }

      void experimentApi.advanceWorkspaceCryogenics( {
        elapsed_ms: cryogenicTickMs,
      });
    }, cryogenicTickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCommandPending, pendingQuantityDraft, experimentApi, state]);

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

  useEffect(() => {
    return () => {
      if (grinderRunTimeoutRef.current !== null) {
        window.clearTimeout(grinderRunTimeoutRef.current);
      }
      if (grinderProgressIntervalRef.current !== null) {
        window.clearInterval(grinderProgressIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state.status !== "ready") {
      stopGrinderRun();
      return;
    }

    const grinder = state.experiment.workspace.widgets.find((widget) => widget.id === "grinder");
    const hasProduceLot = (grinder?.produceLots?.length ?? 0) > 0;
    const grinderDraftIsOpen =
      pendingQuantityDraft?.targetKind === "workspace_widget" &&
      pendingQuantityDraft.targetId === "grinder";

    if (!hasProduceLot || grinderDraftIsOpen) {
      stopGrinderRun();
      setGrinderFeedback("neutral");
    }
  }, [pendingQuantityDraft, state]);

  useEffect(() => {
    if (isGrinderRunning) {
      return;
    }

    const grinder = state.status === "ready"
      ? state.experiment.workspace.widgets.find((widget) => widget.id === "grinder")
      : null;
    const loadedLot = grinder?.produceLots?.[0] ?? null;
    const grinderDraftIsOpen =
      pendingQuantityDraft?.targetKind === "workspace_widget" &&
      pendingQuantityDraft.targetId === "grinder";

    if (!loadedLot || grinderDraftIsOpen) {
      return;
    }

    const lotIsWhole = (loadedLot.cutState ?? "whole") === "whole";
    const lotTemperatureC = loadedLot.temperatureC ?? ambientTemperatureC;

    if (!lotIsWhole && lotTemperatureC <= grinderColdThresholdC) {
      setGrinderFeedback("neutral");
    }
  }, [isGrinderRunning, pendingQuantityDraft, state]);

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
      void experimentApi.placeToolOnWorkbench( {
        slot_id: slotId,
        tool_id: payload.itemId,
      });
      return;
    }

    if (payload.itemType !== "liquid") {
      return;
    }

    clearDropTargets();
    const liquidDefinition = labLiquidCatalog[payload.itemId];
    setPendingQuantityDraft({
      itemId: payload.itemId,
      name: liquidDefinition?.name ?? "Liquid",
      quantity: liquidDefinition?.transfer_volume_ml ?? 0,
      stepAmount: 1,
      targetId: slotId,
      targetKind: "bench_slot",
      unitLabel: "mL",
    });
  };

  const handleApplySampleLabel = (slotId: string) => {
    clearDropTargets();
    void experimentApi.applySampleLabelToWorkbenchTool( {
      slot_id: slotId,
    });
  };

  const handleSampleLabelTextChange = (slotId: string, sampleLabelText: string) => {
    void experimentApi.updateWorkbenchToolSampleLabelText( {
      slot_id: slotId,
      sample_label_text: sampleLabelText,
    });
  };

  const handleMoveSampleLabel = (targetSlotId: string, payload: { sourceSlotId?: string }) => {
    if (!payload.sourceSlotId) {
      return;
    }

    clearDropTargets();
    void experimentApi.moveSampleLabelBetweenWorkbenchTools( {
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
    void experimentApi.restoreTrashedSampleLabelToWorkbenchTool( {
      target_slot_id: targetSlotId,
      trash_sample_label_id: payload.trashSampleLabelId,
    });
  };

  const handleRemoveLiquid = (slotId: string, liquidId: string) => {
    void experimentApi.removeLiquidFromWorkbenchTool( {
      slot_id: slotId,
      liquid_entry_id: liquidId,
    });
  };

  const handleOpenGrinderLiquidDraft = (liquidId: "dry_ice_pellets") => {
    const liquidDefinition = labLiquidCatalog[liquidId];
    setPendingQuantityDraft({
      itemId: liquidId,
      name: liquidDefinition?.name ?? "Dry ice pellets",
      quantity: liquidDefinition?.transfer_volume_ml ?? 1000,
      stepAmount: 100,
      targetId: "grinder",
      targetKind: "workspace_widget",
      unitLabel: "g",
    });
  };

  const handleGrinderLiquidDragStart = (
    liquid: ExperimentWorkspaceWidget["liquids"][number],
    dataTransfer: DataTransfer,
  ) => {
    if (grinderDndDisabled) {
      return;
    }

    const allowedDropTargets: DropTargetType[] = ["trash_bin"];
    const payload: WorkspaceLiquidDragPayload = {
      allowedDropTargets,
      entityKind: "liquid",
      liquidEntryId: liquid.id,
      liquidType: liquid.liquidId,
      sourceId: liquid.id,
      sourceKind: "grinder",
      widgetId: "grinder",
    };

    writeWorkspaceLiquidDragPayload(dataTransfer, payload);
    showDropTargets(allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleConfirmQuantityDraft = () => {
    if (!pendingQuantityDraft) {
      return;
    }

    if (pendingQuantityDraft.targetKind === "workspace_widget") {
      void experimentApi.addLiquidToWorkspaceWidget( {
        widget_id: pendingQuantityDraft.targetId,
        liquid_id: pendingQuantityDraft.itemId,
        volume_ml: pendingQuantityDraft.quantity,
      });
      setPendingQuantityDraft(null);
      return;
    }

    void experimentApi.addLiquidToWorkbenchTool( {
      slot_id: pendingQuantityDraft.targetId,
      liquid_id: pendingQuantityDraft.itemId,
      volume_ml: pendingQuantityDraft.quantity,
    });
    setPendingQuantityDraft(null);
  };

  const handleAddWorkbenchSlot = () => {
    void experimentApi.addWorkbenchSlot();
  };

  const handleRemoveWorkbenchSlot = (slotId: string) => {
    void experimentApi.removeWorkbenchSlot( {
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

      void experimentApi.moveToolBetweenWorkbenchSlots( {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    if ("trashToolId" in payload) {
      void experimentApi.restoreTrashedToolToWorkbenchSlot( {
        target_slot_id: targetSlotId,
        trash_tool_id: payload.trashToolId,
      });
      clearDropTargets();
      return;
    }

    void experimentApi.removeRackToolToWorkbenchSlot( {
      rack_slot_id: payload.rackSlotId,
      target_slot_id: targetSlotId,
    });
    clearDropTargets();
  };

  const handleProduceDrop = (targetSlotId: string, payload: ProduceDragPayload) => {
    if (payload.sourceKind === "basket") {
      void experimentApi.addProduceLotToWorkbenchTool( {
        slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      void experimentApi.moveProduceLotBetweenWorkbenchTools( {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "grinder") {
      void experimentApi.moveWidgetProduceLotToWorkbenchTool( {
        widget_id: "grinder",
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      void experimentApi.restoreTrashedProduceLotToWorkbenchTool( {
        target_slot_id: targetSlotId,
        trash_produce_lot_id: payload.trashProduceLotId,
      });
    }

    clearDropTargets();
  };

  const handleWorkbenchProduceLotClick = (slotId: string, produceLot: ExperimentProduceLot) => {
    if (!isKnifeMode || (produceLot.cutState ?? "whole") !== "whole") {
      return;
    }

    void experimentApi.cutWorkbenchProduceLot( {
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
      void experimentApi.discardWorkspaceWidget( {
        widget_id: widgetId,
      });
    },
    onMoveWidget: (widgetId, nextPosition) => {
      void experimentApi.moveWorkspaceWidget( {
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

    void experimentApi.addWorkspaceWidget( {
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
    if (grinderDndDisabled) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "grinder_widget")) {
      event.preventDefault();
    }
  };

  const handleGrinderDrop = (event: DragEvent<HTMLDivElement>) => {
    if (grinderDndDisabled) {
      return;
    }
    if (!hasCompatibleDropTarget(event.dataTransfer, "grinder_widget")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (toolbarPayload?.itemType === "liquid") {
      event.preventDefault();
      clearDropTargets();
      if (toolbarPayload.itemId === "dry_ice_pellets") {
        handleOpenGrinderLiquidDraft("dry_ice_pellets");
        return;
      }
      return;
    }

    const producePayload = readProduceDragPayload(event.dataTransfer);
    if (!producePayload) {
      return;
    }

    event.preventDefault();
    clearDropTargets();

    if (producePayload.sourceKind === "basket") {
      void experimentApi.addWorkspaceProduceLotToWidget( {
        widget_id: "grinder",
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "workbench" && producePayload.sourceSlotId) {
      void experimentApi.moveWorkbenchProduceLotToWidget( {
        widget_id: "grinder",
        source_slot_id: producePayload.sourceSlotId,
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "trash" && producePayload.trashProduceLotId) {
      void experimentApi.restoreTrashedProduceLotToWidget( {
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
      void experimentApi.discardSampleLabelFromPalette( {
        sample_label_id: toolbarPayload.itemId,
      });
      return;
    }

    if (toolbarPayload?.itemType === "tool") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardToolFromPalette( {
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
      void experimentApi.discardWorkspaceWidget( {
        widget_id: widgetId,
      });
      return;
    }

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardWorkbenchTool( {
        slot_id: benchToolPayload.sourceSlotId,
      });
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardRackTool( {
        rack_slot_id: rackToolPayload.rackSlotId,
      });
      return;
    }

    const workspaceLiquidPayload = readWorkspaceLiquidDragPayload(event.dataTransfer);
    if (workspaceLiquidPayload?.sourceKind === "grinder" && !isGrinderRunning) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.removeLiquidFromWorkspaceWidget( {
        widget_id: workspaceLiquidPayload.widgetId,
        liquid_entry_id: workspaceLiquidPayload.liquidEntryId,
      });
      return;
    }

    const producePayload = readProduceDragPayload(event.dataTransfer);
    if (producePayload?.sourceKind === "basket") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardWorkspaceProduceLot( {
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "grinder") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardWidgetProduceLot( {
        widget_id: "grinder",
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "workbench" && producePayload.sourceSlotId) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardProduceLotFromWorkbenchTool( {
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
      void experimentApi.discardSampleLabelFromWorkbenchTool( {
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
  const grinderLoadedLot = grinderProduceLots[0] ?? null;
  const grinderHasProduceLot = grinderProduceLots.length > 0;
  const grinderLotIsGround = (grinderLoadedLot?.cutState ?? "whole") === "ground";
  const pendingGrinderQuantityDraft =
    pendingQuantityDraft?.targetKind === "workspace_widget" &&
    pendingQuantityDraft.targetId === "grinder"
      ? pendingQuantityDraft
      : null;
  const grinderCanAttempt = grinderHasProduceLot && !grinderLotIsGround && !pendingGrinderQuantityDraft;
  const grinderLotIsWhole = (grinderLoadedLot?.cutState ?? "whole") === "whole";
  const grinderLotTemperatureC = grinderLoadedLot?.temperatureC ?? ambientTemperatureC;
  const grinderLotIsColdEnough = grinderLotTemperatureC <= grinderColdThresholdC;
  const grinderStatus = isGrinderRunning ? "running" : grinderCanAttempt ? "ready" : "idle";
  const grinderDndDisabled = isKnifeMode || isGrinderRunning;
  const handleStartGrinder = () => {
    if (!grinderCanAttempt || isGrinderRunning) {
      return;
    }

    if (grinderLotIsWhole) {
      setGrinderFeedback("overload");
      return;
    }

    if (!grinderLotIsColdEnough) {
      setGrinderFeedback("jammed");
      return;
    }

    setGrinderFeedback("neutral");
    setIsGrinderRunning(true);
    setGrinderProgressPercent(0);
    const startedAt = Date.now();
    if (grinderProgressIntervalRef.current !== null) {
      window.clearInterval(grinderProgressIntervalRef.current);
    }
    grinderProgressIntervalRef.current = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      setGrinderProgressPercent(
        Math.min((elapsedMs / grinderRunDurationMs) * 100, 100),
      );
    }, 100);
    if (grinderRunTimeoutRef.current !== null) {
      window.clearTimeout(grinderRunTimeoutRef.current);
    }
    grinderRunTimeoutRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await experimentApi.completeGrinderCycle( {
            widget_id: "grinder",
          });
        } finally {
          stopGrinderRun();
        }
      })();
    }, grinderRunDurationMs);
  };
  const grinderDisplayMode = grinderLotIsGround
    ? "complete"
    : !grinderCanAttempt
    ? "idle"
    : isGrinderRunning
      ? "running"
      : grinderFeedback === "overload"
        ? "overload"
        : grinderFeedback === "jammed"
          ? "jammed"
          : "ready";
  const grinderDisplayLabel =
    grinderDisplayMode === "running"
      ? "RUNNING"
      : grinderDisplayMode === "complete"
        ? "COMPLETE"
      : grinderDisplayMode === "overload"
        ? "OVERLOAD"
        : grinderDisplayMode === "jammed"
          ? "JAMMED"
          : grinderDisplayMode === "ready"
            ? "READY"
            : "STANDBY";

  const renderPendingBenchQuantityDraft = (slotId: string) => {
    const pendingBenchDraft =
      pendingQuantityDraft?.targetKind === "bench_slot" && pendingQuantityDraft.targetId === slotId
        ? pendingQuantityDraft
        : null;

    if (!pendingBenchDraft) {
      return null;
    }

    return (
      <QuantitySelectionCard
        ariaLabel={`${pendingBenchDraft.name} draft volume`}
        inputStep={0.1}
        onCancel={() => {
          setPendingQuantityDraft(null);
        }}
        onChange={(value) => {
          setPendingQuantityDraft((current) =>
            current
              ? {
                  ...current,
                  quantity: Math.max(value, 0),
                }
              : current,
          );
        }}
        onConfirm={handleConfirmQuantityDraft}
        stepAmount={pendingBenchDraft.stepAmount}
        title={`Dose ${pendingBenchDraft.name}`}
        unitLabel={pendingBenchDraft.unitLabel}
        value={pendingBenchDraft.quantity}
        wheelStep={1}
      />
    );
  };
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

      void experimentApi.placeWorkbenchToolInRackSlot( {
        source_slot_id: benchToolPayload.sourceSlotId,
        rack_slot_id: targetRackSlot.id,
      });
      clearDropTargets();
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload?.toolType === "sample_vial") {
      if (rackToolPayload.rackSlotId === targetRackSlot.id) {
        clearDropTargets();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void experimentApi.moveRackToolBetweenSlots( {
        source_rack_slot_id: rackToolPayload.rackSlotId,
        target_rack_slot_id: targetRackSlot.id,
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

      void experimentApi.placeToolInRackSlot( {
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

      void experimentApi.restoreTrashedToolToRackSlot( {
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

  const handleGrinderProduceDragStart = (
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => {
    if (grinderDndDisabled) {
      return;
    }
    const allowedDropTargets = getProduceLotDropTargets();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "grinder",
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "grinder",
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
    void experimentApi.createProduceLot( {
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
                          onPowerClick={handleStartGrinder}
                          powerButtonDisabled={!grinderCanAttempt || isGrinderRunning}
                          powerButtonLabel={isGrinderRunning ? "Grinder running" : "Start grinder"}
                          powerButtonTestId="grinder-power-button"
                          status={grinderStatus}
                          testId="cryogenic-grinder-illustration"
                        />
                        <div
                          className="rounded-[1rem] border border-slate-300 bg-[linear-gradient(180deg,#dce7c7,#b8c89b)] px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                          data-testid="grinder-lcd-panel"
                        >
                          <div className="flex items-center justify-start gap-3">
                            <p
                              className={`font-mono text-xs font-bold uppercase tracking-[0.28em] ${
                                grinderDisplayMode === "overload" || grinderDisplayMode === "jammed"
                                  ? "text-red-800"
                                  : grinderDisplayMode === "running"
                                    ? "text-emerald-800"
                                    : "text-slate-800"
                              }`}
                              data-testid="grinder-lcd-status"
                            >
                              {grinderDisplayLabel}
                            </p>
                          </div>
                          <div className="mt-3">
                            {grinderDisplayMode === "running" ? (
                              <div className="space-y-2">
                                <div className="h-3 overflow-hidden rounded-full border border-slate-500/30 bg-slate-900/10">
                                  <div
                                    className="h-full rounded-full bg-emerald-700 transition-[width]"
                                    data-testid="grinder-lcd-progress-bar"
                                    style={{ width: `${grinderProgressPercent}%` }}
                                  />
                                </div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-700">
                                  Progress {Math.round(grinderProgressPercent)}%
                                </p>
                              </div>
                            ) : (
                              <p
                                className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-slate-800"
                                data-testid="grinder-lcd-message"
                              >
                                {grinderDisplayMode === "overload"
                                  ? "Whole fruit detected"
                                  : grinderDisplayMode === "jammed"
                                    ? "Product not cold enough"
                                    : grinderDisplayMode === "complete"
                                      ? "Unload ground product"
                                    : grinderDisplayMode === "ready"
                                      ? "System ready"
                                      : "Awaiting load"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {grinderProduceLots.map((lot) => (
                            <DraggableInventoryItem
                              badge={
                                <div className="self-stretch flex items-center">
                                  <TemperatureIndicator
                                    temperatureC={lot.temperatureC ?? ambientTemperatureC}
                                  />
                                </div>
                              }
                              className="rounded-[0.9rem] bg-white"
                              contentClassName="flex-1"
                              dataTestId={`grinder-produce-${lot.id}`}
                              key={lot.id}
                              leading={
                                <div className="h-10 w-10 shrink-0">
                                  <AppleIllustration
                                    className="h-10 w-10"
                                    variant={lot.cutState === "whole" ? "whole" : "cut"}
                                  />
                                </div>
                              }
                              subtitle={
                                <span className="mt-1 block truncate text-xs text-slate-500">
                                  {lot.cutState === "ground"
                                    ? `Ground product • ${formatProduceLotMetadata(lot)}`
                                    : formatProduceLotMetadata(lot)}
                                </span>
                              }
                              title={
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {lot.cutState === "ground" ? `${lot.label} powder` : lot.label}
                                </span>
                              }
                              onDragEnd={grinderDndDisabled ? undefined : clearDropTargets}
                              onDragStart={
                                grinderDndDisabled
                                  ? undefined
                                  : (dataTransfer) => handleGrinderProduceDragStart(lot, dataTransfer)
                              }
                            />
                          ))}
                          {grinderLiquids.map((liquid) => (
                            <DraggableInventoryItem
                              className="rounded-[0.9rem] bg-white"
                              contentClassName="flex-1"
                              dataTestId={`grinder-liquid-${liquid.id}`}
                              key={liquid.id}
                              onDragEnd={grinderDndDisabled ? undefined : clearDropTargets}
                              onDragStart={
                                grinderDndDisabled
                                  ? undefined
                                  : (dataTransfer) => handleGrinderLiquidDragStart(liquid, dataTransfer)
                              }
                              subtitle={
                                <div className="mt-1 flex items-center justify-between gap-3">
                                  <span className="block truncate text-xs text-slate-500">
                                    Cooling medium
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-600">
                                    {liquid.volume_ml} g
                                  </span>
                                </div>
                              }
                              title={
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {liquid.name}
                                </span>
                              }
                            />
                          ))}
                          {pendingGrinderQuantityDraft ? (
                            <QuantitySelectionCard
                              ariaLabel="Dry ice draft mass"
                              inputStep={1}
                              onCancel={() => {
                                setPendingQuantityDraft(null);
                              }}
                              onChange={(value) => {
                                setPendingQuantityDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        quantity: Math.max(value, 0),
                                      }
                                    : current,
                                );
                              }}
                              onConfirm={handleConfirmQuantityDraft}
                              stepAmount={pendingGrinderQuantityDraft.stepAmount}
                              title={`Dose ${pendingGrinderQuantityDraft.name}`}
                              unitLabel={pendingGrinderQuantityDraft.unitLabel}
                              value={pendingGrinderQuantityDraft.quantity}
                              wheelStep={100}
                            />
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
                renderPendingContent={(slot) => renderPendingBenchQuantityDraft(slot.id)}
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
