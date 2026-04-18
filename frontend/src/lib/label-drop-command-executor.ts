import type { LabelDropCommand } from "@/lib/label-drop-command-resolver";

type WorkbenchLabelDropApi = {
  applyPrintedLimsLabel: (payload: { slot_id: string }) => void;
  applySampleLabelToWorkbenchTool: (payload: { slot_id: string }) => void;
  moveSampleLabelBetweenWorkbenchTools: (payload: {
    label_id: string;
    source_slot_id: string;
    target_slot_id: string;
  }) => void;
  restoreTrashedSampleLabelToWorkbenchTool: (payload: {
    target_slot_id: string;
    trash_sample_label_id: string;
  }) => void;
};

type GrossBalanceLabelDropApi = {
  applyPrintedLimsLabelToGrossBalanceBag: () => void;
  applySampleLabelToGrossBalanceTool: () => void;
  moveWorkbenchSampleLabelToGrossBalance: (payload: {
    label_id: string;
    source_slot_id: string;
  }) => void;
  restoreTrashedSampleLabelToGrossBalance: (payload: {
    trash_sample_label_id: string;
  }) => void;
};

type AnalyticalBalanceLabelDropApi = {
  applyPrintedLimsLabelToAnalyticalBalanceTool: () => void;
  applySampleLabelToAnalyticalBalanceTool: () => void;
  moveWorkbenchSampleLabelToAnalyticalBalance: (payload: {
    label_id: string;
    source_slot_id: string;
  }) => void;
  restoreTrashedSampleLabelToAnalyticalBalance: (payload: {
    trash_sample_label_id: string;
  }) => void;
};

type TrashLabelDropApi = {
  discardPrintedLimsLabel: () => void;
  discardSampleLabelFromPalette: () => void;
  discardSampleLabelFromWorkbenchTool: (payload: {
    label_id: string;
    slot_id: string;
  }) => void;
};

export function executeWorkbenchLabelDropCommand(command: LabelDropCommand, api: WorkbenchLabelDropApi): boolean {
  if (command.kind === "apply_printed_lims_label") {
    void api.applyPrintedLimsLabel(command.payload);
    return true;
  }
  if (command.kind === "apply_sample_label_to_workbench_tool") {
    void api.applySampleLabelToWorkbenchTool(command.payload);
    return true;
  }
  if (command.kind === "move_sample_label_between_workbench_tools") {
    void api.moveSampleLabelBetweenWorkbenchTools(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_sample_label_to_workbench_tool") {
    void api.restoreTrashedSampleLabelToWorkbenchTool(command.payload);
    return true;
  }
  return false;
}

export function executeGrossBalanceLabelDropCommand(command: LabelDropCommand, api: GrossBalanceLabelDropApi): boolean {
  if (command.kind === "apply_printed_lims_label_to_gross_balance_bag") {
    void api.applyPrintedLimsLabelToGrossBalanceBag();
    return true;
  }
  if (command.kind === "apply_sample_label_to_gross_balance_tool") {
    void api.applySampleLabelToGrossBalanceTool();
    return true;
  }
  if (command.kind === "move_workbench_sample_label_to_gross_balance") {
    void api.moveWorkbenchSampleLabelToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_sample_label_to_gross_balance") {
    void api.restoreTrashedSampleLabelToGrossBalance(command.payload);
    return true;
  }
  return false;
}

export function executeAnalyticalBalanceLabelDropCommand(
  command: LabelDropCommand,
  api: AnalyticalBalanceLabelDropApi,
): boolean {
  if (command.kind === "apply_printed_lims_label_to_analytical_balance_tool") {
    void api.applyPrintedLimsLabelToAnalyticalBalanceTool();
    return true;
  }
  if (command.kind === "apply_sample_label_to_analytical_balance_tool") {
    void api.applySampleLabelToAnalyticalBalanceTool();
    return true;
  }
  if (command.kind === "move_workbench_sample_label_to_analytical_balance") {
    void api.moveWorkbenchSampleLabelToAnalyticalBalance(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_sample_label_to_analytical_balance") {
    void api.restoreTrashedSampleLabelToAnalyticalBalance(command.payload);
    return true;
  }
  return false;
}

export function executeTrashLabelDropCommand(command: LabelDropCommand, api: TrashLabelDropApi): boolean {
  if (command.kind === "discard_sample_label_from_palette") {
    void api.discardSampleLabelFromPalette();
    return true;
  }
  if (command.kind === "discard_sample_label_from_workbench_tool") {
    void api.discardSampleLabelFromWorkbenchTool(command.payload);
    return true;
  }
  if (command.kind === "discard_printed_lims_label") {
    void api.discardPrintedLimsLabel();
    return true;
  }
  return false;
}
