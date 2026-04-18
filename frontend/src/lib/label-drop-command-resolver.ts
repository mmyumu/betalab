import type {
  LimsLabelTicketDragPayload,
  SampleLabelDragPayload,
  ToolbarDragPayload,
} from "@/types/workbench";

export type LabelDragPayload =
  | { kind: "palette_sample_label"; payload: ToolbarDragPayload }
  | { kind: "workbench_sample_label"; payload: SampleLabelDragPayload }
  | { kind: "trash_sample_label"; payload: SampleLabelDragPayload }
  | { kind: "lims_label_ticket"; payload: LimsLabelTicketDragPayload };

type LabelDropTarget =
  | { kind: "analytical_balance" }
  | { kind: "gross_balance" }
  | { kind: "trash_bin" }
  | { kind: "workbench_slot"; slotId: string };

export type LabelDropCommand =
  | { kind: "apply_printed_lims_label"; payload: { slot_id: string } }
  | { kind: "apply_printed_lims_label_to_analytical_balance_tool" }
  | { kind: "apply_printed_lims_label_to_gross_balance_bag" }
  | { kind: "apply_sample_label_to_analytical_balance_tool" }
  | { kind: "apply_sample_label_to_gross_balance_tool" }
  | { kind: "apply_sample_label_to_workbench_tool"; payload: { slot_id: string } }
  | { kind: "discard_printed_lims_label" }
  | { kind: "discard_sample_label_from_palette" }
  | {
      kind: "discard_sample_label_from_workbench_tool";
      payload: { label_id: string; slot_id: string };
    }
  | {
      kind: "move_sample_label_between_workbench_tools";
      payload: { label_id: string; source_slot_id: string; target_slot_id: string };
    }
  | {
      kind: "move_workbench_sample_label_to_analytical_balance";
      payload: { label_id: string; source_slot_id: string };
    }
  | {
      kind: "move_workbench_sample_label_to_gross_balance";
      payload: { label_id: string; source_slot_id: string };
    }
  | {
      kind: "restore_trashed_sample_label_to_analytical_balance";
      payload: { trash_sample_label_id: string };
    }
  | {
      kind: "restore_trashed_sample_label_to_gross_balance";
      payload: { trash_sample_label_id: string };
    }
  | {
      kind: "restore_trashed_sample_label_to_workbench_tool";
      payload: { target_slot_id: string; trash_sample_label_id: string };
    };

export function resolveLabelDropCommand(
  payload: LabelDragPayload,
  target: LabelDropTarget,
): LabelDropCommand | null {
  if (target.kind === "workbench_slot") {
    if (payload.kind === "lims_label_ticket") {
      return {
        kind: "apply_printed_lims_label",
        payload: { slot_id: target.slotId },
      };
    }
    if (payload.kind === "palette_sample_label") {
      return {
        kind: "apply_sample_label_to_workbench_tool",
        payload: { slot_id: target.slotId },
      };
    }
    if (payload.kind === "workbench_sample_label") {
      if (!payload.payload.sourceSlotId || payload.payload.sourceSlotId === target.slotId) {
        return null;
      }
      return {
        kind: "move_sample_label_between_workbench_tools",
        payload: {
          label_id: payload.payload.sampleLabelId,
          source_slot_id: payload.payload.sourceSlotId,
          target_slot_id: target.slotId,
        },
      };
    }
    if (!payload.payload.trashSampleLabelId) {
      return null;
    }
    return {
      kind: "restore_trashed_sample_label_to_workbench_tool",
      payload: {
        target_slot_id: target.slotId,
        trash_sample_label_id: payload.payload.trashSampleLabelId,
      },
    };
  }

  if (target.kind === "gross_balance") {
    if (payload.kind === "lims_label_ticket") {
      return { kind: "apply_printed_lims_label_to_gross_balance_bag" };
    }
    if (payload.kind === "palette_sample_label") {
      return { kind: "apply_sample_label_to_gross_balance_tool" };
    }
    if (payload.kind === "workbench_sample_label") {
      if (!payload.payload.sourceSlotId) {
        return null;
      }
      return {
        kind: "move_workbench_sample_label_to_gross_balance",
        payload: {
          label_id: payload.payload.sampleLabelId,
          source_slot_id: payload.payload.sourceSlotId,
        },
      };
    }
    if (!payload.payload.trashSampleLabelId) {
      return null;
    }
    return {
      kind: "restore_trashed_sample_label_to_gross_balance",
      payload: { trash_sample_label_id: payload.payload.trashSampleLabelId },
    };
  }

  if (target.kind === "analytical_balance") {
    if (payload.kind === "lims_label_ticket") {
      return { kind: "apply_printed_lims_label_to_analytical_balance_tool" };
    }
    if (payload.kind === "palette_sample_label") {
      return { kind: "apply_sample_label_to_analytical_balance_tool" };
    }
    if (payload.kind === "workbench_sample_label") {
      if (!payload.payload.sourceSlotId) {
        return null;
      }
      return {
        kind: "move_workbench_sample_label_to_analytical_balance",
        payload: {
          label_id: payload.payload.sampleLabelId,
          source_slot_id: payload.payload.sourceSlotId,
        },
      };
    }
    if (!payload.payload.trashSampleLabelId) {
      return null;
    }
    return {
      kind: "restore_trashed_sample_label_to_analytical_balance",
      payload: { trash_sample_label_id: payload.payload.trashSampleLabelId },
    };
  }

  if (payload.kind === "lims_label_ticket") {
    return { kind: "discard_printed_lims_label" };
  }
  if (payload.kind === "palette_sample_label") {
    return { kind: "discard_sample_label_from_palette" };
  }
  if (payload.kind === "workbench_sample_label" && payload.payload.sourceSlotId) {
    return {
      kind: "discard_sample_label_from_workbench_tool",
      payload: {
        label_id: payload.payload.sampleLabelId,
        slot_id: payload.payload.sourceSlotId,
      },
    };
  }

  return null;
}
