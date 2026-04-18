import type {
  AddWorkspaceProduceLotToWidgetPayload,
  AddProduceLotToWorkbenchToolPayload,
  MoveGrossBalanceProduceLotToWidgetPayload,
  MoveGrossBalanceProduceLotToWorkbenchPayload,
  MoveProduceLotBetweenWorkbenchToolsPayload,
  MoveWidgetProduceLotToWorkbenchToolPayload,
  MoveWorkbenchProduceLotToGrossBalancePayload,
  MoveWorkbenchProduceLotToWidgetPayload,
  MoveWorkspaceProduceLotToGrossBalancePayload,
  RestoreTrashedProduceLotToGrossBalancePayload,
  RestoreTrashedProduceLotToWorkbenchToolPayload,
  RestoreTrashedProduceLotToWidgetPayload,
} from "@/types/api-payloads";
import type { ProduceDragPayload } from "@/types/workbench";

type ProduceDropTarget =
  | { kind: "gross_balance" }
  | { kind: "workbench_tool"; slotId: string }
  | { kind: "workspace_widget"; widgetId: "grinder" };

export type ProduceDropCommand =
  | { kind: "add_workspace_produce_lot_to_widget"; payload: AddWorkspaceProduceLotToWidgetPayload }
  | { kind: "add_produce_lot_to_workbench_tool"; payload: AddProduceLotToWorkbenchToolPayload }
  | { kind: "create_debug_produce_lot_on_workbench"; payload: { presetId: string; targetSlotId: string } }
  | { kind: "create_debug_produce_lot_to_widget"; payload: { presetId: string; widgetId: "gross_balance" | "grinder" } }
  | { kind: "move_gross_balance_produce_lot_to_widget"; payload: MoveGrossBalanceProduceLotToWidgetPayload }
  | { kind: "move_gross_balance_produce_lot_to_workbench"; payload: MoveGrossBalanceProduceLotToWorkbenchPayload }
  | { kind: "move_produce_lot_between_workbench_tools"; payload: MoveProduceLotBetweenWorkbenchToolsPayload }
  | { kind: "move_widget_produce_lot_to_gross_balance"; payload: MoveGrossBalanceProduceLotToWidgetPayload }
  | { kind: "move_widget_produce_lot_to_workbench_tool"; payload: MoveWidgetProduceLotToWorkbenchToolPayload }
  | { kind: "move_workbench_produce_lot_to_gross_balance"; payload: MoveWorkbenchProduceLotToGrossBalancePayload }
  | { kind: "move_workbench_produce_lot_to_widget"; payload: MoveWorkbenchProduceLotToWidgetPayload }
  | { kind: "move_workspace_produce_lot_to_gross_balance"; payload: MoveWorkspaceProduceLotToGrossBalancePayload }
  | { kind: "restore_trashed_produce_lot_to_gross_balance"; payload: RestoreTrashedProduceLotToGrossBalancePayload }
  | { kind: "restore_trashed_produce_lot_to_widget"; payload: RestoreTrashedProduceLotToWidgetPayload }
  | { kind: "restore_trashed_produce_lot_to_workbench_tool"; payload: RestoreTrashedProduceLotToWorkbenchToolPayload };

export function resolveProduceDropCommand(
  payload: ProduceDragPayload,
  target: ProduceDropTarget,
): ProduceDropCommand | null {
  if (target.kind === "workbench_tool") {
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      return {
        kind: "create_debug_produce_lot_on_workbench",
        payload: {
          presetId: payload.debugProducePresetId,
          targetSlotId: target.slotId,
        },
      };
    }
    if (payload.sourceKind === "basket") {
      return {
        kind: "add_produce_lot_to_workbench_tool",
        payload: {
          slot_id: target.slotId,
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      if (payload.sourceSlotId === target.slotId) {
        return null;
      }
      return {
        kind: "move_produce_lot_between_workbench_tools",
        payload: {
          source_slot_id: payload.sourceSlotId,
          target_slot_id: target.slotId,
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "grinder") {
      return {
        kind: "move_widget_produce_lot_to_workbench_tool",
        payload: {
          widget_id: "grinder",
          target_slot_id: target.slotId,
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "gross_balance") {
      return {
        kind: "move_gross_balance_produce_lot_to_workbench",
        payload: {
          target_slot_id: target.slotId,
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      return {
        kind: "restore_trashed_produce_lot_to_workbench_tool",
        payload: {
          target_slot_id: target.slotId,
          trash_produce_lot_id: payload.trashProduceLotId,
        },
      };
    }
    return null;
  }

  if (target.kind === "gross_balance") {
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      return {
        kind: "create_debug_produce_lot_to_widget",
        payload: {
          presetId: payload.debugProducePresetId,
          widgetId: "gross_balance",
        },
      };
    }
    if (payload.sourceKind === "basket") {
      return {
        kind: "move_workspace_produce_lot_to_gross_balance",
        payload: { produce_lot_id: payload.produceLotId },
      };
    }
    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      return {
        kind: "move_workbench_produce_lot_to_gross_balance",
        payload: {
          source_slot_id: payload.sourceSlotId,
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "grinder") {
      return {
        kind: "move_widget_produce_lot_to_gross_balance",
        payload: { produce_lot_id: payload.produceLotId },
      };
    }
    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      return {
        kind: "restore_trashed_produce_lot_to_gross_balance",
        payload: { trash_produce_lot_id: payload.trashProduceLotId },
      };
    }
    return null;
  }

  if (target.widgetId === "grinder") {
    if (payload.sourceKind === "debug_palette" && payload.debugProducePresetId) {
      return {
        kind: "create_debug_produce_lot_to_widget",
        payload: {
          presetId: payload.debugProducePresetId,
          widgetId: "grinder",
        },
      };
    }
    if (payload.sourceKind === "basket") {
      return {
        kind: "add_workspace_produce_lot_to_widget",
        payload: {
          widget_id: "grinder",
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
      return {
        kind: "move_workbench_produce_lot_to_widget",
        payload: {
          widget_id: "grinder",
          source_slot_id: payload.sourceSlotId,
          produce_lot_id: payload.produceLotId,
        },
      };
    }
    if (payload.sourceKind === "gross_balance") {
      return {
        kind: "move_gross_balance_produce_lot_to_widget",
        payload: { produce_lot_id: payload.produceLotId },
      };
    }
    if (payload.sourceKind === "trash" && payload.trashProduceLotId) {
      return {
        kind: "restore_trashed_produce_lot_to_widget",
        payload: {
          widget_id: "grinder",
          trash_produce_lot_id: payload.trashProduceLotId,
        },
      };
    }
  }

  return null;
}
