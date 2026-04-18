import type { ToolDropCommand } from "@/lib/tool-drop-command-resolver";
import type {
  BasketToolReferencePayload,
  DiscardRackToolPayload,
  DiscardToolFromPalettePayload,
  DiscardWorkbenchToolPayload,
  MoveAnalyticalBalanceToolToWorkbenchPayload,
  MoveGrossBalanceToolToWorkbenchPayload,
  MoveGrossBalanceToolToRackPayload,
  MoveRackToolBetweenSlotsPayload,
  MoveRackToolToAnalyticalBalancePayload,
  MoveRackToolToGrossBalancePayload,
  MoveToolBetweenWorkbenchSlotsPayload,
  PlaceToolInRackSlotPayload,
  PlaceReceivedBagOnWorkbenchPayload,
  PlaceToolOnAnalyticalBalancePayload,
  PlaceToolOnGrossBalancePayload,
  RestoreTrashedToolToAnalyticalBalancePayload,
  RestoreTrashedToolToGrossBalancePayload,
  RestoreTrashedToolToRackSlotPayload,
  RestoreTrashedToolToWorkbenchSlotPayload,
} from "@/types/api-payloads";

type WorkbenchToolDropApi = {
  moveAnalyticalBalanceToolToWorkbench: (payload: MoveAnalyticalBalanceToolToWorkbenchPayload) => void;
  moveGrossBalanceToolToWorkbench: (payload: MoveGrossBalanceToolToWorkbenchPayload) => void;
  moveToolBetweenWorkbenchSlots: (payload: MoveToolBetweenWorkbenchSlotsPayload) => void;
  placeReceivedBagOnWorkbench: (payload: PlaceReceivedBagOnWorkbenchPayload) => void;
  removeRackToolToWorkbenchSlot: (payload: { rack_slot_id: string; target_slot_id: string }) => void;
  restoreTrashedToolToWorkbenchSlot: (payload: RestoreTrashedToolToWorkbenchSlotPayload) => void;
};

type GrossBalanceToolDropApi = {
  moveAnalyticalBalanceToolToGrossBalance: () => void;
  moveBasketToolToGrossBalance: (payload: BasketToolReferencePayload) => void;
  moveRackToolToGrossBalance: (payload: MoveRackToolToGrossBalancePayload) => void;
  moveWorkbenchToolToGrossBalance: (payload: { source_slot_id: string }) => void;
  placeToolOnGrossBalance: (payload: PlaceToolOnGrossBalancePayload) => void;
  restoreTrashedToolToGrossBalance: (payload: RestoreTrashedToolToGrossBalancePayload) => void;
};

type AnalyticalBalanceToolDropApi = {
  moveGrossBalanceToolToAnalyticalBalance: () => void;
  moveRackToolToAnalyticalBalance: (payload: MoveRackToolToAnalyticalBalancePayload) => void;
  moveWorkbenchToolToAnalyticalBalance: (payload: { source_slot_id: string }) => void;
  placeToolOnAnalyticalBalance: (payload: PlaceToolOnAnalyticalBalancePayload) => void;
  restoreTrashedToolToAnalyticalBalance: (payload: RestoreTrashedToolToAnalyticalBalancePayload) => void;
};

type RackToolDropApi = {
  moveGrossBalanceToolToRack: (payload: MoveGrossBalanceToolToRackPayload) => void;
  moveRackToolBetweenSlots: (payload: MoveRackToolBetweenSlotsPayload) => void;
  placeToolInRackSlot: (payload: PlaceToolInRackSlotPayload) => void;
  placeWorkbenchToolInRackSlot: (payload: { source_slot_id: string; rack_slot_id: string }) => void;
  restoreTrashedToolToRackSlot: (payload: RestoreTrashedToolToRackSlotPayload) => void;
};

type TrashToolDropApi = {
  discardAnalyticalBalanceTool: () => void;
  discardBasketTool: (payload: BasketToolReferencePayload) => void;
  discardGrossBalanceTool: () => void;
  discardRackTool: (payload: DiscardRackToolPayload) => void;
  discardToolFromPalette: (payload: DiscardToolFromPalettePayload) => void;
  discardWorkbenchTool: (payload: DiscardWorkbenchToolPayload) => void;
};

