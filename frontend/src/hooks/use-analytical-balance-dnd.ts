import type { DragEvent } from "react";

import {
  hasCompatibleDropTarget,
  readAnalyticalBalanceToolDragPayload,
  readBenchToolDragPayload,
  readGrossBalanceToolDragPayload,
  readLimsLabelTicketDragPayload,
  readRackToolDragPayload,
  readSampleLabelDragPayload,
  readToolbarDragPayload,
  readTrashToolDragPayload,
  toDragDescriptor,
  writeAnalyticalBalanceToolDragPayload,
} from "@/lib/workbench-dnd";
import { getToolDropTargets } from "@/lib/tool-drop-targets";
import type { AnalyticalBalanceToolDragPayload, BenchToolInstance } from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type {
  MoveRackToolToAnalyticalBalancePayload,
  MoveWorkbenchToolToAnalyticalBalancePayload,
  PlaceToolOnAnalyticalBalancePayload,
  RestoreTrashedToolToAnalyticalBalancePayload,
} from "@/types/api-payloads";

type AnalyticalBalanceDndExperimentApi = {
  applyPrintedLimsLabelToAnalyticalBalanceTool: () => void;
  applySampleLabelToAnalyticalBalanceTool: () => void;
  moveGrossBalanceToolToAnalyticalBalance: () => void;
  moveRackToolToAnalyticalBalance: (payload: MoveRackToolToAnalyticalBalancePayload) => void;
  moveWorkbenchSampleLabelToAnalyticalBalance: (payload: {
    source_slot_id: string;
    label_id: string;
  }) => void;
  moveWorkbenchToolToAnalyticalBalance: (payload: MoveWorkbenchToolToAnalyticalBalancePayload) => void;
  placeToolOnAnalyticalBalance: (payload: PlaceToolOnAnalyticalBalancePayload) => void;
  restoreTrashedSampleLabelToAnalyticalBalance: (payload: {
    trash_sample_label_id: string;
  }) => void;
  restoreTrashedToolToAnalyticalBalance: (payload: RestoreTrashedToolToAnalyticalBalancePayload) => void;
  updateAnalyticalBalanceToolSampleLabelText: (payload: {
    label_id: string;
    sample_label_text: string;
  }) => void;
};

type AnalyticalBalanceDndOptions = {
  analyticalBalanceTool: BenchToolInstance | null;
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: AnalyticalBalanceDndExperimentApi;
  hasPrintedLabelTicket: boolean;
};

export type AnalyticalBalanceDndApi = {
  handleAnalyticalBalanceDragOver: (event: DragEvent<HTMLElement>) => void;
  handleAnalyticalBalanceDrop: (event: DragEvent<HTMLElement>) => void;
  handleAnalyticalBalanceItemDragStart: (dataTransfer: DataTransfer) => void;
  handleAnalyticalBalanceSampleLabelTextChange: (
    labelId: string,
    sampleLabelText: string,
  ) => void;
};

