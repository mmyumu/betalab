import { describe, expect, it, vi } from "vitest";

import {
  executeAnalyticalBalanceToolDropCommand,
  executeGrossBalanceToolDropCommand,
  executeRackToolDropCommand,
  executeTrashToolDropCommand,
  executeWorkbenchToolDropCommand,
} from "@/lib/tool-drop-command-executor";

describe("tool-drop-command-executor", () => {
  it("dispatches workbench tool commands to the matching api method", () => {
    const api = {
      moveAnalyticalBalanceToolToWorkbench: vi.fn(),
      moveGrossBalanceToolToWorkbench: vi.fn(),
      moveToolBetweenWorkbenchSlots: vi.fn(),
      placeReceivedBagOnWorkbench: vi.fn(),
      removeRackToolToWorkbenchSlot: vi.fn(),
      restoreTrashedToolToWorkbenchSlot: vi.fn(),
    };

    expect(executeWorkbenchToolDropCommand({
      kind: "move_rack_tool_to_workbench",
      payload: { rack_slot_id: "rack_a1", target_slot_id: "station_1" },
    }, api)).toBe(true);
    expect(api.removeRackToolToWorkbenchSlot).toHaveBeenCalledWith({
      rack_slot_id: "rack_a1",
      target_slot_id: "station_1",
    });
  });

  it("dispatches gross and analytical balance tool commands", () => {
    const grossApi = {
      moveAnalyticalBalanceToolToGrossBalance: vi.fn(),
      moveBasketToolToGrossBalance: vi.fn(),
      moveRackToolToGrossBalance: vi.fn(),
      moveWorkbenchToolToGrossBalance: vi.fn(),
      placeToolOnGrossBalance: vi.fn(),
      restoreTrashedToolToGrossBalance: vi.fn(),
    };
    const analyticalApi = {
      moveGrossBalanceToolToAnalyticalBalance: vi.fn(),
      moveRackToolToAnalyticalBalance: vi.fn(),
      moveWorkbenchToolToAnalyticalBalance: vi.fn(),
      placeToolOnAnalyticalBalance: vi.fn(),
      restoreTrashedToolToAnalyticalBalance: vi.fn(),
    };

    expect(executeGrossBalanceToolDropCommand({
      kind: "place_tool_on_gross_balance",
      payload: { tool_id: "tube_50ml" },
    }, grossApi)).toBe(true);
    expect(grossApi.placeToolOnGrossBalance).toHaveBeenCalledWith({ tool_id: "tube_50ml" });

    expect(executeAnalyticalBalanceToolDropCommand({
      kind: "move_gross_balance_tool_to_analytical_balance",
    }, analyticalApi)).toBe(true);
    expect(analyticalApi.moveGrossBalanceToolToAnalyticalBalance).toHaveBeenCalled();
  });

  it("dispatches rack tool commands", () => {
    const api = {
      moveGrossBalanceToolToRack: vi.fn(),
      moveRackToolBetweenSlots: vi.fn(),
      placeToolInRackSlot: vi.fn(),
      placeWorkbenchToolInRackSlot: vi.fn(),
      restoreTrashedToolToRackSlot: vi.fn(),
    };

    expect(executeRackToolDropCommand({
      kind: "restore_trashed_tool_to_rack_slot",
      payload: { rack_slot_id: "rack_a1", trash_tool_id: "trash_tool_1" },
    }, api)).toBe(true);
    expect(api.restoreTrashedToolToRackSlot).toHaveBeenCalledWith({
      rack_slot_id: "rack_a1",
      trash_tool_id: "trash_tool_1",
    });
  });

  it("dispatches trash tool commands and rejects unrelated commands", () => {
    const api = {
      discardAnalyticalBalanceTool: vi.fn(),
      discardBasketTool: vi.fn(),
      discardGrossBalanceTool: vi.fn(),
      discardRackTool: vi.fn(),
      discardToolFromPalette: vi.fn(),
      discardWorkbenchTool: vi.fn(),
    };

    expect(executeTrashToolDropCommand({
      kind: "discard_workbench_tool",
      payload: { slot_id: "station_1" },
    }, api)).toBe(true);
    expect(api.discardWorkbenchTool).toHaveBeenCalledWith({ slot_id: "station_1" });

    expect(executeTrashToolDropCommand({
      kind: "move_workbench_tool_to_workbench",
      payload: { source_slot_id: "station_1", target_slot_id: "station_2" },
    }, api)).toBe(false);
  });
});
