"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

import { FloatingWidget } from "@/components/floating-widget";
import { ActionBarPanel } from "@/components/action-bar-panel";
import { BenchToolCard } from "@/components/bench-tool-card";
import { CryogenicGrinderIllustration } from "@/components/illustrations/cryogenic-grinder-illustration";
import { DebugProducePalette, type DebugProducePreset } from "@/components/debug-produce-palette";
import { DropDraftCard, type DropDraftField } from "@/components/drop-draft-card";
import { GrossBalanceWidget } from "@/components/gross-balance-widget";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { LimsWidget } from "@/components/lims-widget";
import { ProduceBasketWidget } from "@/components/produce-basket-widget";
import { ProduceLotCard } from "@/components/produce-lot-card";
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
  readBasketToolDragPayload,
  readBenchToolDragPayload,
  readLimsLabelTicketDragPayload,
  readProduceDragPayload,
  readRackToolDragPayload,
  readSampleLabelDragPayload,
  readTrashToolDragPayload,
  readToolbarDragPayload,
  readWorkspaceLiquidDragPayload,
  readWorkspaceWidgetDragPayload,
  toDragDescriptor,
  writeBasketToolDragPayload,
  writeBenchToolDragPayload,
  writeLimsLabelTicketDragPayload,
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
  canToolReceiveContents,
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
  BasketToolDragPayload,
  BenchSlot,
  BenchToolDragPayload,
  BenchToolInstance,
  DragDescriptor,
  DropTargetType,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  LimsLabelTicketDragPayload,
  ProduceDragPayload,
  RackSlot,
  RackToolDragPayload,
  TrashToolDragPayload,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
  ToolType,
  ToolbarDragPayload,
  WorkspaceLiquidDragPayload,
} from "@/types/workbench";

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load lab scene";
const ambientTemperatureC = 20;
const grinderOptimalThresholdC = -40;
const grinderStartThresholdC = -20;
const grinderJamThresholdC = -10;
const widgetIds = [
  "lims",
  "workbench",
  "trash",
  "rack",
  "instrument",
  "basket",
  "grinder",
  "gross_balance",
] as const;
const workspaceEquipmentItemToWidgetId = {
  autosampler_rack_widget: "rack",
  lc_msms_instrument_widget: "instrument",
  cryogenic_grinder_widget: "grinder",
  produce_basket_widget: "basket",
  lims_terminal_widget: "lims",
  gross_balance_widget: "gross_balance",
} as const;
const widgetTrashability: Record<WidgetId, boolean> = {
  lims: false,
  workbench: false,
  trash: false,
  rack: true,
  instrument: true,
  grinder: true,
  basket: false,
  gross_balance: true,
};

type WidgetId = (typeof widgetIds)[number];
type WorkspaceEquipmentWidgetId = (typeof workspaceEquipmentItemToWidgetId)[keyof typeof workspaceEquipmentItemToWidgetId];

const widgetFrameSpecs: Record<WidgetId, WidgetLayout> = {
  lims: { x: 24, y: 886, width: 320, fallbackHeight: 320 },
  workbench: { x: 24, y: 24, width: 1105, fallbackHeight: 860 },
  trash: { x: 1276, y: 24, width: 164, fallbackHeight: 214 },
  rack: { x: 234, y: 886, width: 500, fallbackHeight: 392 },
  instrument: { x: 812, y: 886, width: 650, fallbackHeight: 392 },
  basket: { x: 1276, y: 262, width: 198, fallbackHeight: 236 },
  grinder: { x: 980, y: 886, width: 430, fallbackHeight: 340 },
  gross_balance: { x: 364, y: 886, width: 300, fallbackHeight: 280 },
};
const rackSlotCount = 12;
const debugProducePresets: DebugProducePreset[] = [
  {
    id: "apple_powder_residual_co2",
    produceLot: {
      id: "debug_preview_apple_powder_residual_co2",
      label: "Apple powder lot",
      produceType: "apple",
      totalMassG: 2450,
      unitCount: null,
      cutState: "ground",
      residualCo2MassG: 18,
      temperatureC: -62,
      grindQualityLabel: "powder_fine",
      homogeneityScore: 0.96,
    },
  },
];
const rackIllustrationViewBox = { height: 290, width: 480 };
const rackIllustrationBase = { x: 142, y: 91 };
const rackIllustrationGap = { x: 61, y: 49 };
const rackIllustrationColumns = Math.min(4, Math.max(rackSlotCount, 1));
const toolTareMassByType: Record<ToolType, number> = {
  volumetric_flask: 140,
  amber_bottle: 95,
  sample_vial: 1.5,
  beaker: 68,
  centrifuge_tube: 12,
  cleanup_tube: 7,
  cutting_board: 320,
  sample_bag: 36,
  storage_jar: 180,
};
const knifeCursor =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'%3E%3Cg transform='rotate(-142 12 12)'%3E%3Crect x='4.1' y='9.9' width='8.6' height='4.2' rx='1.2' fill='%230f172a'/%3E%3Crect x='4.1' y='9.9' width='8.6' height='4.2' rx='1.2' stroke='%230f172a' stroke-width='1.15'/%3E%3Cpath d='M12.7 9.9H15.9L19.8 12L15.9 14.1H12.7V9.9Z' fill='%23e2e8f0' stroke='%230f172a' stroke-width='1.15' stroke-linejoin='round'/%3E%3C/g%3E%3C/svg%3E\") 22 8, auto";

