import { describe, expect, it, vi } from "vitest";

import {
  executeAnalyticalBalanceLabelDropCommand,
  executeGrossBalanceLabelDropCommand,
  executeTrashLabelDropCommand,
  executeWorkbenchLabelDropCommand,
} from "@/lib/label-drop-command-executor";

describe("label-drop-command-executor", () => {
  it("dispatches workbench label commands", () => {
    const api = {
      applyPrintedLimsLabel: vi.fn(),
      applySampleLabelToWorkbenchTool: vi.fn(),
      moveSampleLabelBetweenWorkbenchTools: vi.fn(),
      restoreTrashedSampleLabelToWorkbenchTool: vi.fn(),
    };

    expect(executeWorkbenchLabelDropCommand({
      kind: "move_sample_label_between_workbench_tools",
      payload: {
        label_id: "label_1",
        source_slot_id: "station_1",
        target_slot_id: "station_2",
      },
    }, api)).toBe(true);
    expect(api.moveSampleLabelBetweenWorkbenchTools).toHaveBeenCalledWith({
      label_id: "label_1",
      source_slot_id: "station_1",
      target_slot_id: "station_2",
    });
  });

  it("dispatches balance and trash label commands", () => {
    const grossApi = {
      applyPrintedLimsLabelToGrossBalanceBag: vi.fn(),
      applySampleLabelToGrossBalanceTool: vi.fn(),
      moveWorkbenchSampleLabelToGrossBalance: vi.fn(),
      restoreTrashedSampleLabelToGrossBalance: vi.fn(),
    };
    const analyticalApi = {
      applyPrintedLimsLabelToAnalyticalBalanceTool: vi.fn(),
      applySampleLabelToAnalyticalBalanceTool: vi.fn(),
      moveWorkbenchSampleLabelToAnalyticalBalance: vi.fn(),
      restoreTrashedSampleLabelToAnalyticalBalance: vi.fn(),
    };
    const trashApi = {
      discardPrintedLimsLabel: vi.fn(),
      discardSampleLabelFromPalette: vi.fn(),
      discardSampleLabelFromWorkbenchTool: vi.fn(),
    };

    expect(executeGrossBalanceLabelDropCommand({
      kind: "apply_printed_lims_label_to_gross_balance_bag",
    }, grossApi)).toBe(true);
    expect(grossApi.applyPrintedLimsLabelToGrossBalanceBag).toHaveBeenCalled();

    expect(executeAnalyticalBalanceLabelDropCommand({
      kind: "restore_trashed_sample_label_to_analytical_balance",
      payload: { trash_sample_label_id: "trash_1" },
    }, analyticalApi)).toBe(true);
    expect(analyticalApi.restoreTrashedSampleLabelToAnalyticalBalance).toHaveBeenCalledWith({
      trash_sample_label_id: "trash_1",
    });

    expect(executeTrashLabelDropCommand({
      kind: "discard_sample_label_from_palette",
    }, trashApi)).toBe(true);
    expect(trashApi.discardSampleLabelFromPalette).toHaveBeenCalled();
  });
});
