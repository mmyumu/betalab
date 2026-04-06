import type { DragEvent } from "react";

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
  moveGrossBalanceToolToAnalyticalBalance: () => void;
  moveRackToolToAnalyticalBalance: (payload: MoveRackToolToAnalyticalBalancePayload) => void;
  moveWorkbenchToolToAnalyticalBalance: (payload: MoveWorkbenchToolToAnalyticalBalancePayload) => void;
  placeToolOnAnalyticalBalance: (payload: PlaceToolOnAnalyticalBalancePayload) => void;
  restoreTrashedToolToAnalyticalBalance: (payload: RestoreTrashedToolToAnalyticalBalancePayload) => void;
};

type AnalyticalBalanceDndOptions = {
  analyticalBalanceTool: BenchToolInstance | null;
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: AnalyticalBalanceDndExperimentApi;
};

export type AnalyticalBalanceDndApi = {
  handleAnalyticalBalanceDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleAnalyticalBalanceDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleAnalyticalBalanceItemDragStart: (dataTransfer: DataTransfer) => void;
};

export function useAnalyticalBalanceDnd({
  analyticalBalanceTool,
  dndDisabledByAction,
  dragState,
  experimentApi,
}: AnalyticalBalanceDndOptions): AnalyticalBalanceDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const handleAnalyticalBalanceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")) {
      event.preventDefault();
    }
  };

  const handleAnalyticalBalanceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (dndDisabledByAction) {
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

  return {
    handleAnalyticalBalanceDragOver,
    handleAnalyticalBalanceDrop,
    handleAnalyticalBalanceItemDragStart,
  };
}