function isWorkspaceEquipmentWidgetId(value: WidgetId): value is WorkspaceEquipmentWidgetId {
  return (
    value === "lims" ||
    value === "rack" ||
    value === "instrument" ||
    value === "basket" ||
    value === "grinder" ||
    value === "gross_balance"
  );
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

function roundMass(massG: number) {
  return Math.round(massG * 10) / 10;
}

function getApproximateProduceMassG(produceLot: ExperimentProduceLot) {
  return roundMass(Math.max(produceLot.totalMassG, 0));
}

function getApproximateToolMassG(tool: BenchToolInstance) {
  const tareMassG = toolTareMassByType[tool.toolType] ?? 0;
  const produceMassG = (tool.produceLots ?? []).reduce((sum, lot) => sum + lot.totalMassG, 0);
  const liquidMassG = tool.liquids.reduce((sum, liquid) => sum + liquid.volume_ml, 0);
  return roundMass(Math.max(tareMassG + produceMassG + liquidMassG, 0));
}

function buildDebugProduceDraftFields(): DropDraftField[] {
  return [
    {
      ariaLabel: "Debug powder mass",
      id: "total_mass_g",
      inputStep: 10,
      label: "Mass",
      minValue: 1,
      stepAmount: 50,
      unitLabel: "g",
      value: 2450,
      wheelStep: 50,
    },
    {
      ariaLabel: "Debug powder temperature",
      id: "temperature_c",
      inputStep: 1,
      label: "Temperature",
      minValue: -120,
      stepAmount: 5,
      unitLabel: "C",
      value: -62,
      wheelStep: 5,
    },
    {
      ariaLabel: "Debug powder residual CO2",
      id: "residual_co2_mass_g",
      inputStep: 0.1,
      label: "Residual CO2",
      stepAmount: 1,
      unitLabel: "g",
      value: 18,
      wheelStep: 1,
    },
  ];
}

type LabSceneProps = {
  experimentId?: string;
};

export function LabScene({ experimentId }: LabSceneProps = {}) {
  const experimentApi = useLabExperiment({
    defaultErrorMessage,
    defaultStatusMessage,
    experimentId,
  });
  const { state, statusMessage, isCommandPending, loadExperiment } = experimentApi;
  const [pendingDropDraft, setPendingDropDraft] = useState<{
    commandType:
      | "add_liquid_to_workbench_tool"
      | "add_liquid_to_workspace_widget"
      | "create_debug_produce_lot_on_workbench"
      | "create_debug_produce_lot_to_widget";
    confirmLabel?: string;
    fields: DropDraftField[];
    itemId?: string;
    presetId?: string;
    targetId: string;
    targetKind: "bench_slot" | "workspace_widget";
    title: string;
  } | null>(null);
  const [activeDropTargets, setActiveDropTargets] = useState<DropTargetType[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<DragDescriptor | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [grinderFeedback, setGrinderFeedback] = useState<"neutral" | "overload" | "jammed">(
    "neutral",
  );
  const [balanceStagedItem, setBalanceStagedItem] = useState<
    | {
        entityKind: "tool";
        originalPayload:
          | ToolbarDragPayload
          | BenchToolDragPayload
          | BasketToolDragPayload
          | RackToolDragPayload
          | TrashToolDragPayload;
        tool: BenchToolInstance;
      }
    | {
        entityKind: "produce";
        originalPayload: ProduceDragPayload;
        produceLot: ExperimentProduceLot;
      }
    | null
  >(null);
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

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const grinder = state.experiment.workspace.widgets.find((widget) => widget.id === "grinder");
    const hasProduceLot = (grinder?.produceLots?.length ?? 0) > 0;
    const grinderDraftIsOpen =
      pendingDropDraft?.targetKind === "workspace_widget" &&
      pendingDropDraft.targetId === "grinder";

    if (!hasProduceLot || grinderDraftIsOpen) {
      setGrinderFeedback("neutral");
    }
  }, [pendingDropDraft, state]);

  useEffect(() => {
    const grinder = state.status === "ready"
      ? state.experiment.workspace.widgets.find((widget) => widget.id === "grinder")
      : null;
    const loadedLot = grinder?.produceLots?.[0] ?? null;
    const grinderDraftIsOpen =
      pendingDropDraft?.targetKind === "workspace_widget" &&
      pendingDropDraft.targetId === "grinder";

    if (!loadedLot || grinderDraftIsOpen) {
      return;
    }

    const lotIsWhole = (loadedLot.cutState ?? "whole") === "whole";
    const lotTemperatureC = loadedLot.temperatureC ?? ambientTemperatureC;

    if (!lotIsWhole && lotTemperatureC <= grinderStartThresholdC) {
      setGrinderFeedback("neutral");
    }
  }, [pendingDropDraft, state]);

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
    setPendingDropDraft({
      commandType: "add_liquid_to_workbench_tool",
      fields: [
        {
          ariaLabel: `${liquidDefinition?.name ?? "Liquid"} draft volume`,
          id: "volume_ml",
          inputStep: 0.1,
          label: "Volume",
          stepAmount: 1,
          unitLabel: "mL",
          value: liquidDefinition?.transfer_volume_ml ?? 0,
          wheelStep: 1,
        },
      ],
      itemId: payload.itemId,
      targetId: slotId,
      targetKind: "bench_slot",
      title: `Dose ${liquidDefinition?.name ?? "Liquid"}`,
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

  const handleToggleToolSeal = (slotId: string, tool: BenchToolInstance) => {
    if (tool.isSealed) {
      void experimentApi.openWorkbenchTool({
        slot_id: slotId,
      });
      return;
    }

    void experimentApi.closeWorkbenchTool({
      slot_id: slotId,
    });
  };

  const handleBalanceToolSealToggle = () => {
    if (!balanceStagedItem || balanceStagedItem.entityKind !== "tool") {
      return;
    }

    const payload = balanceStagedItem.originalPayload;
    if (payload.sourceKind !== "workbench" || !("sourceSlotId" in payload)) {
      return;
    }

    const sourceTool =
      state.status === "ready"
        ? state.experiment.workbench.slots.find((slot) => slot.id === payload.sourceSlotId)?.tool ?? null
        : null;
    if (!sourceTool) {
      return;
    }

    handleToggleToolSeal(payload.sourceSlotId, sourceTool);
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
    setPendingDropDraft({
      commandType: "add_liquid_to_workspace_widget",
      fields: [
        {
          ariaLabel: "Dry ice draft mass",
          id: "volume_ml",
          inputStep: 1,
          label: "Mass",
          stepAmount: 100,
          unitLabel: "g",
          value: liquidDefinition?.transfer_volume_ml ?? 1000,
          wheelStep: 100,
        },
      ],
      itemId: liquidId,
      targetId: "grinder",
      targetKind: "workspace_widget",
      title: `Dose ${liquidDefinition?.name ?? "Dry ice pellets"}`,
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

  const handleUpdateDropDraftField = (fieldId: string, value: number) => {
    setPendingDropDraft((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field) =>
              field.id === fieldId
                ? { ...field, value: Math.max(value, field.minValue ?? 0) }
                : field,
            ),
          }
        : current,
    );
  };

  const handleConfirmDropDraft = () => {
    if (!pendingDropDraft) {
      return;
    }

    const getFieldValue = (fieldId: string) =>
      pendingDropDraft.fields.find((field) => field.id === fieldId)?.value ?? 0;

    if (pendingDropDraft.commandType === "add_liquid_to_workspace_widget") {
      void experimentApi.addLiquidToWorkspaceWidget( {
        widget_id: pendingDropDraft.targetId,
        liquid_id: pendingDropDraft.itemId ?? "dry_ice_pellets",
        volume_ml: getFieldValue("volume_ml"),
      });
      setPendingDropDraft(null);
      return;
    }

    if (pendingDropDraft.commandType === "add_liquid_to_workbench_tool") {
      void experimentApi.addLiquidToWorkbenchTool( {
        slot_id: pendingDropDraft.targetId,
        liquid_id: pendingDropDraft.itemId ?? "",
        volume_ml: getFieldValue("volume_ml"),
      });
      setPendingDropDraft(null);
      return;
    }

    if (
      pendingDropDraft.commandType === "create_debug_produce_lot_to_widget" &&
      pendingDropDraft.presetId
    ) {
      void experimentApi.createDebugProduceLotToWidget({
        preset_id: pendingDropDraft.presetId,
        residual_co2_mass_g: getFieldValue("residual_co2_mass_g"),
        temperature_c: getFieldValue("temperature_c"),
        total_mass_g: getFieldValue("total_mass_g"),
        widget_id: pendingDropDraft.targetId,
      });
      setPendingDropDraft(null);
      return;
    }

    if (
      pendingDropDraft.commandType === "create_debug_produce_lot_on_workbench" &&
      pendingDropDraft.presetId
    ) {
      void experimentApi.createDebugProduceLotOnWorkbench({
        preset_id: pendingDropDraft.presetId,
        residual_co2_mass_g: getFieldValue("residual_co2_mass_g"),
        target_slot_id: pendingDropDraft.targetId,
        temperature_c: getFieldValue("temperature_c"),
        total_mass_g: getFieldValue("total_mass_g"),
      });
      setPendingDropDraft(null);
    }
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
    payload: BenchToolDragPayload | BasketToolDragPayload | RackToolDragPayload | TrashToolDragPayload,
  ) => {
    if (payload.sourceKind === "basket") {
      setBalanceStagedItem(null);
      void experimentApi.placeReceivedBagOnWorkbench({
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    if ("sourceSlotId" in payload) {
      if (payload.sourceSlotId === targetSlotId) {
        setBalanceStagedItem(null);
        clearDropTargets();
        return;
      }

      setBalanceStagedItem(null);
      void experimentApi.moveToolBetweenWorkbenchSlots( {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    if ("trashToolId" in payload) {
      setBalanceStagedItem(null);
      void experimentApi.restoreTrashedToolToWorkbenchSlot( {
        target_slot_id: targetSlotId,
        trash_tool_id: payload.trashToolId,
      });
      clearDropTargets();
      return;
    }

    setBalanceStagedItem(null);
    void experimentApi.removeRackToolToWorkbenchSlot( {
      rack_slot_id: payload.rackSlotId,
      target_slot_id: targetSlotId,
    });
    clearDropTargets();
  };

  const handleBasketToolDragStart = (
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets: DropTargetType[] = ["workbench_slot", "gross_balance_widget"];

    writeBasketToolDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "tool",
      sourceId: tool.id,
      sourceKind: "basket",
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "tool",
      sourceId: tool.id,
      sourceKind: "basket",
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
  };

  const handleLimsTicketDragStart = (
    ticket: NonNullable<typeof state.experiment.limsReception.printedLabelTicket>,
    dataTransfer: DataTransfer,
  ) => {
    const payload: LimsLabelTicketDragPayload = {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "lims_label_ticket",
      sourceId: ticket.id,
      sourceKind: "lims",
      ticketId: ticket.id,
      sampleCode: ticket.sampleCode,
      labelText: ticket.labelText,
    };
    writeLimsLabelTicketDragPayload(dataTransfer, payload);
    showDropTargets(payload.allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleProduceDrop = (targetSlotId: string, payload: ProduceDragPayload) => {
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      setPendingDropDraft({
        commandType: "create_debug_produce_lot_on_workbench",
        confirmLabel: "Spawn",
        fields: buildDebugProduceDraftFields(),
        presetId: payload.debugProducePresetId,
        targetId: targetSlotId,
        targetKind: "bench_slot",
        title: "Configure Apple powder",
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "basket") {
      setBalanceStagedItem(null);
      void experimentApi.addProduceLotToWorkbenchTool( {
        slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      if (payload.sourceSlotId === targetSlotId) {
        setBalanceStagedItem(null);
        clearDropTargets();
        return;
      }

      setBalanceStagedItem(null);
      void experimentApi.moveProduceLotBetweenWorkbenchTools( {
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "grinder") {
      setBalanceStagedItem(null);
      void experimentApi.moveWidgetProduceLotToWorkbenchTool( {
        widget_id: "grinder",
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      setBalanceStagedItem(null);
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
      ? state.experiment.workspace.widgets
          .filter((widget) => widget.isPresent)
          .map((widget) => widget.id)
      : [];

  const {
    activeWidgetId,
    handleWidgetDragStart,
    handleWidgetHeightChange,
    widgetHeights,
    widgetLayout,
    widgetOrder,
    workspaceHeight,
  } = useWorkspaceLayout<WidgetId>({
    fixedWidgetIds: [],
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

  const handleGrossBalanceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "gross_balance_widget")) {
      event.preventDefault();
    }
  };

  const handleGrossBalanceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isKnifeMode) {
      return;
    }
    if (!hasCompatibleDropTarget(event.dataTransfer, "gross_balance_widget")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    const toolPayload =
      (toolbarPayload?.itemType === "tool" ? toolbarPayload : null) ??
      readBenchToolDragPayload(event.dataTransfer) ??
      readBasketToolDragPayload(event.dataTransfer) ??
      readRackToolDragPayload(event.dataTransfer) ??
      readTrashToolDragPayload(event.dataTransfer);
    const producePayload = readProduceDragPayload(event.dataTransfer);
    const measuredMassG = toolPayload
      ? resolveToolMassFromPayload(toolPayload)
      : producePayload
        ? resolveProduceMassFromPayload(producePayload)
        : null;

    if (measuredMassG === null) {
      return;
    }

    if (toolPayload) {
      const tool = resolveToolFromPayload(toolPayload);
      if (tool) {
        setBalanceStagedItem({
          entityKind: "tool",
          originalPayload: toolPayload,
          tool,
        });
      }
    } else if (producePayload) {
      const produceLot = resolveProduceFromPayload(producePayload);
      if (produceLot) {
        setBalanceStagedItem({
          entityKind: "produce",
          originalPayload: producePayload,
          produceLot,
        });
      }
    }

    event.preventDefault();
    event.stopPropagation();
    clearDropTargets();
    void experimentApi.recordGrossWeight({
      measured_gross_mass_g: measuredMassG,
    });
  };

  const handleBalanceItemDragStart = (dataTransfer: DataTransfer) => {
    if (!balanceStagedItem) {
      return;
    }

    if (balanceStagedItem.entityKind === "tool") {
      const payload =
        balanceStagedItem.originalPayload.sourceKind === "workbench" &&
        "sourceSlotId" in balanceStagedItem.originalPayload
          ? {
              ...balanceStagedItem.originalPayload,
              sourceId: "gross_balance",
            }
          : balanceStagedItem.originalPayload;
      if ("itemType" in payload && payload.itemType === "tool") {
        writeToolbarDragPayload(dataTransfer, payload);
      } else if (payload.sourceKind === "basket") {
        writeBasketToolDragPayload(dataTransfer, payload);
      } else if ("sourceSlotId" in payload) {
        writeBenchToolDragPayload(dataTransfer, payload);
      } else if ("rackSlotId" in payload) {
        writeRackToolDragPayload(dataTransfer, payload);
      } else if ("trashToolId" in payload) {
        writeTrashToolDragPayload(dataTransfer, payload);
      }
      showDropTargets(payload.allowedDropTargets);
      setActiveDragItem(toDragDescriptor(payload));
      return;
    }

    const payload =
      balanceStagedItem.originalPayload.sourceKind === "workbench" &&
      balanceStagedItem.originalPayload.sourceSlotId
        ? {
            ...balanceStagedItem.originalPayload,
            sourceId: "gross_balance",
          }
        : balanceStagedItem.originalPayload;
    writeProduceDragPayload(dataTransfer, payload);
    showDropTargets(payload.allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
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

    if (producePayload.sourceKind === "debug_palette" && producePayload.debugProducePresetId) {
      setPendingDropDraft({
        commandType: "create_debug_produce_lot_to_widget",
        confirmLabel: "Spawn",
        fields: buildDebugProduceDraftFields(),
        presetId: producePayload.debugProducePresetId,
        targetId: "grinder",
        targetKind: "workspace_widget",
        title: "Configure Apple powder",
      });
      return;
    }

    if (producePayload.sourceKind === "basket") {
      setBalanceStagedItem(null);
      void experimentApi.addWorkspaceProduceLotToWidget( {
        widget_id: "grinder",
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "workbench" && producePayload.sourceSlotId) {
      setBalanceStagedItem(null);
      void experimentApi.moveWorkbenchProduceLotToWidget( {
        widget_id: "grinder",
        source_slot_id: producePayload.sourceSlotId,
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "trash" && producePayload.trashProduceLotId) {
      setBalanceStagedItem(null);
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
      setBalanceStagedItem(null);
      void experimentApi.discardWorkbenchTool( {
        slot_id: benchToolPayload.sourceSlotId,
      });
      return;
    }

    const basketToolPayload = readBasketToolDragPayload(event.dataTransfer);
    if (basketToolPayload?.toolType === "sample_bag") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      setBalanceStagedItem(null);
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
      setBalanceStagedItem(null);
      void experimentApi.discardWorkspaceProduceLot( {
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "grinder") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      setBalanceStagedItem(null);
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
      setBalanceStagedItem(null);
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
      return;
    }

    const limsTicketPayload = readLimsLabelTicketDragPayload(event.dataTransfer);
    if (limsTicketPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
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
  const basketTool = state.experiment.basketTool;
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
  const grinderLotIsWaste = (grinderLoadedLot?.cutState ?? "whole") === "waste";
  const grinderFault = grinderWidget?.grinderFault ?? null;
  const grinderRunRemainingMs = grinderWidget?.grinderRunRemainingMs ?? 0;
  const grinderRunDurationMs = grinderWidget?.grinderRunDurationMs ?? 0;
  const isGrinderRunning = grinderRunRemainingMs > 0;
  const grinderProgressPercent =
    grinderRunDurationMs > 0
      ? Math.max(0, Math.min(((grinderRunDurationMs - grinderRunRemainingMs) / grinderRunDurationMs) * 100, 100))
      : 0;
  const pendingGrinderDropDraft =
    pendingDropDraft?.targetKind === "workspace_widget" &&
    pendingDropDraft.targetId === "grinder"
      ? pendingDropDraft
      : null;
  const grinderCanAttempt =
    grinderHasProduceLot && !grinderLotIsGround && !grinderLotIsWaste && !pendingGrinderDropDraft;
  const grinderLotIsWhole = (grinderLoadedLot?.cutState ?? "whole") === "whole";
  const grinderLotTemperatureC = grinderLoadedLot?.temperatureC ?? ambientTemperatureC;
  const grinderLotIsColdEnough = grinderLotTemperatureC <= grinderStartThresholdC;
  const grinderLotIsInHighTorqueZone =
    grinderLotTemperatureC > grinderStartThresholdC && grinderLotTemperatureC < grinderJamThresholdC;
  const resolveToolMassFromPayload = (
    payload:
      | ToolbarDragPayload
      | BenchToolDragPayload
      | BasketToolDragPayload
      | RackToolDragPayload
      | TrashToolDragPayload,
  ) => {
    if ("itemType" in payload && payload.itemType === "tool") {
      return roundMass(toolTareMassByType[payload.toolType] ?? 0);
    }
    if (payload.sourceKind === "basket") {
      return basketTool ? getApproximateToolMassG(basketTool) : roundMass(toolTareMassByType[payload.toolType] ?? 0);
    }
    if ("sourceSlotId" in payload) {
      const tool = slots.find((slot) => slot.id === payload.sourceSlotId)?.tool ?? null;
      return tool ? getApproximateToolMassG(tool) : roundMass(toolTareMassByType[payload.toolType] ?? 0);
    }
    if ("rackSlotId" in payload) {
      const tool = rackSlots.find((slot) => slot.id === payload.rackSlotId)?.tool ?? null;
      return tool ? getApproximateToolMassG(tool) : roundMass(toolTareMassByType[payload.toolType] ?? 0);
    }
    if ("trashToolId" in payload) {
      const tool = trashedTools.find((entry) => entry.id === payload.trashToolId)?.tool ?? null;
      return tool ? getApproximateToolMassG(tool) : roundMass(toolTareMassByType[payload.toolType] ?? 0);
    }
    return null;
  };
  const resolveToolFromPayload = (
    payload:
      | ToolbarDragPayload
      | BenchToolDragPayload
      | BasketToolDragPayload
      | RackToolDragPayload
      | TrashToolDragPayload,
  ) => {
    if ("itemType" in payload && payload.itemType === "tool") {
      const catalogItem = labToolCatalog[payload.itemId];
      return catalogItem
        ? {
            accent: catalogItem.accent,
            capacity_ml: catalogItem.capacity_ml,
            id: payload.itemId,
            label: catalogItem.name,
            liquids: [],
            produceLots: [],
            sampleLabelText: null,
            subtitle: catalogItem.subtitle,
            toolId: payload.itemId,
            toolType: catalogItem.toolType,
          }
        : null;
    }
    if (payload.sourceKind === "basket") {
      return basketTool;
    }
    if ("sourceSlotId" in payload) {
      return slots.find((slot) => slot.id === payload.sourceSlotId)?.tool ?? null;
    }
    if ("rackSlotId" in payload) {
      return rackSlots.find((slot) => slot.id === payload.rackSlotId)?.tool ?? null;
    }
    if ("trashToolId" in payload) {
      return trashedTools.find((entry) => entry.id === payload.trashToolId)?.tool ?? null;
    }
    return null;
  };
  const resolveProduceMassFromPayload = (payload: ProduceDragPayload) => {
    if (payload.sourceKind === "basket") {
      const produceLot = state.experiment.workspace.produceLots.find((lot) => lot.id === payload.produceLotId);
      return produceLot ? getApproximateProduceMassG(produceLot) : null;
    }
    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      const slot = slots.find((entry) => entry.id === payload.sourceSlotId) ?? null;
      const produceLot =
        slot?.surfaceProduceLots?.find((lot) => lot.id === payload.produceLotId) ??
        slot?.tool?.produceLots?.find((lot) => lot.id === payload.produceLotId) ??
        null;
      return produceLot ? getApproximateProduceMassG(produceLot) : null;
    }
    if (payload.sourceKind === "grinder") {
      const produceLot = grinderProduceLots.find((lot) => lot.id === payload.produceLotId) ?? null;
      return produceLot ? getApproximateProduceMassG(produceLot) : null;
    }
    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      const produceLot =
        trashedProduceLots.find((entry) => entry.id === payload.trashProduceLotId)?.produceLot ?? null;
      return produceLot ? getApproximateProduceMassG(produceLot) : null;
    }
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      const preset = debugProducePresets.find((entry) => entry.id === payload.debugProducePresetId) ?? null;
      return preset ? getApproximateProduceMassG(preset.produceLot) : null;
    }
    return null;
  };
  const resolveProduceFromPayload = (payload: ProduceDragPayload) => {
    if (payload.sourceKind === "basket") {
      return state.experiment.workspace.produceLots.find((lot) => lot.id === payload.produceLotId) ?? null;
    }
    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      const slot = slots.find((entry) => entry.id === payload.sourceSlotId) ?? null;
      return (
        slot?.surfaceProduceLots?.find((lot) => lot.id === payload.produceLotId) ??
        slot?.tool?.produceLots?.find((lot) => lot.id === payload.produceLotId) ??
        null
      );
    }
    if (payload.sourceKind === "grinder") {
      return grinderProduceLots.find((lot) => lot.id === payload.produceLotId) ?? null;
    }
    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      return trashedProduceLots.find((entry) => entry.id === payload.trashProduceLotId)?.produceLot ?? null;
    }
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      return debugProducePresets.find((entry) => entry.id === payload.debugProducePresetId)?.produceLot ?? null;
    }
    return null;
  };
  const grinderStatus =
    isGrinderRunning && grinderFault !== "motor_jammed"
      ? "running"
      : grinderCanAttempt
        ? "ready"
        : "idle";
  const grinderDndDisabled = isKnifeMode || isGrinderRunning;
  const handleStartGrinder = () => {
    if (!grinderCanAttempt || isGrinderRunning || isCommandPending) {
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
    void experimentApi.startGrinderCycle( {
      widget_id: "grinder",
    });
  };
  const grinderDisplayMode = grinderLotIsGround
    ? "complete"
    : grinderFault === "motor_jammed"
      ? "jammed"
    : !grinderCanAttempt
    ? "idle"
    : isGrinderRunning && grinderLotIsInHighTorqueZone
      ? "warning"
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
      : grinderDisplayMode === "warning"
        ? "WARNING"
      : grinderDisplayMode === "overload"
        ? "OVERLOAD"
        : grinderDisplayMode === "jammed"
          ? "JAMMED"
          : grinderDisplayMode === "ready"
            ? "READY"
            : "STANDBY";
  const grinderInfoLine1 =
    grinderDisplayMode === "running"
      ? `Progress ${Math.round(grinderProgressPercent)}%`
      : grinderDisplayMode === "warning"
        ? `Torque high`
      : grinderDisplayMode === "ready"
        ? "RPM 00000"
        : grinderDisplayMode === "complete"
          ? "RPM 00000"
          : grinderDisplayMode === "overload"
            ? "RPM 00000"
            : grinderDisplayMode === "jammed"
              ? "RPM 00000"
              : "RPM 00000";
  const grinderInfoLine1Right =
    grinderDisplayMode === "running" || grinderDisplayMode === "warning"
      ? "RPM 10000"
      : grinderDisplayMode === "ready"
        ? "Cycle 30s"
        : "";
  const grinderInfoLine2 =
    grinderDisplayMode === "running"
      ? "Load nominal"
      : grinderDisplayMode === "warning"
        ? "Jam risk"
      : grinderDisplayMode === "ready"
        ? "Load ready"
        : grinderDisplayMode === "complete"
          ? "Rotor stopped"
          : grinderDisplayMode === "overload"
            ? "Load too high"
            : grinderDisplayMode === "jammed"
              ? "Start lock"
              : "Rotor stopped";
  const grinderInfoLine2Right =
    grinderDisplayMode === "running"
      ? "Cryo mode"
      : grinderDisplayMode === "warning"
        ? "Pre-cool now"
      : grinderDisplayMode === "ready"
        ? grinderLotTemperatureC <= grinderOptimalThresholdC
          ? "Optimal"
          : "Cryo armed"
        : grinderDisplayMode === "complete"
          ? "Unload lot"
          : grinderDisplayMode === "overload"
            ? "Cut first"
            : grinderDisplayMode === "jammed"
              ? "Pre-cool"
              : grinderHasProduceLot
                ? "Cycle ready"
                : "No sample";

  const renderPendingBenchDropDraft = (slotId: string) => {
    const pendingBenchDraft =
      pendingDropDraft?.targetKind === "bench_slot" && pendingDropDraft.targetId === slotId
        ? pendingDropDraft
        : null;

    if (!pendingBenchDraft) {
      return null;
    }

    return (
      <DropDraftCard
        confirmLabel={pendingBenchDraft.confirmLabel}
        fields={pendingBenchDraft.fields}
        onCancel={() => {
          setPendingDropDraft(null);
        }}
        onChangeField={handleUpdateDropDraftField}
        onConfirm={handleConfirmDropDraft}
        title={pendingBenchDraft.title}
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

  const handleDebugProducePresetDragStart = (
    preset: DebugProducePreset,
    dataTransfer: DataTransfer,
  ) => {
    if (isKnifeMode) {
      return;
    }
    const allowedDropTargets: DropTargetType[] = ["workbench_slot", "grinder_widget", "gross_balance_widget"];

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      debugProducePresetId: preset.id,
      entityKind: "produce",
      produceLotId: preset.id,
      produceType: preset.produceLot.produceType,
      sourceId: preset.id,
      sourceKind: "debug_palette",
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      debugProducePresetId: preset.id,
      entityKind: "produce",
      produceLotId: preset.id,
      produceType: preset.produceLot.produceType,
      sourceId: preset.id,
      sourceKind: "debug_palette",
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

  const handleCreateLimsReception = (payload: {
    harvest_date: string;
    indicative_mass_g: number;
    orchard_name: string;
  }) => {
    void experimentApi.createLimsReception({
      orchard_name: payload.orchard_name,
      harvest_date: payload.harvest_date,
      indicative_mass_g: payload.indicative_mass_g,
      measured_gross_mass_g: state.experiment.limsReception.measuredGrossMassG,
    });
  };

  const handleApplyLimsLabelTicket = (targetSlotId: string) => {
    clearDropTargets();
    void experimentApi.applyPrintedLimsLabel({
      slot_id: targetSlotId,
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
        activeDragItem.sourceKind === "basket" ||
        activeDragItem.sourceKind === "rack" ||
        activeDragItem.sourceKind === "trash"
      ) {
        return slot.tool === null && (slot.surfaceProduceLots?.length ?? 0) === 0;
      }
    }

    if (activeDragItem.entityKind === "liquid") {
      return (
        slot.tool !== null &&
        canToolAcceptLiquids(slot.tool.toolType) &&
        canToolReceiveContents(slot.tool.toolType, slot.tool.isSealed)
      );
    }

    if (activeDragItem.entityKind === "produce") {
      if (slot.tool !== null) {
        return (
          canToolAcceptProduce(slot.tool.toolType) &&
          canToolReceiveContents(slot.tool.toolType, slot.tool.isSealed) &&
          (slot.tool.produceLots?.length ?? 0) === 0
        );
      }

      return (slot.surfaceProduceLots?.length ?? 0) === 0;
    }

    if (activeDragItem.entityKind === "sample_label") {
      return slot.tool?.toolType === "sample_bag" && slot.tool.sampleLabelText === null;
    }

    if (activeDragItem.entityKind === "lims_label_ticket") {
      return (
        slot.tool?.toolType === "sample_bag" &&
        slot.tool.sampleLabelText === null &&
        state.experiment.limsReception.printedLabelTicket !== null
      );
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
  const displayBasketTool =
    balanceStagedItem?.entityKind === "tool" &&
    balanceStagedItem.originalPayload.sourceKind === "basket"
      ? null
      : basketTool;
  const displayBasketProduceLots =
    balanceStagedItem?.entityKind === "produce" &&
    balanceStagedItem.originalPayload.sourceKind === "basket"
      ? basketProduceLots.filter((lot) => lot.id !== balanceStagedItem.originalPayload.produceLotId)
      : basketProduceLots;
  const displaySlots = slots.map((slot) => {
    if (balanceStagedItem?.entityKind === "tool") {
      const payload = balanceStagedItem.originalPayload;
      if (payload.sourceKind === "workbench" && payload.sourceSlotId === slot.id) {
        return { ...slot, tool: null };
      }
    }

    if (balanceStagedItem?.entityKind === "produce") {
      const payload = balanceStagedItem.originalPayload;
      if (payload.sourceKind === "workbench" && payload.sourceSlotId === slot.id) {
        return {
          ...slot,
          surfaceProduceLots: (slot.surfaceProduceLots ?? []).filter((lot) => lot.id !== payload.produceLotId),
          tool: slot.tool
            ? {
                ...slot.tool,
                produceLots: (slot.tool.produceLots ?? []).filter((lot) => lot.id !== payload.produceLotId),
              }
            : null,
        };
      }
    }

    return slot;
  });
  const displayRackSlots =
    balanceStagedItem?.entityKind === "tool" &&
    balanceStagedItem.originalPayload.sourceKind === "rack" &&
    "rackSlotId" in balanceStagedItem.originalPayload
      ? rackSlots.map((slot) =>
          slot.id === balanceStagedItem.originalPayload.rackSlotId ? { ...slot, tool: null } : slot,
        )
      : rackSlots;
  const displayTrashTools =
    balanceStagedItem?.entityKind === "tool" &&
    balanceStagedItem.originalPayload.sourceKind === "trash" &&
    "trashToolId" in balanceStagedItem.originalPayload
      ? trashedTools.filter((entry) => entry.id !== balanceStagedItem.originalPayload.trashToolId)
      : trashedTools;
  const displayTrashProduceLots =
    balanceStagedItem?.entityKind === "produce" &&
    balanceStagedItem.originalPayload.sourceKind === "trash" &&
    balanceStagedItem.originalPayload.trashProduceLotId
      ? trashedProduceLots.filter((entry) => entry.id !== balanceStagedItem.originalPayload.trashProduceLotId)
      : trashedProduceLots;
  const displayGrinderProduceLots =
    balanceStagedItem?.entityKind === "produce" &&
    balanceStagedItem.originalPayload.sourceKind === "grinder"
      ? grinderProduceLots.filter((lot) => lot.id !== balanceStagedItem.originalPayload.produceLotId)
      : grinderProduceLots;
  const displayBalanceTool =
    balanceStagedItem?.entityKind === "tool" &&
    balanceStagedItem.originalPayload.sourceKind === "workbench" &&
    "sourceSlotId" in balanceStagedItem.originalPayload
      ? slots.find((slot) => slot.id === balanceStagedItem.originalPayload.sourceSlotId)?.tool ??
        balanceStagedItem.tool
      : balanceStagedItem?.entityKind === "tool"
        ? balanceStagedItem.tool
        : null;
  const displayBalanceProduceLot =
    balanceStagedItem?.entityKind === "produce"
      ? resolveProduceFromPayload(balanceStagedItem.originalPayload) ?? balanceStagedItem.produceLot
      : null;
  const debugInventoryEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_INVENTORY === "true";
  const grossBalanceStagedContent =
    balanceStagedItem?.entityKind === "tool" && displayBalanceTool ? (
      <div data-testid="gross-balance-staged-item">
        <BenchToolCard
          draggable
          onDragEnd={() => {
            clearDropTargets();
          }}
          onDragStart={(event) => {
            handleBalanceItemDragStart(event.dataTransfer);
          }}
          onToggleSeal={handleBalanceToolSealToggle}
          onRemoveLiquid={() => {}}
          tool={{ ...displayBalanceTool, id: `balance-${displayBalanceTool.id}` }}
        />
      </div>
    ) : balanceStagedItem?.entityKind === "produce" && displayBalanceProduceLot ? (
      <div data-testid="gross-balance-staged-item">
        <ProduceLotCard
          dataTestId={`gross-balance-produce-${displayBalanceProduceLot.id}`}
          draggable
          metadata={formatProduceLotMetadata(displayBalanceProduceLot)}
          onDragEnd={() => {
            clearDropTargets();
          }}
          onDragStart={(event) => {
            handleBalanceItemDragStart(event.dataTransfer);
          }}
          produceLot={{ ...displayBalanceProduceLot, id: `balance-${displayBalanceProduceLot.id}` }}
          variant="expanded"
        />
      </div>
    ) : null;
  const handleCreateAppleLot = () => {
    void experimentApi.createProduceLot( {
      produce_type: "apple",
    });
  };
  const workspaceCursor = activeActionId === "knife" ? knifeCursor : undefined;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full">
        <nav aria-label="Breadcrumb" className="mb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href="/"
          >
            <span aria-hidden="true">←</span>
            <span>Experiments</span>
          </Link>
        </nav>
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur xl:p-8">
          <h1 className="text-4xl font-semibold tracking-tight xl:text-[3.25rem]">
            Laboratory workspace
          </h1>
        </header>

        <div className="mt-6 grid gap-4 xl:grid-cols-[202px_minmax(0,1fr)_92px] xl:items-start xl:gap-6">
          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start" data-testid="widget-inventory">
            <div>
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
            </div>
            {debugInventoryEnabled ? (
              <div data-testid="widget-debug-inventory">
                <DebugProducePalette
                  onItemDragEnd={clearDropTargets}
                  onPresetDragStart={handleDebugProducePresetDragStart}
                  presets={debugProducePresets}
                />
              </div>
            ) : null}
          </div>

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
                trashedProduceLots={displayTrashProduceLots}
                trashedSampleLabels={trashedSampleLabels}
                trashedTools={displayTrashTools}
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
                    widgetId === "lims"
                      ? "LIMS Widget"
                      : widgetId === "rack"
                      ? "Rack Widget"
                      : widgetId === "instrument"
                        ? "Instrument Widget"
                          : widgetId === "grinder"
                            ? "Grinder Widget"
                          : widgetId === "gross_balance"
                            ? "Gross Balance Widget"
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
                  {widgetId === "lims" ? (
                    <LimsWidget
                      onCreateReception={handleCreateLimsReception}
                      onPrintLabel={() => {
                        void experimentApi.printLimsLabel();
                      }}
                      onTicketDragEnd={clearDropTargets}
                      onTicketDragStart={handleLimsTicketDragStart}
                      reception={state.experiment.limsReception}
                    />
                  ) : widgetId === "basket" ? (
                    <ProduceBasketWidget
                      basketTool={displayBasketTool}
                      dndDisabled={isKnifeMode}
                      formatProduceLotMetadata={formatProduceLotMetadata}
                      isOpen={isBasketOpen}
                      onBagDragStart={handleBasketToolDragStart}
                      onCreateAppleLot={handleCreateAppleLot}
                      onItemDragEnd={clearDropTargets}
                      onProduceDragStart={handleBasketProduceDragStart}
                      onToggle={() => setIsBasketOpen((current) => !current)}
                      produceLots={displayBasketProduceLots}
                    />
                  ) : widgetId === "gross_balance" ? (
                    <GrossBalanceWidget
                      isDropHighlighted={isDropTargetHighlighted("gross_balance_widget")}
                      measuredGrossMassG={state.experiment.limsReception.measuredGrossMassG}
                      onDragOver={handleGrossBalanceDragOver}
                      onDrop={handleGrossBalanceDrop}
                      stagedContent={grossBalanceStagedContent}
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
                      rackSlots={displayRackSlots}
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
                          powerButtonDisabled={!grinderCanAttempt || isGrinderRunning || isCommandPending}
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
                                  : grinderDisplayMode === "warning"
                                    ? "text-amber-800"
                                  : grinderDisplayMode === "running"
                                    ? "text-emerald-800"
                                    : "text-slate-800"
                              }`}
                              data-testid="grinder-lcd-status"
                            >
                              {grinderDisplayLabel}
                            </p>
                          </div>
                          <div className="mt-3 min-h-[4.8rem]">
                            <div className="grid min-h-[4.8rem] grid-rows-[auto_auto_auto] gap-1">
                              {grinderDisplayMode === "running" || grinderDisplayMode === "warning" ? (
                                <div className="h-3 overflow-hidden rounded-full border border-slate-500/30 bg-slate-900/10">
                                  <div
                                    className={`h-full rounded-full transition-[width] ${
                                      grinderDisplayMode === "warning" ? "bg-amber-700" : "bg-emerald-700"
                                    }`}
                                    data-testid="grinder-lcd-progress-bar"
                                    style={{ width: `${grinderProgressPercent}%` }}
                                  />
                                </div>
                              ) : (
                                <p
                                  className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-slate-800"
                                  data-testid="grinder-lcd-message"
                                >
                                  {grinderDisplayMode === "overload"
                                    ? "Whole fruit detected"
                                  : grinderDisplayMode === "jammed"
                                      ? grinderLotIsWaste
                                        ? "Discard jammed waste"
                                        : "Product not cold enough"
                                      : grinderDisplayMode === "warning"
                                        ? "High torque detected"
                                      : grinderDisplayMode === "complete"
                                        ? "Unload ground product"
                                        : grinderDisplayMode === "ready"
                                          ? "System ready"
                                          : "Awaiting load"}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-700">
                                <p>{grinderInfoLine1}</p>
                                <p data-testid="grinder-lcd-rpm">{grinderInfoLine1Right}</p>
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-700">
                                <p>{grinderInfoLine2}</p>
                                <p data-testid="grinder-lcd-load">{grinderInfoLine2Right}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {displayGrinderProduceLots.map((lot) => (
                            <ProduceLotCard
                              className="rounded-[0.9rem] bg-white"
                              dataTestId={`grinder-produce-${lot.id}`}
                              draggable={!grinderDndDisabled}
                              key={lot.id}
                              metadata={
                                lot.cutState === "ground"
                                  ? `Ground product • ${formatProduceLotMetadata(lot)}`
                                  : lot.cutState === "waste"
                                    ? `Jammed waste • ${formatProduceLotMetadata(lot)}`
                                    : formatProduceLotMetadata(lot)
                              }
                              onDragEnd={grinderDndDisabled ? undefined : clearDropTargets}
                              onDragStart={
                                grinderDndDisabled
                                  ? undefined
                                  : (event) => handleGrinderProduceDragStart(lot, event.dataTransfer)
                              }
                              produceLot={lot}
                              variant="expanded"
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
                          {pendingGrinderDropDraft ? (
                            <DropDraftCard
                              confirmLabel={pendingGrinderDropDraft.confirmLabel}
                              fields={pendingGrinderDropDraft.fields}
                              onCancel={() => {
                                setPendingDropDraft(null);
                              }}
                              onChangeField={handleUpdateDropDraftField}
                              onConfirm={handleConfirmDropDraft}
                              title={pendingGrinderDropDraft.title}
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
                onApplyLimsLabelTicket={(slotId) => {
                  handleApplyLimsLabelTicket(slotId);
                }}
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
                onToggleToolSeal={handleToggleToolSeal}
                renderPendingContent={(slot) => renderPendingBenchDropDraft(slot.id)}
                slots={displaySlots}
                statusMessage={statusMessage}
                onToolbarItemDrop={handleToolbarItemDrop}
              />
            </FloatingWidget>
            </div>
          </section>

          <div
            className="xl:sticky xl:top-6 xl:self-start"
            data-testid="widget-actions"
          >
            <ActionBarPanel
              activeActionId={activeActionId}
              onToggleAction={(actionId) => {
                clearDropTargets();
                setActiveActionId((current) => (current === actionId ? null : actionId));
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
