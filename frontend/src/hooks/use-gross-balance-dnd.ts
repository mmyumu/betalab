import type { DragEvent } from "react";

import {
  hasCompatibleDropTarget,
  readAnalyticalBalanceToolDragPayload,
  readBasketToolDragPayload,
  readBenchToolDragPayload,
  readGrossBalanceToolDragPayload,
  readLimsLabelTicketDragPayload,
  readProduceDragPayload,
  readRackToolDragPayload,
  readSampleLabelDragPayload,
  readToolbarDragPayload,
  readTrashToolDragPayload,
  toDragDescriptor,
  writeGrossBalanceToolDragPayload,
  writeProduceDragPayload,
} from "@/lib/workbench-dnd";
import { getProduceLotDropTargets, getToolDropTargets } from "@/lib/tool-drop-targets";
import type {
  BenchToolInstance,
  ExperimentProduceLot,
  ProduceDragPayload,
} from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type { DropDraft } from "@/hooks/use-drop-draft";
import type { DropDraftField } from "@/components/drop-draft-card";
import type {
  MoveRackToolToGrossBalancePayload,
  MoveWidgetProduceLotToGrossBalancePayload,
  MoveWorkbenchProduceLotToGrossBalancePayload,
  MoveWorkbenchToolToGrossBalancePayload,
  MoveWorkspaceProduceLotToGrossBalancePayload,
  PlaceToolOnGrossBalancePayload,
  RestoreTrashedProduceLotToGrossBalancePayload,
  RestoreTrashedToolToGrossBalancePayload,
} from "@/types/api-payloads";

type GrossBalanceDndExperimentApi = {
  applyPrintedLimsLabelToGrossBalanceBag: () => void;
  moveAnalyticalBalanceToolToGrossBalance: () => void;
  moveBasketToolToGrossBalance: () => void;
  moveGrossBalanceToolToAnalyticalBalance: () => void;
  moveRackToolToGrossBalance: (payload: MoveRackToolToGrossBalancePayload) => void;
  moveWidgetProduceLotToGrossBalance: (payload: MoveWidgetProduceLotToGrossBalancePayload) => void;
  moveWorkbenchProduceLotToGrossBalance: (payload: MoveWorkbenchProduceLotToGrossBalancePayload) => void;
  moveWorkbenchToolToGrossBalance: (payload: MoveWorkbenchToolToGrossBalancePayload) => void;
  moveWorkspaceProduceLotToGrossBalance: (payload: MoveWorkspaceProduceLotToGrossBalancePayload) => void;
  placeToolOnGrossBalance: (payload: PlaceToolOnGrossBalancePayload) => void;
  restoreTrashedProduceLotToGrossBalance: (payload: RestoreTrashedProduceLotToGrossBalancePayload) => void;
  restoreTrashedToolToGrossBalance: (payload: RestoreTrashedToolToGrossBalancePayload) => void;
};

type GrossBalanceDndOptions = {
  buildDebugProduceDraftFields: () => DropDraftField[];
  dndDisabledByAction: boolean;
  dragState: Pick<
    DragStateApi,
    | "activeDropTargets"
    | "activeDragItem"
    | "clearDropTargets"
    | "setActiveDragItem"
    | "showDropTargets"
  >;
  experimentApi: GrossBalanceDndExperimentApi;
  grossBalanceProduceLot: ExperimentProduceLot | null;
  grossBalanceTool: BenchToolInstance | null;
  hasPrintedLabelTicket: boolean;
  setPendingDropDraft: (draft: DropDraft | null) => void;
};