export function executeWorkbenchToolDropCommand(command: ToolDropCommand, api: WorkbenchToolDropApi): boolean {
  if (command.kind === "place_received_bag_on_workbench") {
    void api.placeReceivedBagOnWorkbench(command.payload);
    return true;
  }
  if (command.kind === "move_workbench_tool_to_workbench") {
    void api.moveToolBetweenWorkbenchSlots(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_tool_to_workbench") {
    void api.restoreTrashedToolToWorkbenchSlot(command.payload);
    return true;
  }
  if (command.kind === "move_gross_balance_tool_to_workbench") {
    void api.moveGrossBalanceToolToWorkbench(command.payload);
    return true;
  }
  if (command.kind === "move_analytical_balance_tool_to_workbench") {
    void api.moveAnalyticalBalanceToolToWorkbench(command.payload);
    return true;
  }
  if (command.kind === "move_rack_tool_to_workbench") {
    void api.removeRackToolToWorkbenchSlot(command.payload);
    return true;
  }
  return false;
}

export function executeGrossBalanceToolDropCommand(command: ToolDropCommand, api: GrossBalanceToolDropApi): boolean {
  if (command.kind === "place_tool_on_gross_balance") {
    void api.placeToolOnGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "move_basket_tool_to_gross_balance") {
    void api.moveBasketToolToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "move_workbench_tool_to_gross_balance") {
    void api.moveWorkbenchToolToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "move_rack_tool_to_gross_balance") {
    void api.moveRackToolToGrossBalance(command.payload);
    return true;
  }
  if (command.kind === "move_analytical_balance_tool_to_gross_balance") {
    void api.moveAnalyticalBalanceToolToGrossBalance();
    return true;
  }
  if (command.kind === "restore_trashed_tool_to_gross_balance") {
    void api.restoreTrashedToolToGrossBalance(command.payload);
    return true;
  }
  return false;
}

export function executeAnalyticalBalanceToolDropCommand(
  command: ToolDropCommand,
  api: AnalyticalBalanceToolDropApi,
): boolean {
  if (command.kind === "place_tool_on_analytical_balance") {
    void api.placeToolOnAnalyticalBalance(command.payload);
    return true;
  }
  if (command.kind === "move_workbench_tool_to_analytical_balance") {
    void api.moveWorkbenchToolToAnalyticalBalance(command.payload);
    return true;
  }
  if (command.kind === "move_rack_tool_to_analytical_balance") {
    void api.moveRackToolToAnalyticalBalance(command.payload);
    return true;
  }
  if (command.kind === "move_gross_balance_tool_to_analytical_balance") {
    void api.moveGrossBalanceToolToAnalyticalBalance();
    return true;
  }
  if (command.kind === "restore_trashed_tool_to_analytical_balance") {
    void api.restoreTrashedToolToAnalyticalBalance(command.payload);
    return true;
  }
  return false;
}

export function executeRackToolDropCommand(command: ToolDropCommand, api: RackToolDropApi): boolean {
  if (command.kind === "place_tool_in_rack_slot") {
    void api.placeToolInRackSlot(command.payload);
    return true;
  }
  if (command.kind === "place_workbench_tool_in_rack_slot") {
    void api.placeWorkbenchToolInRackSlot(command.payload);
    return true;
  }
  if (command.kind === "move_rack_tool_between_slots") {
    void api.moveRackToolBetweenSlots(command.payload);
    return true;
  }
  if (command.kind === "restore_trashed_tool_to_rack_slot") {
    void api.restoreTrashedToolToRackSlot(command.payload);
    return true;
  }
  if (command.kind === "move_gross_balance_tool_to_rack") {
    void api.moveGrossBalanceToolToRack(command.payload);
    return true;
  }
  return false;
}

export function executeTrashToolDropCommand(command: ToolDropCommand, api: TrashToolDropApi): boolean {
  if (command.kind === "discard_tool_from_palette") {
    void api.discardToolFromPalette(command.payload);
    return true;
  }
  if (command.kind === "discard_workbench_tool") {
    void api.discardWorkbenchTool(command.payload);
    return true;
  }
  if (command.kind === "discard_basket_tool") {
    void api.discardBasketTool(command.payload);
    return true;
  }
  if (command.kind === "discard_rack_tool") {
    void api.discardRackTool(command.payload);
    return true;
  }
  if (command.kind === "discard_gross_balance_tool") {
    void api.discardGrossBalanceTool();
    return true;
  }
  if (command.kind === "discard_analytical_balance_tool") {
    void api.discardAnalyticalBalanceTool();
    return true;
  }
  return false;
}
