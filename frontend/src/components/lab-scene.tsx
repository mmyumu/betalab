"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

import { LabSceneView } from "@/components/lab-scene-view";
import { DropDraftCard, type DropDraftField } from "@/components/drop-draft-card";
import { type DebugProducePreset } from "@/components/debug-produce-palette";
import { useAnalyticalBalanceDnd } from "@/hooks/use-analytical-balance-dnd";
import { useDragState } from "@/hooks/use-drag-state";
import { useGrinderDnd } from "@/hooks/use-grinder-dnd";
import { useGrossBalanceDnd } from "@/hooks/use-gross-balance-dnd";
import { useDropDraft } from "@/hooks/use-drop-draft";
import { useLabExperiment } from "@/hooks/use-lab-experiment";
import { useRackDnd } from "@/hooks/use-rack-dnd";
import { useSpatulaInteraction } from "@/hooks/use-spatula-interaction";
import { useTrashDnd } from "@/hooks/use-trash-dnd";
import { useWorkbenchDnd } from "@/hooks/use-workbench-dnd";
import {
  inferAnchoredLayout,
  type WidgetLayout,
  useWorkspaceLayout,
} from "@/hooks/use-workspace-layout";
import {
  hasCompatibleDropTarget,
  readToolbarDragPayload,
  readWorkspaceWidgetDragPayload,
} from "@/lib/workbench-dnd";
import {
  getWorkspaceEquipmentWidgetId,
  isWorkspaceEquipmentWidgetId,
} from "@/lib/workspace-widget-ids";
import {
  canToolAcceptLiquids,
  canToolAcceptProduce,
  canToolReceiveContents,
  isWorkspaceWidgetDiscardable,
} from "@/lib/tool-drop-targets";
import {
  labLiquidCatalog,
} from "@/lib/lab-workflow-catalog";
import type {
  BenchLabel,
  BenchSlot,
  BenchToolInstance,
  ExperimentProduceLot,
  RackSlot,
  ToolType,
  ToolbarDragPayload,
} from "@/types/workbench";

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load lab scene";
const widgetIds = [
  "lims",
  "workbench",
  "trash",
  "rack",
  "instrument",
  "basket",
  "grinder",
  "gross_balance",
  "analytical_balance",
] as const;
const workspaceEquipmentItemToWidgetId = {
  autosampler_rack_widget: "rack",
  lc_msms_instrument_widget: "instrument",
  cryogenic_grinder_widget: "grinder",
  produce_basket_widget: "basket",
  lims_terminal_widget: "lims",
  gross_balance_widget: "gross_balance",
  analytical_balance_widget: "analytical_balance",
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
  analytical_balance: true,
};

type WidgetId = (typeof widgetIds)[number];
type WorkspaceEquipmentWidgetId = (typeof workspaceEquipmentItemToWidgetId)[keyof typeof workspaceEquipmentItemToWidgetId];

function getToolLabels(tool: BenchToolInstance | null | undefined) {
  return tool?.labels ?? [];
}

function getToolManualLabels(tool: BenchToolInstance | null | undefined) {
  return getToolLabels(tool).filter((label) => label.labelKind === "manual");
}

function getToolHasLimsLabel(tool: BenchToolInstance | null | undefined) {
  return getToolLabels(tool).some((label) => label.labelKind === "lims");
}

