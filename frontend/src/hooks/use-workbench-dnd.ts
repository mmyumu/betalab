import type { Dispatch, SetStateAction } from "react";

import type { DebugProducePreset } from "@/components/debug-produce-palette";
import type { DropDraftField } from "@/components/drop-draft-card";
import type { DropDraft } from "@/hooks/use-drop-draft";
import type { DragStateApi } from "@/hooks/use-drag-state";
import {
  getProduceLotDropTargets,
} from "@/lib/tool-drop-targets";
import {
  toDragDescriptor,
  writeBasketToolDragPayload,
  writeBenchToolDragPayload,
  writeLimsLabelTicketDragPayload,
  writeProduceDragPayload,
  writeSampleLabelDragPayload,
} from "@/lib/workbench-dnd";
import type {
  AnalyticalBalanceToolDragPayload,
  BasketToolDragPayload,
  BenchLabel,
  BenchToolDragPayload,
  BenchToolInstance,
  ExperimentProduceLot,
  GrossBalanceToolDragPayload,
  LimsLabelTicketDragPayload,
  PrintedLabelTicket,
  ProduceDragPayload,
  RackToolDragPayload,
  TrashToolDragPayload,
} from "@/types/workbench";

import type {
  AddProduceLotToWorkbenchToolPayload,
  CutWorkbenchProduceLotPayload,
  MoveAnalyticalBalanceToolToWorkbenchPayload,
  MoveGrossBalanceProduceLotToWorkbenchPayload,
  MoveGrossBalanceToolToWorkbenchPayload,
  MoveProduceLotBetweenWorkbenchToolsPayload,
  MoveToolBetweenWorkbenchSlotsPayload,
  MoveWidgetProduceLotToWorkbenchToolPayload,
  PlaceReceivedBagOnWorkbenchPayload,
  RemoveRackToolToWorkbenchSlotPayload,
  RestoreTrashedProduceLotToWorkbenchToolPayload,
  RestoreTrashedToolToWorkbenchSlotPayload,
} from "@/types/api-payloads";

type WorkbenchDndExperimentApi = {
  addProduceLotToWorkbenchTool: (payload: AddProduceLotToWorkbenchToolPayload) => void;
  cutWorkbenchProduceLot: (payload: CutWorkbenchProduceLotPayload) => void;
  moveAnalyticalBalanceToolToWorkbench: (payload: MoveAnalyticalBalanceToolToWorkbenchPayload) => void;
  moveGrossBalanceProduceLotToWorkbench: (payload: MoveGrossBalanceProduceLotToWorkbenchPayload) => void;
  moveGrossBalanceToolToWorkbench: (payload: MoveGrossBalanceToolToWorkbenchPayload) => void;
  moveProduceLotBetweenWorkbenchTools: (payload: MoveProduceLotBetweenWorkbenchToolsPayload) => void;
  moveToolBetweenWorkbenchSlots: (payload: MoveToolBetweenWorkbenchSlotsPayload) => void;
  moveWidgetProduceLotToWorkbenchTool: (payload: MoveWidgetProduceLotToWorkbenchToolPayload) => void;
  placeReceivedBagOnWorkbench: (payload: PlaceReceivedBagOnWorkbenchPayload) => void;
  removeRackToolToWorkbenchSlot: (payload: RemoveRackToolToWorkbenchSlotPayload) => void;
  restoreTrashedProduceLotToWorkbenchTool: (payload: RestoreTrashedProduceLotToWorkbenchToolPayload) => void;
  restoreTrashedToolToWorkbenchSlot: (payload: RestoreTrashedToolToWorkbenchSlotPayload) => void;
};

type WorkbenchDndOptions = {
  buildDebugProduceDraftFields: () => DropDraftField[];
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: WorkbenchDndExperimentApi;
  isKnifeMode: boolean;
  setPendingDropDraft: Dispatch<SetStateAction<DropDraft | null>>;
};

