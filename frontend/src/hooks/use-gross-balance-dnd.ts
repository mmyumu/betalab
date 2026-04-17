import type { DragEvent } from "react";

import { canResolveActiveLabelDragOnTool, canResolveLabelDropOnTool, readLabelDragPayload } from "@/lib/label-drop-resolver";
import {
  hasCompatibleDropTarget,
  readAnalyticalBalanceToolDragPayload,
  readBasketToolDragPayload,
  readBenchToolDragPayload,
  readProduceDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
  readTrashToolDragPayload,
  toDragDescriptor,
  writeGrossBalanceToolDragPayload,
  writeProduceDragPayload,
} from "@/lib/workbench-dnd";
import type {
  BenchToolInstance,
  ExperimentProduceLot,
  ProduceDragPayload,
} from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type { DropDraft } from "@/hooks/use-drop-draft";
import type { DropDraftField } from "@/components/drop-draft-card";
import type {
  BasketToolReferencePayload,
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
  applySampleLabelToGrossBalanceTool: () => void;
  moveAnalyticalBalanceToolToGrossBalance: () => void;
  moveBasketToolToGrossBalance: (payload: BasketToolReferencePayload) => void;
  moveGrossBalanceToolToAnalyticalBalance: () => void;
  moveRackToolToGrossBalance: (payload: MoveRackToolToGrossBalancePayload) => void;
  moveWorkbenchSampleLabelToGrossBalance: (payload: {
    source_slot_id: string;
    label_id: string;
  }) => void;
  moveWidgetProduceLotToGrossBalance: (payload: MoveWidgetProduceLotToGrossBalancePayload) => void;
  moveWorkbenchProduceLotToGrossBalance: (payload: MoveWorkbenchProduceLotToGrossBalancePayload) => void;
  moveWorkbenchToolToGrossBalance: (payload: MoveWorkbenchToolToGrossBalancePayload) => void;
  moveWorkspaceProduceLotToGrossBalance: (payload: MoveWorkspaceProduceLotToGrossBalancePayload) => void;
  placeToolOnGrossBalance: (payload: PlaceToolOnGrossBalancePayload) => void;
  restoreTrashedProduceLotToGrossBalance: (payload: RestoreTrashedProduceLotToGrossBalancePayload) => void;
  restoreTrashedSampleLabelToGrossBalance: (payload: {
    trash_sample_label_id: string;
  }) => void;
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

export function useGrossBalanceDnd({
  buildDebugProduceDraftFields,
  dndDisabledByAction,
  dragState,
  experimentApi,
  grossBalanceProduceLot,
  grossBalanceTool,
  hasPrintedLabelTicket: _hasPrintedLabelTicket,
  setPendingDropDraft,
}: GrossBalanceDndOptions): GrossBalanceDndApi {
  const { activeDragItem, clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const applyLimsTicketToGrossBalance = () => {
    clearDropTargets();
    void experimentApi.applyPrintedLimsLabelToGrossBalanceBag();
  };

  const canAcceptBalanceStagedToolDrop = (event: DragEvent<HTMLElement>) => {
    return canResolveLabelDropOnTool(event.dataTransfer, {
      parentDropTargetTypes: ["gross_balance_widget"],
      tool: grossBalanceTool,
    });
  };

  const handleGrossBalanceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (canResolveLabelDropOnTool(event.dataTransfer, {
      parentDropTargetTypes: ["gross_balance_widget"],
      tool: grossBalanceTool,
    })) {
      event.preventDefault();
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "gross_balance_widget")) {
      event.preventDefault();
    }
  };

  const handleGrossBalanceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    const labelDragPayload = readLabelDragPayload(event.dataTransfer);
    if (
      labelDragPayload &&
      canResolveLabelDropOnTool(event.dataTransfer, {
        parentDropTargetTypes: ["gross_balance_widget"],
        tool: grossBalanceTool,
      })
    ) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();

      if (labelDragPayload.kind === "lims_label_ticket") {
        applyLimsTicketToGrossBalance();
        return;
      }
      if (labelDragPayload.kind === "palette_sample_label") {
        void experimentApi.applySampleLabelToGrossBalanceTool();
        return;
      }
      if (labelDragPayload.kind === "workbench_sample_label") {
        void experimentApi.moveWorkbenchSampleLabelToGrossBalance({
          source_slot_id: labelDragPayload.payload.sourceSlotId!,
          label_id: labelDragPayload.payload.sampleLabelId,
        });
        return;
      }
      void experimentApi.restoreTrashedSampleLabelToGrossBalance({
        trash_sample_label_id: labelDragPayload.payload.trashSampleLabelId!,
      });
      return;
    }

    const canDropOnBalanceWidget = hasCompatibleDropTarget(event.dataTransfer, "gross_balance_widget");
    if (!canDropOnBalanceWidget) {
      return;
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
        void experimentApi.moveBasketToolToGrossBalance({ tool_id: toolPayload.sourceId });
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
      if (grossBalanceTool.isDraggable === false) {
        return;
      }
      const allowedDropTargets = grossBalanceTool.allowedDropTargets ?? [];
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
      allowedDropTargets: grossBalanceProduceLot.allowedDropTargets ?? [],
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
    const payload: ProduceDragPayload = {
      allowedDropTargets: produceLot.allowedDropTargets ?? [],
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
    if (!canAcceptBalanceStagedToolDrop(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    clearDropTargets();

    const labelDragPayload = readLabelDragPayload(event.dataTransfer);
    if (labelDragPayload?.kind === "lims_label_ticket") {
      applyLimsTicketToGrossBalance();
      return;
    }
    if (labelDragPayload?.kind === "palette_sample_label") {
      void experimentApi.applySampleLabelToGrossBalanceTool();
      return;
    }
    if (labelDragPayload?.kind === "workbench_sample_label") {
      void experimentApi.moveWorkbenchSampleLabelToGrossBalance({
        source_slot_id: labelDragPayload.payload.sourceSlotId!,
        label_id: labelDragPayload.payload.sampleLabelId,
      });
      return;
    }
    if (labelDragPayload?.kind === "trash_sample_label") {
      void experimentApi.restoreTrashedSampleLabelToGrossBalance({
        trash_sample_label_id: labelDragPayload.payload.trashSampleLabelId!,
      });
    }
  };

  const isGrossBalanceSampleBagHighlighted =
    canResolveActiveLabelDragOnTool(activeDragItem, {
      parentDropTargetTypes: ["gross_balance_widget"],
      tool: grossBalanceTool,
    });

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
