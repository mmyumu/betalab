"use client";

import { useRef, useState } from "react";

import { LabSceneView } from "@/components/lab-scene-view";
import { DropDraftCard } from "@/components/drop-draft-card";
import { useAnalyticalBalanceDnd } from "@/hooks/use-analytical-balance-dnd";
import { useDragState } from "@/hooks/use-drag-state";
import { useGrinderDnd } from "@/hooks/use-grinder-dnd";
import { useGrossBalanceDnd } from "@/hooks/use-gross-balance-dnd";
import { useDropDraft } from "@/hooks/use-drop-draft";
import { useLabExperiment } from "@/hooks/use-lab-experiment";
import { useRackDnd } from "@/hooks/use-rack-dnd";
import { useActionMode } from "@/hooks/use-action-mode";
import { useTrashDnd } from "@/hooks/use-trash-dnd";
import { useWorkbenchDnd } from "@/hooks/use-workbench-dnd";
import { useWorkbenchHandlers } from "@/hooks/use-workbench-handlers";
import { useWorkspaceActions } from "@/hooks/use-workspace-actions";
import { useWorkspaceDrop } from "@/hooks/use-workspace-drop";
import {
  inferAnchoredLayout,
  useWorkspaceLayout,
} from "@/hooks/use-workspace-layout";
import {
  buildDebugProduceDraftFields,
  debugProducePresets,
  formatProduceLotMetadata,
  getApproximateToolMassG,
  getRackIllustrationSlotPosition,
  labSceneWidgetFrameSpecs,
  labSceneWidgetIds,
  labSceneWidgetTrashability,
  rackSlotCount,
  roundMass,
  type LabSceneWidgetId,
} from "@/lib/lab-scene-config";
import { getWorkspaceEquipmentWidgetId } from "@/lib/workspace-widget-ids";
import { isWorkspaceWidgetDiscardable } from "@/lib/tool-drop-targets";

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load lab scene";
type WidgetId = LabSceneWidgetId;

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
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const spatula =
    state.status === "ready"
      ? state.experiment.spatula
      : { isLoaded: false, loadedPowderMassG: 0, sourceToolId: null };

  const {
    activeActionId,
    setActiveActionId,
    dndDisabledByAction,
    isKnifeMode,
    isSpatulaMode,
    workspaceCursor,
    handleSpatulaToolCardClick,
    handleSpatulaToolIllustrationClick,
    handleSpatulaToolPointerDown,
    handleSpatulaToolPointerUp,
    spatulaCursorPosition,
    spatulaHintMessage,
    stopSpatulaPour,
  } = useActionMode({ clearDropTargets, experimentApi, spatula });

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
    getIsWidgetTrashable: (widgetId) => labSceneWidgetTrashability[widgetId],
    initialLayout: labSceneWidgetFrameSpecs,
    initialOrder: [...labSceneWidgetIds],
    onDiscardWidget: (widgetId) => {
      clearDropTargets();
      void experimentApi.discardWorkspaceWidget({ widget_id: widgetId });
    },
    onMoveWidget: (widgetId, nextPosition) => {
      void experimentApi.moveWorkspaceWidget({
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

  const { handleWorkspaceDragOver, handleWorkspaceDrop } = useWorkspaceDrop({
    clearDropTargets,
    dndDisabledByAction,
    experimentApi,
    widgetHeights,
    widgetLayout,
    workspaceRef,
  });

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mx-auto max-w-[1800px] rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Betalab</p>
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
            onClick={() => { void loadExperiment(); }}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const slots = state.experiment.workbench.slots;
  const basketTool = state.experiment.basketTool;
  const trashedProduceLots = state.experiment.trash.produceLots;
  const trashedSampleLabels = state.experiment.trash.sampleLabels;
  const trashedTools = state.experiment.trash.tools;
  const grossBalanceNetMassG =
    state.experiment.limsReception.measuredGrossMassG === null
      ? null
      : state.experiment.limsReception.measuredGrossMassG +
        state.experiment.limsReception.grossMassOffsetG;
  const trashedWidgets = state.experiment.workspace.widgets.filter(
    (widget) => isWorkspaceWidgetDiscardable(widget.id) && widget.isTrashed,
  );
  const analyticalBalanceMeasuredMassG = analyticalBalanceTool
    ? getApproximateToolMassG(analyticalBalanceTool, 3)
    : null;
  const analyticalBalanceNetMassG =
    analyticalBalanceMeasuredMassG === null ||
    state.experiment.analyticalBalance.tareMassG === null
      ? null
      : roundMass(
          analyticalBalanceMeasuredMassG - state.experiment.analyticalBalance.tareMassG,
          3,
        );

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
        onCancel={() => setPendingDropDraft(null)}
        onChangeField={handleUpdateDropDraftField}
        onConfirm={handleConfirmDropDraft}
        title={pendingBenchDraft.title}
      />
    );
  };

  const rackLoadedCount = rackSlots.filter((slot) => slot.tool).length;
  const rackOccupiedSlots = rackSlots.flatMap((slot, index) => (slot.tool ? [index + 1] : []));
  const rackOccupiedSlotLiquids = Object.fromEntries(
    rackSlots.flatMap((slot, index) => (slot.tool ? [[index + 1, slot.tool.liquids] as const] : [])),
  );
  const instrumentStatus = rackLoadedCount > 0 ? ("ready" as const) : ("idle" as const);
  const isTrashEmpty =
    trashedTools.length === 0 &&
    trashedProduceLots.length === 0 &&
    trashedSampleLabels.length === 0 &&
    trashedWidgets.length === 0;
  const debugInventoryEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_INVENTORY === "true";

  const workbenchHandlers = useWorkbenchHandlers({
    activeDragItem,
    activeDropTargets,
    clearDropTargets,
    dndDisabledByAction,
    experimentApi,
    hasPrintedLabelTicket,
    setPendingDropDraft,
  });

  const workspaceActions = useWorkspaceActions({
    analyticalBalanceTool,
    experimentApi,
    grossBalanceTool,
    grossBalanceNetMassG,
    measuredSampleMassG: state.experiment.limsReception.measuredSampleMassG,
  });

  return (
    <LabSceneView
      balances={{
        analyticalBalanceMeasuredMassG,
        analyticalBalanceNetMassG,
        grossBalanceNetMassG: grossBalanceNetMassG ?? 0,
      }}
      debug={{
        debugInventoryEnabled,
        debugProducePresets,
      }}
      display={{
        basketProduceLots: state.experiment.workspace.produceBasketLots,
        basketTool,
        rackSlots,
        slots,
        trashProduceLots: trashedProduceLots,
        trashTools: trashedTools,
        trashedSampleLabels,
        trashedWidgets,
      }}
      dnd={{
        analyticalBalance: analyticalBalanceDnd,
        clearDropTargets,
        dndDisabledByAction,
        grinder: grinderDnd,
        grossBalance: grossBalanceDnd,
        isDropTargetHighlighted,
        rack: rackDnd,
        setActiveDragItem,
        showDropTargets,
        trash: trashDnd,
        workbench: workbenchDnd,
      }}
      dropDraft={{
        handleConfirmDropDraft,
        handleUpdateDropDraftField,
        pendingDropDraft,
        renderPendingBenchDropDraft,
        setPendingDropDraft,
      }}
      experiment={state.experiment}
      rack={{
        getRackIllustrationSlotPosition,
        instrumentStatus,
        isRackSlotHighlighted: workbenchHandlers.isRackSlotHighlighted,
        rackLoadedCount,
        rackOccupiedSlotLiquids,
        rackOccupiedSlots,
        rackSlotCount,
      }}
      spatula={{
        activeActionId,
        handleSpatulaToolCardClick,
        handleSpatulaToolIllustrationClick,
        handleSpatulaToolPointerDown,
        handleSpatulaToolPointerUp,
        isSpatulaMode,
        setActiveActionId,
        spatula,
        spatulaCursorPosition,
        spatulaHintMessage,
        stopSpatulaPour,
      }}
      ui={{
        isBasketOpen,
        isCommandPending,
        isTrashEmpty,
        isTrashOpen,
        setIsBasketOpen,
        setIsTrashOpen,
        statusMessage,
      }}
      workbench={{
        canApplyLimsLabelToSlot: workbenchHandlers.canApplyLimsLabelToSlot,
        formatProduceLotMetadata,
        handleAddWorkbenchSlot: workbenchHandlers.handleAddWorkbenchSlot,
        handleApplyLimsLabelTicket: workbenchHandlers.handleApplyLimsLabelTicket,
        handleApplySampleLabel: workbenchHandlers.handleApplySampleLabel,
        handleMoveSampleLabel: workbenchHandlers.handleMoveSampleLabel,
        handleRemoveLiquid: workbenchHandlers.handleRemoveLiquid,
        handleRemoveWorkbenchSlot: workbenchHandlers.handleRemoveWorkbenchSlot,
        handleRestoreTrashedSampleLabel: workbenchHandlers.handleRestoreTrashedSampleLabel,
        handleSampleLabelTextChange: workbenchHandlers.handleSampleLabelTextChange,
        handleToggleToolSeal: workbenchHandlers.handleToggleToolSeal,
        handleToolbarItemDrop: workbenchHandlers.handleToolbarItemDrop,
        isBenchSlotHighlighted: workbenchHandlers.isBenchSlotHighlighted,
      }}
      workspace={{
        activeWidgetId,
        handleWidgetDragStart,
        handleWidgetHeightChange,
        handleWorkspaceDragOver,
        handleWorkspaceDrop,
        liveWidgetIds,
        widgetLayout,
        widgetOrder,
        workspaceCursor,
        workspaceHeight,
        workspaceRef,
      }}
      workspaceActions={workspaceActions}
    />
  );
}
