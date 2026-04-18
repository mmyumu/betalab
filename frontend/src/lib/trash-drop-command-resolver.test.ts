import { describe, expect, it } from "vitest";

import { resolveTrashDropCommand } from "@/lib/trash-drop-command-resolver";
import type { ProduceDragPayload, WorkspaceLiquidDragPayload } from "@/types/workbench";

import type { LabelDragPayload } from "@/lib/label-drop-command-resolver";

const workbenchLabelPayload: LabelDragPayload = {
  kind: "workbench_sample_label",
  payload: {
    allowedDropTargets: ["workbench_slot", "gross_balance_widget", "analytical_balance_widget", "trash_bin"],
    entityKind: "sample_label",
    label: {
      id: "bench_tool_1-sample-label",
      labelKind: "manual",
      text: "LOT-2026-041",
      receivedDate: null,
      sampleCode: null,
      isDraggable: true,
      allowedDropTargets: ["workbench_slot", "gross_balance_widget", "analytical_balance_widget", "trash_bin"],
    },
    sampleLabelId: "bench_tool_1-sample-label",
    sampleLabelText: "LOT-2026-041",
    sourceId: "station_1",
    sourceKind: "workbench",
    sourceSlotId: "station_1",
  },
};

const grinderLiquidPayload: WorkspaceLiquidDragPayload = {
  allowedDropTargets: ["trash_bin"],
  entityKind: "liquid",
  liquidEntryId: "liquid_1",
  liquidType: "dry_ice_pellets",
  sourceId: "grinder",
  sourceKind: "grinder",
  widgetId: "grinder",
};

function createProducePayload(
  overrides: Partial<ProduceDragPayload>,
): ProduceDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "grinder_widget", "trash_bin", "gross_balance_widget"],
    entityKind: "produce",
    produceLotId: "produce_1",
    produceType: "apple",
    sourceId: "produce_1",
    sourceKind: "basket",
    ...overrides,
  };
}

describe("resolveTrashDropCommand", () => {
  it("routes sample labels through the shared label resolver", () => {
    expect(resolveTrashDropCommand(workbenchLabelPayload, { isGrinderRunning: false })).toEqual({
      kind: "discard_sample_label_from_workbench_tool",
      payload: {
        label_id: "bench_tool_1-sample-label",
        slot_id: "station_1",
      },
    });
  });

  it("blocks grinder liquid discard while the grinder is running", () => {
    expect(resolveTrashDropCommand(grinderLiquidPayload, { isGrinderRunning: true })).toBeNull();
    expect(resolveTrashDropCommand(grinderLiquidPayload, { isGrinderRunning: false })).toEqual({
      kind: "remove_liquid_from_workspace_widget",
      payload: {
        widget_id: "grinder",
        liquid_entry_id: "liquid_1",
      },
    });
  });

  it("routes produce discard by provenance", () => {
    expect(resolveTrashDropCommand(createProducePayload({ sourceKind: "basket" }), { isGrinderRunning: false })).toEqual({
      kind: "discard_workspace_produce_lot",
      payload: { produce_lot_id: "produce_1" },
    });
    expect(resolveTrashDropCommand(createProducePayload({ sourceKind: "grinder" }), { isGrinderRunning: false })).toEqual({
      kind: "discard_widget_produce_lot",
      payload: { widget_id: "grinder", produce_lot_id: "produce_1" },
    });
    expect(resolveTrashDropCommand(createProducePayload({ sourceKind: "gross_balance" }), { isGrinderRunning: false })).toEqual({
      kind: "discard_gross_balance_produce_lot",
      payload: { produce_lot_id: "produce_1" },
    });
    expect(resolveTrashDropCommand(createProducePayload({ sourceKind: "workbench", sourceSlotId: "station_1" }), { isGrinderRunning: false })).toEqual({
      kind: "discard_produce_lot_from_workbench_tool",
      payload: { slot_id: "station_1", produce_lot_id: "produce_1" },
    });
  });
});