export function useAnalyticalBalanceDnd({
  analyticalBalanceTool,
  dndDisabledByAction,
  dragState,
  experimentApi,
  hasPrintedLabelTicket,
}: AnalyticalBalanceDndOptions): AnalyticalBalanceDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;
  const toolHasLimsLabel =
    analyticalBalanceTool !== null &&
    (analyticalBalanceTool.labels ?? []).some((label) => label.labelKind === "lims");

  const handleAnalyticalBalanceDragOver = (event: DragEvent<HTMLElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    const sampleLabelPayload = readSampleLabelDragPayload(event.dataTransfer);
    const limsTicketPayload = readLimsLabelTicketDragPayload(event.dataTransfer);
    const isSampleLabelDrag =
      toolbarPayload?.itemType === "sample_label" || sampleLabelPayload !== null;
    if (isSampleLabelDrag && analyticalBalanceTool === null) {
      return;
    }
    if (
      limsTicketPayload &&
      hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")
    ) {
      if (analyticalBalanceTool !== null && hasPrintedLabelTicket && !toolHasLimsLabel) {
        event.preventDefault();
      }
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")) {
      event.preventDefault();
    }
  };

  const handleAnalyticalBalanceDrop = (event: DragEvent<HTMLElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (!hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    const sampleLabelPayload = readSampleLabelDragPayload(event.dataTransfer);
    const limsTicketPayload = readLimsLabelTicketDragPayload(event.dataTransfer);

    if (limsTicketPayload && analyticalBalanceTool === null) {
      return;
    }

    if (analyticalBalanceTool !== null) {
      if (limsTicketPayload && hasPrintedLabelTicket && !toolHasLimsLabel) {
        event.preventDefault();
        event.stopPropagation();
        clearDropTargets();
        void experimentApi.applyPrintedLimsLabelToAnalyticalBalanceTool();
        return;
      }

      if (toolbarPayload?.itemType === "sample_label") {
        event.preventDefault();
        event.stopPropagation();
        clearDropTargets();
        void experimentApi.applySampleLabelToAnalyticalBalanceTool();
        return;
      }

      if (sampleLabelPayload?.sourceKind === "workbench" && sampleLabelPayload.sourceSlotId) {
        event.preventDefault();
        event.stopPropagation();
        clearDropTargets();
        void experimentApi.moveWorkbenchSampleLabelToAnalyticalBalance({
          source_slot_id: sampleLabelPayload.sourceSlotId,
          label_id: sampleLabelPayload.sampleLabelId,
        });
        return;
      }

      if (sampleLabelPayload?.sourceKind === "trash" && sampleLabelPayload.trashSampleLabelId) {
        event.preventDefault();
        event.stopPropagation();
        clearDropTargets();
        void experimentApi.restoreTrashedSampleLabelToAnalyticalBalance({
          trash_sample_label_id: sampleLabelPayload.trashSampleLabelId,
        });
        return;
      }
    }

    const toolPayload =
      (toolbarPayload?.itemType === "tool" ? toolbarPayload : null) ??
      readBenchToolDragPayload(event.dataTransfer) ??
      readGrossBalanceToolDragPayload(event.dataTransfer) ??
      readRackToolDragPayload(event.dataTransfer) ??
      readTrashToolDragPayload(event.dataTransfer) ??
      readAnalyticalBalanceToolDragPayload(event.dataTransfer);

    if (!toolPayload) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearDropTargets();

    if (toolbarPayload?.itemType === "tool") {
      void experimentApi.placeToolOnAnalyticalBalance({
        tool_id: toolbarPayload.itemId,
      });
      return;
    }

    if (toolPayload.sourceKind === "workbench" && "sourceSlotId" in toolPayload) {
      void experimentApi.moveWorkbenchToolToAnalyticalBalance({
        source_slot_id: toolPayload.sourceSlotId,
      });
      return;
    }

    if (toolPayload.sourceKind === "rack" && "rackSlotId" in toolPayload) {
      void experimentApi.moveRackToolToAnalyticalBalance({
        rack_slot_id: toolPayload.rackSlotId,
      });
      return;
    }

    if (toolPayload.sourceKind === "gross_balance") {
      void experimentApi.moveGrossBalanceToolToAnalyticalBalance();
      return;
    }

    if (toolPayload.sourceKind === "trash" && "trashToolId" in toolPayload) {
      void experimentApi.restoreTrashedToolToAnalyticalBalance({
        trash_tool_id: toolPayload.trashToolId,
      });
    }
  };

  const handleAnalyticalBalanceItemDragStart = (dataTransfer: DataTransfer) => {
    if (!analyticalBalanceTool) {
      return;
    }

    const allowedDropTargets = getToolDropTargets(analyticalBalanceTool.toolType);
    const payload: AnalyticalBalanceToolDragPayload = {
      allowedDropTargets,
      entityKind: "tool",
      sourceId: "analytical_balance",
      sourceKind: "analytical_balance",
      toolId: analyticalBalanceTool.toolId,
      toolType: analyticalBalanceTool.toolType,
    };

    writeAnalyticalBalanceToolDragPayload(dataTransfer, payload);
    showDropTargets(allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleAnalyticalBalanceSampleLabelTextChange = (
    labelId: string,
    sampleLabelText: string,
  ) => {
    void experimentApi.updateAnalyticalBalanceToolSampleLabelText({
      label_id: labelId,
      sample_label_text: sampleLabelText,
    });
  };

  return {
    handleAnalyticalBalanceDragOver,
    handleAnalyticalBalanceDrop,
    handleAnalyticalBalanceItemDragStart,
    handleAnalyticalBalanceSampleLabelTextChange,
  };
}