export type GrossBalanceDndApi = {
  handleBalanceItemDragStart: (dataTransfer: DataTransfer) => void;
  handleBalanceStagedToolDragOver: (event: DragEvent<HTMLElement>) => void;
  handleBalanceStagedToolDrop: (event: DragEvent<HTMLElement>) => void;
  handleGrossBalanceDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleGrossBalanceDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleGrossBalanceProduceLotDragStart: (
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => void;
  isGrossBalanceSampleBagHighlighted: boolean;
};

function getToolHasLimsLabel(tool: BenchToolInstance | null | undefined) {
  return (tool?.labels ?? []).some((label) => label.labelKind === "lims");
}

export function useGrossBalanceDnd({
  buildDebugProduceDraftFields,
  dndDisabledByAction,
  dragState,
  experimentApi,
  grossBalanceProduceLot,
  grossBalanceTool,
  hasPrintedLabelTicket,
  setPendingDropDraft,
}: GrossBalanceDndOptions): GrossBalanceDndApi {
  const { activeDropTargets, activeDragItem, clearDropTargets, setActiveDragItem, showDropTargets } =
    dragState;

  const getGrossBalanceLabelTarget = () => {
    if (!grossBalanceTool) {
      return null;
    }
    return { kind: "gross_balance" as const, tool: grossBalanceTool };
  };

  const canApplyLimsTicketToLabelTarget = (
    target: { tool: BenchToolInstance } | null,
  ) => {
    return target !== null && !getToolHasLimsLabel(target.tool) && hasPrintedLabelTicket;
  };

  const applyLimsTicketToGrossBalance = () => {
    clearDropTargets();
    void experimentApi.applyPrintedLimsLabelToGrossBalanceBag();
  };

  const canAcceptBalanceStagedToolDrop = (event: DragEvent<HTMLElement>) => {
    const labelTarget = getGrossBalanceLabelTarget();
    if (!labelTarget || !canApplyLimsTicketToLabelTarget(labelTarget)) {
      return false;
    }
    if (!hasCompatibleDropTarget(event.dataTransfer, "sample_bag_tool")) {
      return false;
    }
    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (toolbarPayload?.itemType === "sample_label") {
      return false;
    }
    const sampleLabelPayload = readSampleLabelDragPayload(event.dataTransfer);
    if (sampleLabelPayload?.sourceKind === "workbench" || sampleLabelPayload?.sourceKind === "trash") {
      return false;
    }
    return readLimsLabelTicketDragPayload(event.dataTransfer) !== null;
  };

  const handleGrossBalanceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (
      hasCompatibleDropTarget(event.dataTransfer, "gross_balance_widget") ||
      (canApplyLimsTicketToLabelTarget(getGrossBalanceLabelTarget()) &&
        hasCompatibleDropTarget(event.dataTransfer, "sample_bag_tool"))
    ) {
      event.preventDefault();
    }
  };

  const handleGrossBalanceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    const canDropOnBalanceWidget = hasCompatibleDropTarget(
      event.dataTransfer,
      "gross_balance_widget",
    );
    const canDropOnBalanceBag =
      canApplyLimsTicketToLabelTarget(getGrossBalanceLabelTarget()) &&
      hasCompatibleDropTarget(event.dataTransfer, "sample_bag_tool");
    if (!canDropOnBalanceWidget && !canDropOnBalanceBag) {
      return;
    }

    if (canDropOnBalanceBag) {
      const limsTicketPayload = readLimsLabelTicketDragPayload(event.dataTransfer);
      if (limsTicketPayload) {
        event.preventDefault();
        event.stopPropagation();
        applyLimsTicketToGrossBalance();
        return;
      }
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    const toolPayload =
      (toolbarPayload?.itemType === "tool" ? toolbarPayload : null) ??
      readBenchToolDragPayload(event.dataTransfer) ??
      readBasketToolDragPayload(event.dataTransfer) ??
      readRackToolDragPayload(event.dataTransfer) ??
      readAnalyticalBalanceToolDragPayload(event.dataTransfer) ??
      readTrashToolDragPayload(event.dataTransfer);
    const producePayload = readProduceDragPayload(event.dataTransfer);

    event.preventDefault();
    event.stopPropagation();
    clearDropTargets();

    if (toolbarPayload?.itemType === "tool") {
      void experimentApi.placeToolOnGrossBalance({ tool_id: toolbarPayload.itemId });
      return;
    }

    if (toolPayload) {
      if (toolPayload.sourceKind === "basket") {
        void experimentApi.moveBasketToolToGrossBalance();
        return;
      }
      if ("sourceSlotId" in toolPayload) {
        void experimentApi.moveWorkbenchToolToGrossBalance({
          source_slot_id: toolPayload.sourceSlotId,
        });
        return;
      }
      if ("rackSlotId" in toolPayload) {
        void experimentApi.moveRackToolToGrossBalance({ rack_slot_id: toolPayload.rackSlotId });
        return;
      }
      if (toolPayload.sourceKind === "analytical_balance") {
        void experimentApi.moveAnalyticalBalanceToolToGrossBalance();
        return;
      }
      if ("trashToolId" in toolPayload) {
        void experimentApi.restoreTrashedToolToGrossBalance({
          trash_tool_id: toolPayload.trashToolId,
        });
        return;
      }
    }

    if (producePayload) {
      if (producePayload.sourceKind === "basket") {
        void experimentApi.moveWorkspaceProduceLotToGrossBalance({
          produce_lot_id: producePayload.produceLotId,
        });
        return;
      }
      if (producePayload.sourceKind === "workbench" && producePayload.sourceSlotId) {
        void experimentApi.moveWorkbenchProduceLotToGrossBalance({
          source_slot_id: producePayload.sourceSlotId,
          produce_lot_id: producePayload.produceLotId,
        });
        return;
      }
      if (producePayload.sourceKind === "grinder") {
        void experimentApi.moveWidgetProduceLotToGrossBalance({
          produce_lot_id: producePayload.produceLotId,
        });
        return;
      }
      if (producePayload.sourceKind === "trash" && producePayload.trashProduceLotId) {
        void experimentApi.restoreTrashedProduceLotToGrossBalance({
          trash_produce_lot_id: producePayload.trashProduceLotId,
        });
        return;
      }
      if (producePayload.sourceKind === "debug_palette" && producePayload.debugProducePresetId) {
        setPendingDropDraft({
          commandType: "create_debug_produce_lot_to_widget",
          confirmLabel: "Spawn",
          fields: buildDebugProduceDraftFields(),
          presetId: producePayload.debugProducePresetId,
          targetId: "gross_balance",
          targetKind: "workspace_widget",
          title: "Configure Apple powder",
        });
      }
    }
  };

  const handleBalanceItemDragStart = (dataTransfer: DataTransfer) => {
    if (grossBalanceTool) {
      const allowedDropTargets = getToolDropTargets(grossBalanceTool.toolType);
      writeGrossBalanceToolDragPayload(dataTransfer, {
        allowedDropTargets,
        entityKind: "tool",
        sourceId: "gross_balance",
        sourceKind: "gross_balance",
        toolId: grossBalanceTool.toolId,
        toolType: grossBalanceTool.toolType,
      });
      showDropTargets(allowedDropTargets);
      setActiveDragItem({
        allowedDropTargets,
        entityKind: "tool",
        sourceId: "gross_balance",
        sourceKind: "gross_balance",
        toolId: grossBalanceTool.toolId,
        toolType: grossBalanceTool.toolType,
      });
      return;
    }

    if (!grossBalanceProduceLot) {
      return;
    }

    const payload: ProduceDragPayload = {
      allowedDropTargets: getProduceLotDropTargets(),
      entityKind: "produce",
      produceLotId: grossBalanceProduceLot.id,
      produceType: grossBalanceProduceLot.produceType,
      sourceId: "gross_balance",
      sourceKind: "gross_balance",
    };
    writeProduceDragPayload(dataTransfer, payload);
    showDropTargets(payload.allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleGrossBalanceProduceLotDragStart = (
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => {
    const allowedDropTargets = getProduceLotDropTargets();
    const payload: ProduceDragPayload = {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "gross_balance",
    };
    writeProduceDragPayload(dataTransfer, payload);
    showDropTargets(payload.allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleBalanceStagedToolDragOver = (event: DragEvent<HTMLElement>) => {
    if (canAcceptBalanceStagedToolDrop(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleBalanceStagedToolDrop = (event: DragEvent<HTMLElement>) => {
    const labelTarget = getGrossBalanceLabelTarget();
    if (!labelTarget || !canAcceptBalanceStagedToolDrop(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (toolbarPayload?.itemType === "sample_label") {
      return;
    }
    const sampleLabelPayload = readSampleLabelDragPayload(event.dataTransfer);
    if (sampleLabelPayload) {
      return;
    }
    const limsLabelTicketPayload = readLimsLabelTicketDragPayload(event.dataTransfer);
    if (limsLabelTicketPayload) {
      applyLimsTicketToGrossBalance();
    }
  };

  const isGrossBalanceSampleBagHighlighted =
    activeDragItem?.entityKind === "lims_label_ticket" &&
    activeDropTargets.includes("sample_bag_tool") &&
    canApplyLimsTicketToLabelTarget(getGrossBalanceLabelTarget());

  return {
    handleBalanceItemDragStart,
    handleBalanceStagedToolDragOver,
    handleBalanceStagedToolDrop,
    handleGrossBalanceDragOver,
    handleGrossBalanceDrop,
    handleGrossBalanceProduceLotDragStart,
    isGrossBalanceSampleBagHighlighted,
  };
}
