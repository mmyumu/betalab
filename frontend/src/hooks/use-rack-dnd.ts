import type { DragEvent } from "react";

import {
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readGrossBalanceToolDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
  readTrashToolDragPayload,
  writeRackToolDragPayload,
} from "@/lib/workbench-dnd";
import { labToolCatalog } from "@/lib/lab-workflow-catalog";
import type { BenchToolInstance, RackSlot } from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type {
  MoveGrossBalanceToolToRackPayload,
  MoveRackToolBetweenSlotsPayload,
  PlaceToolInRackSlotPayload,
  PlaceWorkbenchToolInRackSlotPayload,
  RestoreTrashedToolToRackSlotPayload,
} from "@/types/api-payloads";

type RackDndExperimentApi = {
  moveGrossBalanceToolToRack: (payload: MoveGrossBalanceToolToRackPayload) => void;
  moveRackToolBetweenSlots: (payload: MoveRackToolBetweenSlotsPayload) => void;
  placeToolInRackSlot: (payload: PlaceToolInRackSlotPayload) => void;
  placeWorkbenchToolInRackSlot: (payload: PlaceWorkbenchToolInRackSlotPayload) => void;
  restoreTrashedToolToRackSlot: (payload: RestoreTrashedToolToRackSlotPayload) => void;
};

type RackDndOptions = {
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: RackDndExperimentApi;
  rackSlots: RackSlot[];
};

export type RackDndApi = {
  handleRackSlotDragOver: (event: DragEvent<HTMLDivElement>, targetRackSlot: RackSlot) => void;
  handleRackSlotDrop: (event: DragEvent<HTMLDivElement>, slotIndex: number) => void;
  handleRackToolDragStart: (
    rackSlot: RackSlot,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => void;
};

export function useRackDnd({
  dndDisabledByAction,
  dragState,
  experimentApi,
  rackSlots,
}: RackDndOptions): RackDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const handleRackSlotDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetRackSlot: RackSlot,
  ) => {
    if (dndDisabledByAction) {
      return;
    }
    if ((targetRackSlot.dropTargetTypes ?? []).some((targetType) => hasCompatibleDropTarget(event.dataTransfer, targetType))) {
      event.preventDefault();
    }
  };

  const handleRackSlotDrop = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    if (dndDisabledByAction) {
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
      void experimentApi.placeWorkbenchToolInRackSlot({
        source_slot_id: benchToolPayload.sourceSlotId,
        rack_slot_id: targetRackSlot.id,
      });
      clearDropTargets();
      return;
    }

    const grossBalanceToolPayload = readGrossBalanceToolDragPayload(event.dataTransfer);
    if (grossBalanceToolPayload?.toolType === "sample_vial") {
      event.preventDefault();
      event.stopPropagation();
      void experimentApi.moveGrossBalanceToolToRack({
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
      void experimentApi.moveRackToolBetweenSlots({
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
      void experimentApi.placeToolInRackSlot({
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
      void experimentApi.restoreTrashedToolToRackSlot({
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
    if (dndDisabledByAction) {
      return;
    }
    if (tool.isDraggable === false) {
      return;
    }
    const allowedDropTargets = tool.allowedDropTargets ?? [];
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

  return {
    handleRackSlotDragOver,
    handleRackSlotDrop,
    handleRackToolDragStart,
  };
}
