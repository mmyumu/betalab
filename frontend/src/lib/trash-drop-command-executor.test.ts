import { describe, expect, it, vi } from "vitest";

import { executeTrashDropCommand } from "@/lib/trash-drop-command-executor";

describe("trash-drop-command-executor", () => {
  it("dispatches workspace liquid and produce trash commands", () => {
    const api = {
      discardGrossBalanceProduceLot: vi.fn(),
      discardPrintedLimsLabel: vi.fn(),
      discardProduceLotFromWorkbenchTool: vi.fn(),
      discardSampleLabelFromPalette: vi.fn(),
      discardSampleLabelFromWorkbenchTool: vi.fn(),
      discardWidgetProduceLot: vi.fn(),
      discardWorkspaceProduceLot: vi.fn(),
      removeLiquidFromWorkspaceWidget: vi.fn(),
    };

    expect(executeTrashDropCommand({
      kind: "remove_liquid_from_workspace_widget",
      payload: { liquid_entry_id: "liquid_1", widget_id: "grinder" },
    }, api)).toBe(true);
    expect(api.removeLiquidFromWorkspaceWidget).toHaveBeenCalledWith({
      liquid_entry_id: "liquid_1",
      widget_id: "grinder",
    });

    expect(executeTrashDropCommand({
      kind: "discard_produce_lot_from_workbench_tool",
      payload: { produce_lot_id: "produce_1", slot_id: "station_1" },
    }, api)).toBe(true);
    expect(api.discardProduceLotFromWorkbenchTool).toHaveBeenCalledWith({
      produce_lot_id: "produce_1",
      slot_id: "station_1",
    });
  });

  it("dispatches label trash commands and rejects unrelated commands", () => {
    const api = {
      discardGrossBalanceProduceLot: vi.fn(),
      discardPrintedLimsLabel: vi.fn(),
      discardProduceLotFromWorkbenchTool: vi.fn(),
      discardSampleLabelFromPalette: vi.fn(),
      discardSampleLabelFromWorkbenchTool: vi.fn(),
      discardWidgetProduceLot: vi.fn(),
      discardWorkspaceProduceLot: vi.fn(),
      removeLiquidFromWorkspaceWidget: vi.fn(),
    };

    expect(executeTrashDropCommand({
      kind: "discard_printed_lims_label",
    }, api)).toBe(true);
    expect(api.discardPrintedLimsLabel).toHaveBeenCalled();

    expect(executeTrashDropCommand({
      kind: "move_workbench_sample_label_to_gross_balance",
      payload: { label_id: "label_1", source_slot_id: "station_1" },
    }, api)).toBe(false);
  });
});
