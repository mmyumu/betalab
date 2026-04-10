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
  readWorkspaceLiquidDragPayload,
  writeProduceDragPayload,
  writeSampleLabelDragPayload,
  writeTrashToolDragPayload,
  writeWorkspaceWidgetDragPayload,
} from "@/lib/workbench-dnd";
import {
  getProduceLotDropTargets,
  getSampleLabelDropTargets,
  getToolDropTargets,
  getTrashedWorkspaceWidgetDropTargets,
} from "@/lib/tool-drop-targets";
import type {
  BenchLabel,
  ExperimentWorkspaceWidget,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
} from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type {
  DiscardGrossBalanceProduceLotPayload,
  DiscardProduceLotFromWorkbenchToolPayload,
  DiscardRackToolPayload,
  DiscardSampleLabelFromWorkbenchToolPayload,
  DiscardToolFromPalettePayload,
  DiscardWidgetProduceLotPayload,
  DiscardWorkbenchToolPayload,
  DiscardWorkspaceProduceLotPayload,
  RemoveLiquidFromWorkspaceWidgetPayload,
} from "@/types/api-payloads";

type TrashDndExperimentApi = {
  discardAnalyticalBalanceTool: () => void;
  discardBasketTool: () => void;
  discardGrossBalanceProduceLot: (payload: DiscardGrossBalanceProduceLotPayload) => void;
  discardGrossBalanceTool: () => void;
  discardPrintedLimsLabel: () => void;
  discardProduceLotFromWorkbenchTool: (payload: DiscardProduceLotFromWorkbenchToolPayload) => void;
  discardRackTool: (payload: DiscardRackToolPayload) => void;
  discardSampleLabelFromPalette: () => void;
  discardSampleLabelFromWorkbenchTool: (payload: DiscardSampleLabelFromWorkbenchToolPayload) => void;
  discardToolFromPalette: (payload: DiscardToolFromPalettePayload) => void;
  discardWidgetProduceLot: (payload: DiscardWidgetProduceLotPayload) => void;
  discardWorkbenchTool: (payload: DiscardWorkbenchToolPayload) => void;
  discardWorkspaceProduceLot: (payload: DiscardWorkspaceProduceLotPayload) => void;
  removeLiquidFromWorkspaceWidget: (payload: RemoveLiquidFromWorkspaceWidgetPayload) => void;
};

type TrashDndOptions = {
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: TrashDndExperimentApi;
  isGrinderRunning: boolean;
};

export type TrashDndApi = {
  handleTrashDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  handleTrashDrop: (event: DragEvent<HTMLButtonElement>) => void;
  handleTrashProduceLotDragStart: (
    trashProduceLot: TrashProduceLotEntry,
    dataTransfer: DataTransfer,
  ) => void;
  handleTrashSampleLabelDragStart: (
    trashSampleLabel: TrashSampleLabelEntry,
    dataTransfer: DataTransfer,
  ) => void;
  handleTrashToolDragStart: (trashTool: TrashToolEntry, dataTransfer: DataTransfer) => void;
  handleTrashedWidgetDragStart: (
    widget: ExperimentWorkspaceWidget,
    dataTransfer: DataTransfer,
  ) => void;
};

export function useTrashDnd({
  dndDisabledByAction,
  dragState,
  experimentApi,
  isGrinderRunning,
}: TrashDndOptions): TrashDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const handleTrashDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "trash_bin")) {
      event.preventDefault();
    }
  };

  const handleTrashDrop = (event: DragEvent<HTMLButtonElement>) => {
    if (dndDisabledByAction) {
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
      void experimentApi.discardSampleLabelFromPalette();
      return;
    }

    if (toolbarPayload?.itemType === "tool") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardToolFromPalette({
        tool_id: toolbarPayload.itemId,
      });
      return;
    }

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardWorkbenchTool({
        slot_id: benchToolPayload.sourceSlotId,
      });
      return;
    }

    const basketToolPayload = readBasketToolDragPayload(event.dataTransfer);
    if (basketToolPayload?.toolType === "sample_bag") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardBasketTool();
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardRackTool({
        rack_slot_id: rackToolPayload.rackSlotId,
      });
      return;
    }

    const grossBalanceToolPayload = readGrossBalanceToolDragPayload(event.dataTransfer);
    if (grossBalanceToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardGrossBalanceTool();
      return;
    }

    const analyticalBalanceToolPayload = readAnalyticalBalanceToolDragPayload(event.dataTransfer);
    if (analyticalBalanceToolPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardAnalyticalBalanceTool();
      return;
    }

    const workspaceLiquidPayload = readWorkspaceLiquidDragPayload(event.dataTransfer);
    if (workspaceLiquidPayload?.sourceKind === "grinder" && !isGrinderRunning) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.removeLiquidFromWorkspaceWidget({
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
      void experimentApi.discardWorkspaceProduceLot({
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "grinder") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardWidgetProduceLot({
        widget_id: "grinder",
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "gross_balance") {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardGrossBalanceProduceLot({
        produce_lot_id: producePayload.produceLotId,
      });
      return;
    }

    if (producePayload?.sourceKind === "workbench" && producePayload.sourceSlotId) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardProduceLotFromWorkbenchTool({
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
      void experimentApi.discardSampleLabelFromWorkbenchTool({
        ...(sampleLabelPayload.sampleLabelId.endsWith("-legacy-label")
          ? {}
          : { label_id: sampleLabelPayload.sampleLabelId }),
        slot_id: sampleLabelPayload.sourceSlotId,
      });
      return;
    }

    const limsTicketPayload = readLimsLabelTicketDragPayload(event.dataTransfer);
    if (limsTicketPayload) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();
      void experimentApi.discardPrintedLimsLabel();
    }
  };

  const handleTrashToolDragStart = (trashTool: TrashToolEntry, dataTransfer: DataTransfer) => {
    if (dndDisabledByAction) {
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
    if (dndDisabledByAction) {
      return;
    }
    const allowedDropTargets = getTrashedWorkspaceWidgetDropTargets();

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
    if (dndDisabledByAction) {
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

  const handleTrashSampleLabelDragStart = (
    trashSampleLabel: TrashSampleLabelEntry,
    dataTransfer: DataTransfer,
  ) => {
    if (dndDisabledByAction) {
      return;
    }
    const label =
      trashSampleLabel.label ??
      ({
        id: trashSampleLabel.id,
        labelKind: "manual",
        text:
          (trashSampleLabel as TrashSampleLabelEntry & { sampleLabelText?: string })
            .sampleLabelText ?? "",
        receivedDate: null,
        sampleCode: null,
      } satisfies BenchLabel);
    const allowedDropTargets = getSampleLabelDropTargets();

    writeSampleLabelDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "sample_label",
      label,
      sampleLabelId: trashSampleLabel.id,
      sampleLabelText: label.text,
      sourceId: trashSampleLabel.id,
      sourceKind: "trash",
      trashSampleLabelId: trashSampleLabel.id,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "sample_label",
      label,
      sampleLabelId: trashSampleLabel.id,
      sampleLabelText: label.text,
      sourceId: trashSampleLabel.id,
      sourceKind: "trash",
      trashSampleLabelId: trashSampleLabel.id,
    });
  };

  return {
    handleTrashDragOver,
    handleTrashDrop,
    handleTrashProduceLotDragStart,
    handleTrashSampleLabelDragStart,
    handleTrashToolDragStart,
    handleTrashedWidgetDragStart,
  };
}
