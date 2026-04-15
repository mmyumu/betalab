import { useEffect, useState } from "react";
import type { DragEvent } from "react";

import {
  hasCompatibleDropTarget,
  readProduceDragPayload,
  readToolbarDragPayload,
  toDragDescriptor,
  writeProduceDragPayload,
  writeWorkspaceLiquidDragPayload,
} from "@/lib/workbench-dnd";
import { labLiquidCatalog } from "@/lib/lab-workflow-catalog";
import type {
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  LiquidType,
  WorkspaceLiquidDragPayload,
} from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type { DropDraft } from "@/hooks/use-drop-draft";
import type { DropDraftField } from "@/components/drop-draft-card";
import type {
  AddWorkspaceProduceLotToWidgetPayload,
  MoveGrossBalanceProduceLotToWidgetPayload,
  MoveWorkbenchProduceLotToWidgetPayload,
  RestoreTrashedProduceLotToWidgetPayload,
  StartGrinderCyclePayload,
} from "@/types/api-payloads";

const ambientTemperatureC = 20;
const grinderOptimalThresholdC = -40;
const grinderStartThresholdC = -20;
const grinderJamThresholdC = -10;

type GrinderDndExperimentApi = {
  addWorkspaceProduceLotToWidget: (payload: AddWorkspaceProduceLotToWidgetPayload) => void;
  moveGrossBalanceProduceLotToWidget: (payload: MoveGrossBalanceProduceLotToWidgetPayload) => void;
  moveWorkbenchProduceLotToWidget: (payload: MoveWorkbenchProduceLotToWidgetPayload) => void;
  restoreTrashedProduceLotToWidget: (payload: RestoreTrashedProduceLotToWidgetPayload) => void;
  startGrinderCycle: (payload: StartGrinderCyclePayload) => void;
};

type GrinderDndOptions = {
  buildDebugProduceDraftFields: () => DropDraftField[];
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: GrinderDndExperimentApi;
  grinderWidget: ExperimentWorkspaceWidget | null;
  isCommandPending: boolean;
  pendingDropDraft: DropDraft | null;
  setPendingDropDraft: (draft: DropDraft | null) => void;
};

export type GrinderDndApi = {
  grinderCanAttempt: boolean;
  grinderDisplayLabel: string;
  grinderDisplayMode: string;
  grinderDndDisabled: boolean;
  grinderInfoLine1: string;
  grinderInfoLine1Right: string;
  grinderInfoLine2: string;
  grinderInfoLine2Right: string;
  grinderLiquids: NonNullable<ExperimentWorkspaceWidget["liquids"]>;
  grinderProduceLots: ExperimentProduceLot[];
  grinderProgressPercent: number;
  grinderStatus: "running" | "ready" | "idle";
  handleGrinderDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleGrinderDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleGrinderLiquidDragStart: (
    liquid: NonNullable<ExperimentWorkspaceWidget["liquids"]>[number],
    dataTransfer: DataTransfer,
  ) => void;
  handleGrinderProduceDragStart: (
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => void;
  handleStartGrinder: () => void;
  grinderLotIsWaste: boolean;
  isGrinderRunning: boolean;
  pendingGrinderDropDraft: DropDraft | null;
};

type GrinderDisplayMode =
  | "complete"
  | "idle"
  | "jammed"
  | "overload"
  | "ready"
  | "running"
  | "warning";

export function useGrinderDnd({
  buildDebugProduceDraftFields,
  dndDisabledByAction,
  dragState,
  experimentApi,
  grinderWidget,
  isCommandPending,
  pendingDropDraft,
  setPendingDropDraft,
}: GrinderDndOptions): GrinderDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;
  const [grinderFeedback, setGrinderFeedback] = useState<"neutral" | "overload" | "jammed">(
    "neutral",
  );

  const grinderProduceLots = grinderWidget?.produceLots ?? [];
  const grinderLiquids: NonNullable<ExperimentWorkspaceWidget["liquids"]> =
    grinderWidget?.liquids ?? [];
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
      ? Math.max(
          0,
          Math.min(
            ((grinderRunDurationMs - grinderRunRemainingMs) / grinderRunDurationMs) * 100,
            100,
          ),
        )
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
    grinderLotTemperatureC > grinderStartThresholdC &&
    grinderLotTemperatureC < grinderJamThresholdC;
  const grinderDndDisabled = dndDisabledByAction || isGrinderRunning;

  useEffect(() => {
    const hasProduceLot = (grinderWidget?.produceLots?.length ?? 0) > 0;
    const grinderDraftIsOpen =
      pendingDropDraft?.targetKind === "workspace_widget" &&
      pendingDropDraft.targetId === "grinder";
    if (!hasProduceLot || grinderDraftIsOpen) {
      setGrinderFeedback("neutral");
    }
  }, [pendingDropDraft, grinderWidget]);

  useEffect(() => {
    const loadedLot = grinderWidget?.produceLots?.[0] ?? null;
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
  }, [pendingDropDraft, grinderWidget]);

  const grinderStatus: "running" | "ready" | "idle" =
    isGrinderRunning && grinderFault !== "motor_jammed"
      ? "running"
      : grinderCanAttempt
        ? "ready"
        : "idle";

  const grinderDisplayMode: GrinderDisplayMode = grinderLotIsGround
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
        ? "Torque high"
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
    liquid: NonNullable<ExperimentWorkspaceWidget["liquids"]>[number],
    dataTransfer: DataTransfer,
  ) => {
    if (grinderDndDisabled) {
      return;
    }
    const allowedDropTargets = ["trash_bin"] as const;
    const payload: WorkspaceLiquidDragPayload = {
      allowedDropTargets: [...allowedDropTargets],
      entityKind: "liquid",
      liquidEntryId: liquid.id,
      liquidType: liquid.liquidId as LiquidType,
      sourceId: liquid.id,
      sourceKind: "grinder",
      widgetId: "grinder",
    };
    writeWorkspaceLiquidDragPayload(dataTransfer, payload);
    showDropTargets([...allowedDropTargets]);
    setActiveDragItem(toDragDescriptor(payload));
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
      void experimentApi.addWorkspaceProduceLotToWidget({
        widget_id: "grinder",
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "workbench" && producePayload.sourceSlotId) {
      void experimentApi.moveWorkbenchProduceLotToWidget({
        widget_id: "grinder",
        source_slot_id: producePayload.sourceSlotId,
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "gross_balance") {
      void experimentApi.moveGrossBalanceProduceLotToWidget({
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload.sourceKind === "trash" && producePayload.trashProduceLotId) {
      void experimentApi.restoreTrashedProduceLotToWidget({
        widget_id: "grinder",
        trash_produce_lot_id: producePayload.trashProduceLotId,
      });
    }
  };

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
    void experimentApi.startGrinderCycle({ widget_id: "grinder" });
  };

  const handleGrinderProduceDragStart = (
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => {
    if (grinderDndDisabled) {
      return;
    }
    const allowedDropTargets = produceLot.allowedDropTargets ?? [];
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

  return {
    grinderCanAttempt,
    grinderDisplayLabel,
    grinderDisplayMode,
    grinderDndDisabled,
    grinderInfoLine1,
    grinderInfoLine1Right,
    grinderInfoLine2,
    grinderInfoLine2Right,
    grinderLiquids,
    grinderProduceLots,
    grinderProgressPercent,
    grinderStatus,
    handleGrinderDragOver,
    handleGrinderDrop,
    handleGrinderLiquidDragStart,
    handleGrinderProduceDragStart,
    handleStartGrinder,
    grinderLotIsWaste,
    isGrinderRunning,
    pendingGrinderDropDraft,
  };
}