export type WorkbenchDndApi = {
  canDragBenchTool: (slotId: string, tool: BenchToolInstance) => boolean;
  handleBasketProduceDragStart: (produceLot: ExperimentProduceLot, dataTransfer: DataTransfer) => void;
  handleBasketToolDragStart: (tool: BenchToolInstance, dataTransfer: DataTransfer) => void;
  handleBenchToolDragStart: (
    slotId: string,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => void;
  handleBenchToolDrop: (
    targetSlotId: string,
    payload:
      | BenchToolDragPayload
      | BasketToolDragPayload
      | RackToolDragPayload
      | GrossBalanceToolDragPayload
      | AnalyticalBalanceToolDragPayload
      | TrashToolDragPayload,
  ) => void;
  handleDebugProducePresetDragStart: (
    preset: DebugProducePreset,
    dataTransfer: DataTransfer,
  ) => void;
  handleLimsTicketDragStart: (ticket: PrintedLabelTicket, dataTransfer: DataTransfer) => void;
  handleProduceDrop: (targetSlotId: string, payload: ProduceDragPayload) => void;
  handleWorkbenchProduceLotClick: (slotId: string, produceLot: ExperimentProduceLot) => void;
  handleWorkbenchProduceLotDragStart: (
    slotId: string,
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => void;
  handleWorkbenchSampleLabelDragStart: (
    slotId: string,
    label: BenchLabel,
    dataTransfer: DataTransfer,
  ) => void;
};

export function useWorkbenchDnd({
  buildDebugProduceDraftFields,
  dndDisabledByAction,
  dragState,
  experimentApi,
  isKnifeMode,
  setPendingDropDraft,
}: WorkbenchDndOptions): WorkbenchDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const getBenchToolAllowedDropTargets = (tool: BenchToolInstance) => tool.allowedDropTargets ?? [];

  const canDragBenchTool = (_slotId: string, tool: BenchToolInstance) => {
    if (dndDisabledByAction) {
      return false;
    }
    if (tool.isDraggable === false) {
      return false;
    }
    return getBenchToolAllowedDropTargets(tool).length > 0;
  };

  const handleBenchToolDragStart = (
    slotId: string,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => {
    if (!canDragBenchTool(slotId, tool)) {
      return;
    }

    const allowedDropTargets = getBenchToolAllowedDropTargets(tool);
    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: [...allowedDropTargets],
      entityKind: "tool",
      sourceId: slotId,
      sourceKind: "workbench",
      sourceSlotId: slotId,
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "tool",
      sourceId: slotId,
      sourceKind: "workbench",
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
  };

  const handleBenchToolDrop = (
    targetSlotId: string,
    payload:
      | BenchToolDragPayload
      | BasketToolDragPayload
      | RackToolDragPayload
      | GrossBalanceToolDragPayload
      | AnalyticalBalanceToolDragPayload
      | TrashToolDragPayload,
  ) => {
    if (payload.sourceKind === "basket") {
      void experimentApi.placeReceivedBagOnWorkbench({
        target_slot_id: targetSlotId,
        tool_id: payload.sourceId,
      });
      clearDropTargets();
      return;
    }

    if ("sourceSlotId" in payload) {
      if (payload.sourceSlotId === targetSlotId) {
        clearDropTargets();
        return;
      }
      void experimentApi.moveToolBetweenWorkbenchSlots({
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    if ("trashToolId" in payload) {
      void experimentApi.restoreTrashedToolToWorkbenchSlot({
        target_slot_id: targetSlotId,
        trash_tool_id: payload.trashToolId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "gross_balance") {
      void experimentApi.moveGrossBalanceToolToWorkbench({
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "analytical_balance") {
      void experimentApi.moveAnalyticalBalanceToolToWorkbench({
        target_slot_id: targetSlotId,
      });
      clearDropTargets();
      return;
    }

    void experimentApi.removeRackToolToWorkbenchSlot({
      rack_slot_id: (payload as RackToolDragPayload).rackSlotId,
      target_slot_id: targetSlotId,
    });
    clearDropTargets();
  };

  const handleBasketToolDragStart = (tool: BenchToolInstance, dataTransfer: DataTransfer) => {
    if (dndDisabledByAction) {
      return;
    }
    if (tool.isDraggable === false) {
      return;
    }
    const allowedDropTargets = tool.allowedDropTargets ?? [];

    writeBasketToolDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "tool",
      sourceId: tool.id,
      sourceKind: "basket",
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "tool",
      sourceId: tool.id,
      sourceKind: "basket",
      toolId: tool.toolId,
      toolType: tool.toolType,
    });
  };

  const handleLimsTicketDragStart = (ticket: PrintedLabelTicket, dataTransfer: DataTransfer) => {
    if (ticket.isDraggable === false) {
      return;
    }
    const allowedDropTargets = ticket.allowedDropTargets ?? [];
    const payload: LimsLabelTicketDragPayload = {
      allowedDropTargets,
      entityKind: "lims_label_ticket",
      sourceId: ticket.id,
      sourceKind: "lims",
      ticketId: ticket.id,
      sampleCode: ticket.sampleCode,
      labelText: ticket.labelText,
    };
    writeLimsLabelTicketDragPayload(dataTransfer, payload);
    showDropTargets(payload.allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleProduceDrop = (targetSlotId: string, payload: ProduceDragPayload) => {
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      setPendingDropDraft({
        commandType: "create_debug_produce_lot_on_workbench",
        confirmLabel: "Spawn",
        fields: buildDebugProduceDraftFields(),
        presetId: payload.debugProducePresetId,
        targetId: targetSlotId,
        targetKind: "bench_slot",
        title: "Configure Apple powder",
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "basket") {
      void experimentApi.addProduceLotToWorkbenchTool({
        slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      if (payload.sourceSlotId === targetSlotId) {
        clearDropTargets();
        return;
      }
      void experimentApi.moveProduceLotBetweenWorkbenchTools({
        source_slot_id: payload.sourceSlotId,
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "grinder") {
      void experimentApi.moveWidgetProduceLotToWorkbenchTool({
        widget_id: "grinder",
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "gross_balance") {
      void experimentApi.moveGrossBalanceProduceLotToWorkbench({
        target_slot_id: targetSlotId,
        produce_lot_id: payload.produceLotId,
      });
      clearDropTargets();
      return;
    }

    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      void experimentApi.restoreTrashedProduceLotToWorkbenchTool({
        target_slot_id: targetSlotId,
        trash_produce_lot_id: payload.trashProduceLotId,
      });
    }

    clearDropTargets();
  };

  const handleWorkbenchProduceLotClick = (slotId: string, produceLot: ExperimentProduceLot) => {
    if (!isKnifeMode || (produceLot.cutState ?? "whole") !== "whole") {
      return;
    }
    void experimentApi.cutWorkbenchProduceLot({
      slot_id: slotId,
      produce_lot_id: produceLot.id,
    });
  };

  const handleBasketProduceDragStart = (
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => {
    if (dndDisabledByAction) {
      return;
    }
    const allowedDropTargets = produceLot.allowedDropTargets ?? [];

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType as "apple",
      sourceId: produceLot.id,
      sourceKind: "basket",
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType as "apple",
      sourceId: produceLot.id,
      sourceKind: "basket",
    });
  };

  const handleDebugProducePresetDragStart = (
    preset: DebugProducePreset,
    dataTransfer: DataTransfer,
  ) => {
    if (dndDisabledByAction) {
      return;
    }
    const allowedDropTargets = getProduceLotDropTargets();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      debugProducePresetId: preset.id,
      entityKind: "produce",
      produceLotId: preset.id,
      produceType: preset.produceLot.produceType,
      sourceId: preset.id,
      sourceKind: "debug_palette",
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      debugProducePresetId: preset.id,
      entityKind: "produce",
      produceLotId: preset.id,
      produceType: preset.produceLot.produceType,
      sourceId: preset.id,
      sourceKind: "debug_palette",
    });
  };

  const handleWorkbenchProduceLotDragStart = (
    slotId: string,
    produceLot: ExperimentProduceLot,
    dataTransfer: DataTransfer,
  ) => {
    if (dndDisabledByAction) {
      return;
    }
    const allowedDropTargets = produceLot.allowedDropTargets ?? [];

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "produce",
      produceLotId: produceLot.id,
      produceType: produceLot.produceType,
      sourceId: produceLot.id,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
  };

  const handleWorkbenchSampleLabelDragStart = (
    slotId: string,
    label: BenchLabel,
    dataTransfer: DataTransfer,
  ) => {
    if (dndDisabledByAction) {
      return;
    }
    if (label.isDraggable === false) {
      return;
    }
    const allowedDropTargets = label.allowedDropTargets ?? [];

    writeSampleLabelDragPayload(dataTransfer, {
      allowedDropTargets,
      entityKind: "sample_label",
      label,
      sampleLabelId: label.id,
      sampleLabelText: label.text,
      sourceId: slotId,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
    showDropTargets(allowedDropTargets);
    setActiveDragItem({
      allowedDropTargets,
      entityKind: "sample_label",
      label,
      sampleLabelId: label.id,
      sampleLabelText: label.text,
      sourceId: slotId,
      sourceKind: "workbench",
      sourceSlotId: slotId,
    });
  };

  return {
    canDragBenchTool,
    handleBasketProduceDragStart,
    handleBasketToolDragStart,
    handleBenchToolDragStart,
    handleBenchToolDrop,
    handleDebugProducePresetDragStart,
    handleLimsTicketDragStart,
    handleProduceDrop,
    handleWorkbenchProduceLotClick,
    handleWorkbenchProduceLotDragStart,
    handleWorkbenchSampleLabelDragStart,
  };
}
