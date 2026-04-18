import type { ProduceDragPayload, WorkspaceLiquidDragPayload } from "@/types/workbench";

import type { LabelDragPayload } from "@/lib/label-drop-command-resolver";
import { resolveLabelDropCommand, type LabelDropCommand } from "@/lib/label-drop-command-resolver";

type TrashDropPayload = LabelDragPayload | ProduceDragPayload | WorkspaceLiquidDragPayload;

export type TrashDropCommand =
  | LabelDropCommand
  | { kind: "discard_gross_balance_produce_lot"; payload: { produce_lot_id: string } }
  | {
      kind: "discard_produce_lot_from_workbench_tool";
      payload: { produce_lot_id: string; slot_id: string };
    }
  | { kind: "discard_widget_produce_lot"; payload: { produce_lot_id: string; widget_id: "grinder" } }
  | { kind: "discard_workspace_produce_lot"; payload: { produce_lot_id: string } }
  | {
      kind: "remove_liquid_from_workspace_widget";
      payload: { liquid_entry_id: string; widget_id: string };
    };

function isLabelDropPayload(payload: TrashDropPayload): payload is LabelDragPayload {
  return "kind" in payload;
}

function isWorkspaceLiquidDragPayload(
  payload: TrashDropPayload,
): payload is WorkspaceLiquidDragPayload {
  return "liquidEntryId" in payload;
}

export function resolveTrashDropCommand(
  payload: TrashDropPayload,
  options: { isGrinderRunning: boolean },
): TrashDropCommand | null {
  if (isLabelDropPayload(payload)) {
    return resolveLabelDropCommand(payload, { kind: "trash_bin" });
  }

  if (isWorkspaceLiquidDragPayload(payload)) {
    if (payload.sourceKind !== "grinder" || options.isGrinderRunning) {
      return null;
    }
    return {
      kind: "remove_liquid_from_workspace_widget",
      payload: {
        widget_id: payload.widgetId,
        liquid_entry_id: payload.liquidEntryId,
      },
    };
  }

  if (payload.sourceKind === "basket") {
    return {
      kind: "discard_workspace_produce_lot",
      payload: { produce_lot_id: payload.produceLotId },
    };
  }
  if (payload.sourceKind === "grinder") {
    return {
      kind: "discard_widget_produce_lot",
      payload: {
        widget_id: "grinder",
        produce_lot_id: payload.produceLotId,
      },
    };
  }
  if (payload.sourceKind === "gross_balance") {
    return {
      kind: "discard_gross_balance_produce_lot",
      payload: { produce_lot_id: payload.produceLotId },
    };
  }
  if (payload.sourceKind === "workbench" && payload.sourceSlotId) {
    return {
      kind: "discard_produce_lot_from_workbench_tool",
      payload: {
        slot_id: payload.sourceSlotId,
        produce_lot_id: payload.produceLotId,
      },
    };
  }

  return null;
}
