import type { TrashDropCommand } from "@/lib/trash-drop-command-resolver";

type TrashDropApi = {
  discardGrossBalanceProduceLot: (payload: { produce_lot_id: string }) => void;
  discardPrintedLimsLabel: () => void;
  discardProduceLotFromWorkbenchTool: (payload: { produce_lot_id: string; slot_id: string }) => void;
  discardSampleLabelFromPalette: () => void;
  discardSampleLabelFromWorkbenchTool: (payload: { label_id?: string; slot_id: string }) => void;
  discardWidgetProduceLot: (payload: { produce_lot_id: string; widget_id: "grinder" }) => void;
  discardWorkspaceProduceLot: (payload: { produce_lot_id: string }) => void;
  removeLiquidFromWorkspaceWidget: (payload: { liquid_entry_id: string; widget_id: string }) => void;
};

export function executeTrashDropCommand(command: TrashDropCommand, api: TrashDropApi): boolean {
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
  if (command.kind === "remove_liquid_from_workspace_widget") {
    void api.removeLiquidFromWorkspaceWidget(command.payload);
    return true;
  }
  if (command.kind === "discard_workspace_produce_lot") {
    void api.discardWorkspaceProduceLot(command.payload);
    return true;
  }
  if (command.kind === "discard_widget_produce_lot") {
    void api.discardWidgetProduceLot(command.payload);
    return true;
  }
  if (command.kind === "discard_gross_balance_produce_lot") {
    void api.discardGrossBalanceProduceLot(command.payload);
    return true;
  }
  if (command.kind === "discard_produce_lot_from_workbench_tool") {
    void api.discardProduceLotFromWorkbenchTool(command.payload);
    return true;
  }
  return false;
}
