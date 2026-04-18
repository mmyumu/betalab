import type { ProduceDropCommand } from "@/lib/produce-drop-command-resolver";
import type { DropDraft } from "@/hooks/use-drop-draft";
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

type SetPendingDropDraft = (draft: DropDraft | null) => void;

type WorkbenchProduceDropApi = {
  addProduceLotToWorkbenchTool: (payload: AddProduceLotToWorkbenchToolPayload) => void;
  moveGrossBalanceProduceLotToWorkbench: (payload: MoveGrossBalanceProduceLotToWorkbenchPayload) => void;
  moveProduceLotBetweenWorkbenchTools: (payload: MoveProduceLotBetweenWorkbenchToolsPayload) => void;
  moveWidgetProduceLotToWorkbenchTool: (payload: MoveWidgetProduceLotToWorkbenchToolPayload) => void;
  restoreTrashedProduceLotToWorkbenchTool: (payload: RestoreTrashedProduceLotToWorkbenchToolPayload) => void;
};

type GrossBalanceProduceDropApi = {
  moveWidgetProduceLotToGrossBalance: (payload: MoveGrossBalanceProduceLotToWidgetPayload) => void;
  moveWorkbenchProduceLotToGrossBalance: (payload: MoveWorkbenchProduceLotToGrossBalancePayload) => void;
  moveWorkspaceProduceLotToGrossBalance: (payload: MoveWorkspaceProduceLotToGrossBalancePayload) => void;
  restoreTrashedProduceLotToGrossBalance: (payload: RestoreTrashedProduceLotToGrossBalancePayload) => void;
};

type GrinderProduceDropApi = {
  addWorkspaceProduceLotToWidget: (payload: AddWorkspaceProduceLotToWidgetPayload) => void;
  moveGrossBalanceProduceLotToWidget: (payload: MoveGrossBalanceProduceLotToWidgetPayload) => void;
  moveWorkbenchProduceLotToWidget: (payload: MoveWorkbenchProduceLotToWidgetPayload) => void;
  restoreTrashedProduceLotToWidget: (payload: RestoreTrashedProduceLotToWidgetPayload) => void;
};

function openProduceDraft(
  command:
    | Extract<ProduceDropCommand, { kind: "create_debug_produce_lot_on_workbench" }>
    | Extract<ProduceDropCommand, { kind: "create_debug_produce_lot_to_widget" }>,
  setPendingDropDraft: SetPendingDropDraft,
  buildDebugProduceDraftFields: () => DropDraft["fields"],
) {
  setPendingDropDraft({
    commandType:
      command.kind === "create_debug_produce_lot_on_workbench"
        ? "create_debug_produce_lot_on_workbench"
        : "create_debug_produce_lot_to_widget",
    confirmLabel: "Spawn",
    fields: buildDebugProduceDraftFields(),
    presetId: command.payload.presetId,
    targetId:
      command.kind === "create_debug_produce_lot_on_workbench"
        ? command.payload.targetSlotId
        : command.payload.widgetId,
    targetKind:
      command.kind === "create_debug_produce_lot_on_workbench"
        ? "bench_slot"
        : "workspace_widget",
    title: "Configure Apple powder",
  });
}

export function executeWorkbenchProduceDropCommand(
  command: ProduceDropCommand,
  api: WorkbenchProduceDropApi,
  options: {
    buildDebugProduceDraftFields: () => DropDraft["fields"];
    setPendingDropDraft: SetPendingDropDraft;
  },
): boolean {
  if (command.kind === "create_debug_produce_lot_on_workbench") {
    openProduceDraft(command, options.setPendingDropDraft, options.buildDebugProduceDraftFields);
    return true;
  }
  if (command.kind === "add_produce_lot_to_workbench_tool") {
    void api.addProduceLotToWorkbenchTool(command.payload);
    return true;
  }
  if (command.kind === "move_produce_lot_between_workbench_tools") {
    void api.moveProduceLotBetweenWorkbenchTools(command.payload);
    return true;
  }
  if (command.kind === "move_widget_produce_lot_to_workbench_tool") {
    void api.moveWidgetProduceLotToWorkbenchTool(command.payload);
    return true;
  }
  if (command.kind === "move_gross_balance_produce_lot_to_workbench") {
    void api.moveGrossBalanceProduceLotToWorkbench(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_produce_lot_to_workbench_tool") {
    void api.restoreTrashedProduceLotToWorkbenchTool(command.payload);
    return true;
  }
  return false;
}

export function executeGrossBalanceProduceDropCommand(
  command: ProduceDropCommand,
  api: GrossBalanceProduceDropApi,
  options: {
    buildDebugProduceDraftFields: () => DropDraft["fields"];
    setPendingDropDraft: SetPendingDropDraft;
  },
): boolean {
  if (command.kind === "create_debug_produce_lot_to_widget") {
    openProduceDraft(command, options.setPendingDropDraft, options.buildDebugProduceDraftFields);
    return true;
  }
  if (command.kind === "move_workspace_produce_lot_to_gross_balance") {
    void api.moveWorkspaceProduceLotToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "move_workbench_produce_lot_to_gross_balance") {
    void api.moveWorkbenchProduceLotToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "move_widget_produce_lot_to_gross_balance") {
    void api.moveWidgetProduceLotToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_produce_lot_to_gross_balance") {
    void api.restoreTrashedProduceLotToGrossBalance(command.payload);
    return true;
  }
  return false;
}

export function executeGrinderProduceDropCommand(
  command: ProduceDropCommand,
  api: GrinderProduceDropApi,
  options: {
    buildDebugProduceDraftFields: () => DropDraft["fields"];
    setPendingDropDraft: SetPendingDropDraft;
  },
): boolean {
  if (command.kind === "create_debug_produce_lot_to_widget") {
    openProduceDraft(command, options.setPendingDropDraft, options.buildDebugProduceDraftFields);
    return true;
  }
  if (command.kind === "add_workspace_produce_lot_to_widget") {
    void api.addWorkspaceProduceLotToWidget(command.payload);
    return true;
  }
  if (command.kind === "move_workbench_produce_lot_to_widget") {
    void api.moveWorkbenchProduceLotToWidget(command.payload);
    return true;
  }
  if (command.kind === "move_gross_balance_produce_lot_to_widget") {
    void api.moveGrossBalanceProduceLotToWidget(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_produce_lot_to_widget") {
    void api.restoreTrashedProduceLotToWidget(command.payload);
    return true;
  }
  return false;
}