const widgetFrameSpecs: Record<WidgetId, WidgetLayout> = {
  lims: { x: 24, y: 886, width: 500, fallbackHeight: 320 },
  workbench: { x: 24, y: 24, width: 1105, fallbackHeight: 860 },
  trash: { x: 1276, y: 24, width: 164, fallbackHeight: 214 },
  rack: { x: 234, y: 886, width: 500, fallbackHeight: 392 },
  instrument: { x: 812, y: 886, width: 650, fallbackHeight: 392 },
  basket: { x: 1276, y: 262, width: 198, fallbackHeight: 236 },
  grinder: { x: 980, y: 886, width: 430, fallbackHeight: 340 },
  gross_balance: { x: 364, y: 886, width: 300, fallbackHeight: 280 },
  analytical_balance: { x: 688, y: 886, width: 300, fallbackHeight: 308 },
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
const spatulaCursor = "crosshair";

function getRackIllustrationSlotPosition(slotIndex: number) {
  const column = slotIndex % rackIllustrationColumns;
  const row = Math.floor(slotIndex / rackIllustrationColumns);

  return {
    left: `${(rackIllustrationBase.x + column * rackIllustrationGap.x) / rackIllustrationViewBox.width * 100}%`,
    top: `${(rackIllustrationBase.y + row * rackIllustrationGap.y) / rackIllustrationViewBox.height * 100}%`,
  };
}

function formatProduceLotMetadata(produceLot: ExperimentProduceLot) {
  return produceLot.unitCount === null
    ? ""
    : `${produceLot.unitCount} unit${produceLot.unitCount === 1 ? "" : "s"}`;
}

function roundMass(massG: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(massG * factor) / factor;
}

function getApproximateProduceMassG(produceLot: ExperimentProduceLot) {
  return roundMass(Math.max(produceLot.totalMassG, 0));
}

function getApproximateToolMassG(tool: BenchToolInstance, decimals = 1) {
  const tareMassG = toolTareMassByType[tool.toolType] ?? 0;
  const produceMassG = (tool.produceLots ?? []).reduce((sum, lot) => sum + lot.totalMassG, 0);
  const liquidMassG = tool.liquids.reduce((sum, liquid) => sum + liquid.volume_ml, 0);
  const powderMassG = tool.powderMassG ?? 0;
  return roundMass(Math.max(tareMassG + produceMassG + liquidMassG + powderMassG, 0), decimals);
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

type LabelTarget =
  | {
      kind: "workbench";
      slotId: string;
      tool: BenchToolInstance;
    }
  | {
      kind: "gross_balance";
      tool: BenchToolInstance;
    };

export function LabScene({ experimentId }: LabSceneProps = {}) {
  const experimentApi = useLabExperiment({
    defaultErrorMessage,
    defaultStatusMessage,
    experimentId,
  });
  const { state, statusMessage, isCommandPending, loadExperiment } = experimentApi;
  const {
    pendingDropDraft,
    setPendingDropDraft,
    handleUpdateDropDraftField,
    handleConfirmDropDraft,
  } = useDropDraft(experimentApi);
  const {
    activeDropTargets,
    activeDragItem,
    clearDropTargets,
    isDropTargetHighlighted,
    setActiveDragItem,
    setActiveDropTargets,
    showDropTargets,
  } = useDragState();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const isKnifeMode = activeActionId === "knife";
  const isSpatulaMode = activeActionId === "spatula";
  const dndDisabledByAction = isKnifeMode || isSpatulaMode;
  const spatula =
    state.status === "ready"
      ? state.experiment.spatula
      : {
          isLoaded: false,
          loadedPowderMassG: 0,
          sourceToolId: null,
        };

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

      const actionKey = event.key.toLowerCase();
      if (actionKey !== "k" && actionKey !== "s") {
        return;
      }

      event.preventDefault();
      clearDropTargets();
      setActiveActionId((current) =>
        current === (actionKey === "k" ? "knife" : "spatula")
          ? null
          : actionKey === "k"
            ? "knife"
            : "spatula",
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const {
    handleSpatulaToolCardClick,
    handleSpatulaToolIllustrationClick,
    handleSpatulaToolPointerDown,
    handleSpatulaToolPointerUp,
    spatulaCursorPosition,
    spatulaHintMessage,
    stopSpatulaPour,
  } = useSpatulaInteraction({
    isSpatulaMode,
    onLoadFromTool: (payload) => {
      void experimentApi.loadSpatulaFromWorkbenchTool(payload);
    },
    onPourIntoTool: (payload) => {
      void experimentApi.pourSpatulaIntoWorkbenchTool(payload);
    },
    spatula,
  });

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

  const handleSampleLabelTextChange = (slotId: string, labelId: string, sampleLabelText: string) => {
    void experimentApi.updateWorkbenchToolSampleLabelText( {
      ...(labelId.endsWith("-legacy-label") ? {} : { label_id: labelId }),
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
    if (!grossBalanceTool) {
      return;
    }
    if (grossBalanceTool.isSealed) {
      void experimentApi.openGrossBalanceTool();
      return;
    }
    void experimentApi.closeGrossBalanceTool();
  };

  const handleAnalyticalBalanceToolSealToggle = () => {
    if (!analyticalBalanceTool) {
      return;
    }
    if (analyticalBalanceTool.isSealed) {
      void experimentApi.openAnalyticalBalanceTool();
      return;
    }
    void experimentApi.closeAnalyticalBalanceTool();
  };

  const handleMoveSampleLabel = (
    targetSlotId: string,
    payload: { label?: BenchLabel; sourceSlotId?: string },
  ) => {
    if (!payload.sourceSlotId || !payload.label) {
      return;
    }
    if (payload.sourceSlotId === targetSlotId) {
      clearDropTargets();
      return;
    }

    clearDropTargets();
    void experimentApi.moveSampleLabelBetweenWorkbenchTools( {
      label_id: payload.label.id,
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

  const handleAddWorkbenchSlot = () => {
    void experimentApi.addWorkbenchSlot();
  };

  const handleRemoveWorkbenchSlot = (slotId: string) => {
    void experimentApi.removeWorkbenchSlot( {
      slot_id: slotId,
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

  const rackSlots = state.status === "ready" ? state.experiment.rack.slots : [];
  const analyticalBalanceTool =
    state.status === "ready"
      ? (state.experiment.workspace.widgets.find((w) => w.id === "analytical_balance")?.tool ?? null)
      : null;
  const grossBalanceTool =
    state.status === "ready"
      ? (state.experiment.workspace.widgets.find((w) => w.id === "gross_balance")?.tool ?? null)
      : null;
  const grossBalanceProduceLot =
    state.status === "ready"
      ? (state.experiment.workspace.widgets.find((w) => w.id === "gross_balance")?.produceLots?.[0] ?? null)
      : null;
  const hasPrintedLabelTicket =
    state.status === "ready"
      ? state.experiment.limsReception.printedLabelTicket !== null
      : false;
  const grinderWidget =
    state.status === "ready"
      ? (state.experiment.workspace.widgets.find((w) => w.id === "grinder") ?? null)
      : null;
  const rackDnd = useRackDnd({
    dndDisabledByAction,
    dragState: { clearDropTargets, setActiveDragItem, showDropTargets },
    experimentApi,
    rackSlots,
  });

  const grinderDnd = useGrinderDnd({
    buildDebugProduceDraftFields,
    dndDisabledByAction,
    dragState: { clearDropTargets, setActiveDragItem, showDropTargets },
    experimentApi,
    grinderWidget,
    isCommandPending,
    pendingDropDraft,
    setPendingDropDraft,
  });

  const grossBalanceDnd = useGrossBalanceDnd({
    buildDebugProduceDraftFields,
    dndDisabledByAction,
    dragState: { activeDropTargets, activeDragItem, clearDropTargets, setActiveDragItem, showDropTargets },
    experimentApi,
    grossBalanceProduceLot,
    grossBalanceTool,
    hasPrintedLabelTicket,
    setPendingDropDraft,
  });

  const analyticalBalanceDnd = useAnalyticalBalanceDnd({
    analyticalBalanceTool,
    dndDisabledByAction,
    dragState: { clearDropTargets, setActiveDragItem, showDropTargets },
    experimentApi,
  });

  const trashDnd = useTrashDnd({
    dndDisabledByAction,
    dragState: { clearDropTargets, setActiveDragItem, showDropTargets },
    experimentApi,
    getWorkspaceEquipmentWidgetId,
    isGrinderRunning: grinderDnd.isGrinderRunning,
  });

  const workbenchDnd = useWorkbenchDnd({
    buildDebugProduceDraftFields,
    dndDisabledByAction,
    dragState: { clearDropTargets, setActiveDragItem, showDropTargets },
    experimentApi,
    isKnifeMode,
    setPendingDropDraft,
  });

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
  const basketTool = state.experiment.basketTool;
  const trashedProduceLots = state.experiment.trash.produceLots;
  const trashedSampleLabels = state.experiment.trash.sampleLabels;
  const trashedTools = state.experiment.trash.tools;
  const grossBalanceWidget =
    state.experiment.workspace.widgets.find((widget) => widget.id === "gross_balance") ?? null;
  const analyticalBalanceWidget =
    state.experiment.workspace.widgets.find((widget) => widget.id === "analytical_balance") ?? null;
  const grossBalanceNetMassG =
    state.experiment.limsReception.measuredGrossMassG === null
      ? null
      : state.experiment.limsReception.measuredGrossMassG + state.experiment.limsReception.grossMassOffsetG;
  const trashedWidgets = state.experiment.workspace.widgets.filter(
    (widget) => isWorkspaceWidgetDiscardable(widget.id) && widget.isTrashed,
  );
  const grossBalanceProduceLots = grossBalanceWidget?.produceLots ?? [];
  const analyticalBalanceMeasuredMassG = analyticalBalanceTool
    ? getApproximateToolMassG(analyticalBalanceTool, 3)
    : null;
  const analyticalBalanceNetMassG =
    analyticalBalanceMeasuredMassG === null || state.experiment.analyticalBalance.tareMassG === null
      ? null
      : roundMass(analyticalBalanceMeasuredMassG - state.experiment.analyticalBalance.tareMassG, 3);
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

  const handleSaveLimsReception = (payload: {
    entry_id?: string;
    harvest_date: string;
    indicative_mass_g: number;
    measured_sample_mass_g: number | null;
    orchard_name: string;
  }) => {
    void experimentApi.createLimsReception({
      ...(payload.entry_id ? { entry_id: payload.entry_id } : {}),
      orchard_name: payload.orchard_name,
      harvest_date: payload.harvest_date,
      indicative_mass_g: payload.indicative_mass_g,
      measured_gross_mass_g: grossBalanceNetMassG,
      measured_sample_mass_g:
        payload.measured_sample_mass_g ?? state.experiment.limsReception.measuredSampleMassG,
    });
  };

  const handleApplyLimsLabelTicket = (payload: {
    basketBag?: true;
    grossBalanceBag?: true;
    slotId?: string;
  }) => {
    clearDropTargets();
    if (payload.basketBag) {
      void experimentApi.applyPrintedLimsLabelToBasketBag();
      return;
    }

    if (payload.grossBalanceBag) {
      void experimentApi.applyPrintedLimsLabelToGrossBalanceBag();
      return;
    }

    if (payload.slotId) {
      void experimentApi.applyPrintedLimsLabel({
        slot_id: payload.slotId,
      });
    }
  };

  const getWorkbenchLabelTarget = (slot: BenchSlot): LabelTarget | null => {
    if (!slot.tool) {
      return null;
    }

    return {
      kind: "workbench",
      slotId: slot.id,
      tool: slot.tool,
    };
  };

  const canApplyLimsTicketToLabelTarget = (target: LabelTarget | null) => {
    return target !== null && !getToolHasLimsLabel(target.tool) && hasPrintedLabelTicket;
  };

  const isBenchSlotHighlighted = (slot: BenchSlot) => {
    if (dndDisabledByAction) {
      return false;
    }
    if (!activeDragItem) {
      return false;
    }

    if (activeDragItem.entityKind === "tool") {
      if (!activeDropTargets.includes("workbench_slot")) {
        return false;
      }
      if (activeDragItem.sourceKind === "workbench") {
        return slot.tool === null && (slot.surfaceProduceLots?.length ?? 0) === 0 && slot.id !== activeDragItem.sourceId;
      }

      if (
        activeDragItem.sourceKind === "palette" ||
        activeDragItem.sourceKind === "basket" ||
        activeDragItem.sourceKind === "gross_balance" ||
        activeDragItem.sourceKind === "analytical_balance" ||
        activeDragItem.sourceKind === "rack" ||
        activeDragItem.sourceKind === "trash"
      ) {
        return slot.tool === null && (slot.surfaceProduceLots?.length ?? 0) === 0;
      }
    }

    if (activeDragItem.entityKind === "liquid") {
      if (!activeDropTargets.includes("workbench_slot")) {
        return false;
      }
      return (
        slot.tool !== null &&
        canToolAcceptLiquids(slot.tool.toolType) &&
        canToolReceiveContents(slot.tool.toolType, slot.tool.isSealed)
      );
    }

    if (activeDragItem.entityKind === "produce") {
      if (!activeDropTargets.includes("workbench_slot")) {
        return false;
      }
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
      if (!activeDropTargets.includes("workbench_slot")) {
        return false;
      }
      return slot.tool !== null;
    }

    if (activeDragItem.entityKind === "lims_label_ticket") {
      if (!activeDropTargets.includes("sample_bag_tool")) {
        return false;
      }
      return canApplyLimsTicketToLabelTarget(getWorkbenchLabelTarget(slot));
    }

    return false;
  };

  const isRackSlotHighlighted =
    !dndDisabledByAction &&
    activeDropTargets.includes("rack_slot") &&
    activeDragItem?.entityKind === "tool" &&
    activeDragItem.toolType === "sample_vial";

  const isTrashEmpty =
    trashedTools.length === 0 &&
    trashedProduceLots.length === 0 &&
    trashedSampleLabels.length === 0 &&
    trashedWidgets.length === 0;
  const basketProduceLots = state.experiment.workspace.produceBasketLots;
  const displayBasketTool = basketTool;
  const displayBasketProduceLots = basketProduceLots;
  const displaySlots = slots;
  const displayRackSlots = rackSlots;
  const displayTrashTools = trashedTools;
  const displayTrashProduceLots = trashedProduceLots;
  const debugInventoryEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_INVENTORY === "true";
  const handleCreateAppleLot = () => {
    void experimentApi.createProduceLot({ produce_type: "apple" });
  };
  const workspaceCursor =
    activeActionId === "knife"
      ? knifeCursor
      : activeActionId === "spatula"
        ? spatulaCursor
        : undefined;

  return (
    <LabSceneView
      activeActionId={activeActionId}
      analyticalBalanceDnd={analyticalBalanceDnd}
      analyticalBalanceMeasuredMassG={analyticalBalanceMeasuredMassG}
      analyticalBalanceNetMassG={analyticalBalanceNetMassG}
      activeWidgetId={activeWidgetId}
      canApplyLimsLabelToSlot={(slot) => canApplyLimsTicketToLabelTarget(getWorkbenchLabelTarget(slot))}
      clearDropTargets={clearDropTargets}
      debugInventoryEnabled={debugInventoryEnabled}
      debugProducePresets={debugProducePresets}
      displayBasketProduceLots={displayBasketProduceLots}
      displayBasketTool={displayBasketTool}
      displayRackSlots={displayRackSlots}
      displaySlots={displaySlots}
      displayTrashProduceLots={displayTrashProduceLots}
      displayTrashTools={displayTrashTools}
      dndDisabledByAction={dndDisabledByAction}
      experiment={state.experiment}
      formatProduceLotMetadata={formatProduceLotMetadata}
      getRackIllustrationSlotPosition={getRackIllustrationSlotPosition}
      grinderDnd={grinderDnd}
      grossBalanceDnd={grossBalanceDnd}
      grossBalanceNetMassG={grossBalanceNetMassG ?? 0}
      handleAddWorkbenchSlot={handleAddWorkbenchSlot}
      handleAnalyticalBalanceToolSealToggle={handleAnalyticalBalanceToolSealToggle}
      handleApplyLimsLabelTicket={handleApplyLimsLabelTicket}
      handleApplySampleLabel={handleApplySampleLabel}
      handleBalanceToolSealToggle={handleBalanceToolSealToggle}
      handleConfirmDropDraft={handleConfirmDropDraft}
      handleCreateAppleLot={handleCreateAppleLot}
      handleMoveSampleLabel={handleMoveSampleLabel}
      handleRemoveLiquid={handleRemoveLiquid}
      handleRemoveWorkbenchSlot={handleRemoveWorkbenchSlot}
      handleRestoreTrashedSampleLabel={handleRestoreTrashedSampleLabel}
      handleSampleLabelTextChange={handleSampleLabelTextChange}
      handleSaveLimsReception={handleSaveLimsReception}
      handleSpatulaToolCardClick={handleSpatulaToolCardClick}
      handleSpatulaToolIllustrationClick={handleSpatulaToolIllustrationClick}
      handleSpatulaToolPointerDown={handleSpatulaToolPointerDown}
      handleSpatulaToolPointerUp={handleSpatulaToolPointerUp}
      handleToggleToolSeal={handleToggleToolSeal}
      handleToolbarItemDrop={handleToolbarItemDrop}
      handleUpdateDropDraftField={handleUpdateDropDraftField}
      handleWidgetDragStart={handleWidgetDragStart}
      handleWidgetHeightChange={handleWidgetHeightChange}
      handleWorkspaceDragOver={handleWorkspaceDragOver}
      handleWorkspaceDrop={handleWorkspaceDrop}
      isBenchSlotHighlighted={isBenchSlotHighlighted}
      isBasketOpen={isBasketOpen}
      isCommandPending={isCommandPending}
      isDropTargetHighlighted={isDropTargetHighlighted}
      isRackSlotHighlighted={isRackSlotHighlighted}
      isSpatulaMode={isSpatulaMode}
      isTrashEmpty={isTrashEmpty}
      isTrashOpen={isTrashOpen}
      instrumentStatus={instrumentStatus}
      liveWidgetIds={liveWidgetIds}
      onCommitGrossBalanceOffset={(nextOffsetG) => {
        void experimentApi.setGrossBalanceContainerOffset({ gross_mass_offset_g: nextOffsetG });
      }}
      onPrintLimsLabel={(entryId) => {
        void experimentApi.printLimsLabel(entryId ? { entry_id: entryId } : undefined);
      }}
      onTareAnalyticalBalance={() => {
        void experimentApi.tareAnalyticalBalance();
      }}
      pendingDropDraft={pendingDropDraft}
      rackDnd={rackDnd}
      rackLoadedCount={rackLoadedCount}
      rackOccupiedSlotLiquids={rackOccupiedSlotLiquids}
      rackOccupiedSlots={rackOccupiedSlots}
      rackSlotCount={rackSlotCount}
      renderPendingBenchDropDraft={renderPendingBenchDropDraft}
      setActiveActionId={setActiveActionId}
      setActiveDragItem={setActiveDragItem}
      setIsBasketOpen={setIsBasketOpen}
      setIsTrashOpen={setIsTrashOpen}
      setPendingDropDraft={setPendingDropDraft}
      showDropTargets={showDropTargets}
      spatula={spatula}
      spatulaCursorPosition={spatulaCursorPosition}
      spatulaHintMessage={spatulaHintMessage}
      statusMessage={statusMessage}
      stopSpatulaPour={stopSpatulaPour}
      trashDnd={trashDnd}
      trashedSampleLabels={trashedSampleLabels}
      trashedWidgets={trashedWidgets}
      widgetLayout={widgetLayout}
      widgetOrder={widgetOrder}
      workbenchDnd={workbenchDnd}
      workspaceCursor={workspaceCursor}
      workspaceHeight={workspaceHeight}
      workspaceRef={workspaceRef}
    />
  );
}
