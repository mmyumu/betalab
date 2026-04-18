import { describe, expect, it, vi } from "vitest";

import {
  executeGrinderProduceDropCommand,
  executeGrossBalanceProduceDropCommand,
  executeWorkbenchProduceDropCommand,
} from "@/lib/produce-drop-command-executor";

describe("produce-drop-command-executor", () => {
  it("opens the workbench draft for debug produce presets", () => {
    const setPendingDropDraft = vi.fn();
    const api = {
      addProduceLotToWorkbenchTool: vi.fn(),
      moveGrossBalanceProduceLotToWorkbench: vi.fn(),
      moveProduceLotBetweenWorkbenchTools: vi.fn(),
      moveWidgetProduceLotToWorkbenchTool: vi.fn(),
      restoreTrashedProduceLotToWorkbenchTool: vi.fn(),
    };

    expect(executeWorkbenchProduceDropCommand({
      kind: "create_debug_produce_lot_on_workbench",
      payload: { presetId: "apple_powder_residual_co2", targetSlotId: "station_1" },
    }, api, {
      buildDebugProduceDraftFields: () => [],
      setPendingDropDraft,
    })).toBe(true);
    expect(setPendingDropDraft).toHaveBeenCalledWith(expect.objectContaining({
      commandType: "create_debug_produce_lot_on_workbench",
      targetId: "station_1",
    }));
  });

  it("dispatches gross balance and grinder produce commands", () => {
    const setPendingDropDraft = vi.fn();
    const grossApi = {
      moveWidgetProduceLotToGrossBalance: vi.fn(),
      moveWorkbenchProduceLotToGrossBalance: vi.fn(),
      moveWorkspaceProduceLotToGrossBalance: vi.fn(),
      restoreTrashedProduceLotToGrossBalance: vi.fn(),
    };
    const grinderApi = {
      addWorkspaceProduceLotToWidget: vi.fn(),
      moveGrossBalanceProduceLotToWidget: vi.fn(),
      moveWorkbenchProduceLotToWidget: vi.fn(),
      restoreTrashedProduceLotToWidget: vi.fn(),
    };

    expect(executeGrossBalanceProduceDropCommand({
      kind: "move_workspace_produce_lot_to_gross_balance",
      payload: { produce_lot_id: "produce_1" },
    }, grossApi, {
      buildDebugProduceDraftFields: () => [],
      setPendingDropDraft,
    })).toBe(true);
    expect(grossApi.moveWorkspaceProduceLotToGrossBalance).toHaveBeenCalledWith({ produce_lot_id: "produce_1" });

    expect(executeGrinderProduceDropCommand({
      kind: "restore_trashed_produce_lot_to_widget",
      payload: { widget_id: "grinder", trash_produce_lot_id: "trash_1" },
    }, grinderApi, {
      buildDebugProduceDraftFields: () => [],
      setPendingDropDraft,
    })).toBe(true);
    expect(grinderApi.restoreTrashedProduceLotToWidget).toHaveBeenCalledWith({
      widget_id: "grinder",
      trash_produce_lot_id: "trash_1",
    });
  });
});
