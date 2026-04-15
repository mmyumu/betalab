import type { DragEvent } from "react";

import { canResolveLabelDropOnTool, readLabelDragPayload } from "@/lib/label-drop-resolver";
import {
  hasCompatibleDropTarget,
  readAnalyticalBalanceToolDragPayload,
  readBenchToolDragPayload,
  readGrossBalanceToolDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
  readTrashToolDragPayload,
  toDragDescriptor,
  writeAnalyticalBalanceToolDragPayload,
} from "@/lib/workbench-dnd";
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
  hasPrintedLabelTicket: _hasPrintedLabelTicket,
}: AnalyticalBalanceDndOptions): AnalyticalBalanceDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const handleAnalyticalBalanceDragOver = (event: DragEvent<HTMLElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (
      canResolveLabelDropOnTool(event.dataTransfer, {
        parentDropTargetTypes: ["analytical_balance_widget"],
        tool: analyticalBalanceTool,
      })
    ) {
      event.preventDefault();
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
    const labelDragPayload = readLabelDragPayload(event.dataTransfer);
    if (
      labelDragPayload &&
      canResolveLabelDropOnTool(event.dataTransfer, {
        parentDropTargetTypes: ["analytical_balance_widget"],
        tool: analyticalBalanceTool,
      })
    ) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();

      if (labelDragPayload.kind === "lims_label_ticket") {
        void experimentApi.applyPrintedLimsLabelToAnalyticalBalanceTool();
        return;
      }
      if (labelDragPayload.kind === "palette_sample_label") {
        void experimentApi.applySampleLabelToAnalyticalBalanceTool();
        return;
      }
      if (labelDragPayload.kind === "workbench_sample_label") {
        void experimentApi.moveWorkbenchSampleLabelToAnalyticalBalance({
          source_slot_id: labelDragPayload.payload.sourceSlotId!,
          label_id: labelDragPayload.payload.sampleLabelId,
        });
        return;
      }
      void experimentApi.restoreTrashedSampleLabelToAnalyticalBalance({
        trash_sample_label_id: labelDragPayload.payload.trashSampleLabelId!,
      });
      return;
    }

    if (!hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")) {
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);

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
    if (analyticalBalanceTool.isDraggable === false) {
      return;
    }

    const allowedDropTargets = analyticalBalanceTool.allowedDropTargets ?? [];
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
