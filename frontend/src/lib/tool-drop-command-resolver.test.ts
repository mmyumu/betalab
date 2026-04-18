import { describe, expect, it } from "vitest";

import { resolveToolDropCommand } from "@/lib/tool-drop-command-resolver";
import type {
  AnalyticalBalanceToolDragPayload,
  BasketToolDragPayload,
  BenchToolDragPayload,
  GrossBalanceToolDragPayload,
  RackToolDragPayload,
  ToolbarDragPayload,
  TrashToolDragPayload,
} from "@/types/workbench";

function createToolbarToolPayload(
  overrides: Partial<ToolbarDragPayload & { itemType: "tool" }> = {},
): ToolbarDragPayload & { itemType: "tool" } {
  return {
    allowedDropTargets: ["workbench_slot", "trash_bin", "gross_balance_widget", "analytical_balance_widget"],
    entityKind: "tool",
    itemId: "centrifuge_tube_50ml",
    itemType: "tool",
    sourceId: "centrifuge_tube_50ml",
    sourceKind: "palette",
    toolType: "centrifuge_tube",
    ...overrides,
  };
}

function createWorkbenchToolPayload(overrides: Partial<BenchToolDragPayload> = {}): BenchToolDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "trash_bin", "gross_balance_widget", "analytical_balance_widget"],
    entityKind: "tool",
    sourceId: "station_1",
    sourceKind: "workbench",
    sourceSlotId: "station_1",
    toolId: "tool_1",
    toolType: "centrifuge_tube",
    ...overrides,
  };
}

function createBasketToolPayload(overrides: Partial<BasketToolDragPayload> = {}): BasketToolDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "trash_bin", "gross_balance_widget"],
    entityKind: "tool",
    sourceId: "received_bag_1",
    sourceKind: "basket",
    toolId: "received_bag_1",
    toolType: "sample_bag",
    ...overrides,
  };
}

function createRackToolPayload(overrides: Partial<RackToolDragPayload> = {}): RackToolDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "rack_slot", "trash_bin", "gross_balance_widget", "analytical_balance_widget"],
    entityKind: "tool",
    rackSlotId: "rack_a1",
    sourceId: "rack_a1",
    sourceKind: "rack",
    toolId: "tool_1",
    toolType: "sample_vial",
    ...overrides,
  };
}

function createGrossBalanceToolPayload(
  overrides: Partial<GrossBalanceToolDragPayload> = {},
): GrossBalanceToolDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "rack_slot", "trash_bin", "analytical_balance_widget"],
    entityKind: "tool",
    sourceId: "gross_balance",
    sourceKind: "gross_balance",
    toolId: "tool_1",
    toolType: "sample_vial",
    ...overrides,
  };
}

function createAnalyticalBalanceToolPayload(
  overrides: Partial<AnalyticalBalanceToolDragPayload> = {},
): AnalyticalBalanceToolDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "rack_slot", "trash_bin", "gross_balance_widget"],
    entityKind: "tool",
    sourceId: "analytical_balance",
    sourceKind: "analytical_balance",
    toolId: "tool_1",
    toolType: "sample_vial",
    ...overrides,
  };
}

function createTrashToolPayload(overrides: Partial<TrashToolDragPayload> = {}): TrashToolDragPayload {
  return {
    allowedDropTargets: ["workbench_slot", "rack_slot", "gross_balance_widget", "analytical_balance_widget"],
    entityKind: "tool",
    sourceId: "trash_tool_1",
    sourceKind: "trash",
    toolId: "tool_1",
    toolType: "sample_vial",
    trashToolId: "trash_tool_1",
    ...overrides,
  };
}

describe("resolveToolDropCommand", () => {
  it("routes workbench-slot drops by provenance and rejects self and palette tool moves", () => {
    expect(
      resolveToolDropCommand(createToolbarToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_2",
      }),
    ).toBeNull();

    expect(
      resolveToolDropCommand(createBasketToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_2",
      }),
    ).toEqual({
      kind: "place_received_bag_on_workbench",
      payload: {
        target_slot_id: "station_2",
        tool_id: "received_bag_1",
      },
    });

    expect(
      resolveToolDropCommand(createWorkbenchToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_1",
      }),
    ).toBeNull();

    expect(
      resolveToolDropCommand(createRackToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_2",
      }),
    ).toEqual({
      kind: "move_rack_tool_to_workbench",
      payload: {
        rack_slot_id: "rack_a1",
        target_slot_id: "station_2",
      },
    });

    expect(
      resolveToolDropCommand(createGrossBalanceToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_2",
      }),
    ).toEqual({
      kind: "move_gross_balance_tool_to_workbench",
      payload: { target_slot_id: "station_2" },
    });

    expect(
      resolveToolDropCommand(createAnalyticalBalanceToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_2",
      }),
    ).toEqual({
      kind: "move_analytical_balance_tool_to_workbench",
      payload: { target_slot_id: "station_2" },
    });

    expect(
      resolveToolDropCommand(createTrashToolPayload(), {
        kind: "workbench_slot",
        slotId: "station_2",
      }),
    ).toEqual({
      kind: "restore_trashed_tool_to_workbench",
      payload: {
        target_slot_id: "station_2",
        trash_tool_id: "trash_tool_1",
      },
    });
  });

  it("keeps rack slots vial-only and handles move, restore, and same-slot rejection", () => {
    expect(
      resolveToolDropCommand(
        createToolbarToolPayload({
          itemId: "beaker_250ml",
          toolType: "beaker",
        }),
        { kind: "rack_slot", rackSlotId: "rack_b2" },
      ),
    ).toBeNull();

    expect(
      resolveToolDropCommand(
        createToolbarToolPayload({
          itemId: "sample_vial_lcms",
          toolType: "sample_vial",
        }),
        { kind: "rack_slot", rackSlotId: "rack_b2" },
      ),
    ).toEqual({
      kind: "place_tool_in_rack_slot",
      payload: {
        rack_slot_id: "rack_b2",
        tool_id: "sample_vial_lcms",
      },
    });

    expect(
      resolveToolDropCommand(
        createWorkbenchToolPayload({
          toolType: "sample_vial",
        }),
        { kind: "rack_slot", rackSlotId: "rack_b2" },
      ),
    ).toEqual({
      kind: "place_workbench_tool_in_rack_slot",
      payload: {
        source_slot_id: "station_1",
        rack_slot_id: "rack_b2",
      },
    });

    expect(
      resolveToolDropCommand(createRackToolPayload(), {
        kind: "rack_slot",
        rackSlotId: "rack_a1",
      }),
    ).toBeNull();

    expect(
      resolveToolDropCommand(createGrossBalanceToolPayload(), {
        kind: "rack_slot",
        rackSlotId: "rack_b2",
      }),
    ).toEqual({
      kind: "move_gross_balance_tool_to_rack",
      payload: { rack_slot_id: "rack_b2" },
    });

    expect(
      resolveToolDropCommand(createTrashToolPayload(), {
        kind: "rack_slot",
        rackSlotId: "rack_b2",
      }),
    ).toEqual({
      kind: "restore_trashed_tool_to_rack_slot",
      payload: {
        rack_slot_id: "rack_b2",
        trash_tool_id: "trash_tool_1",
      },
    });
  });

  it("routes gross-balance drops from every supported tool origin", () => {
    expect(resolveToolDropCommand(createToolbarToolPayload(), { kind: "gross_balance" })).toEqual({
      kind: "place_tool_on_gross_balance",
      payload: { tool_id: "centrifuge_tube_50ml" },
    });

    expect(resolveToolDropCommand(createBasketToolPayload(), { kind: "gross_balance" })).toEqual({
      kind: "move_basket_tool_to_gross_balance",
      payload: { tool_id: "received_bag_1" },
    });

    expect(resolveToolDropCommand(createWorkbenchToolPayload(), { kind: "gross_balance" })).toEqual({
      kind: "move_workbench_tool_to_gross_balance",
      payload: { source_slot_id: "station_1" },
    });

    expect(resolveToolDropCommand(createRackToolPayload(), { kind: "gross_balance" })).toEqual({
      kind: "move_rack_tool_to_gross_balance",
      payload: { rack_slot_id: "rack_a1" },
    });

    expect(resolveToolDropCommand(createAnalyticalBalanceToolPayload(), { kind: "gross_balance" })).toEqual({
      kind: "move_analytical_balance_tool_to_gross_balance",
    });

    expect(resolveToolDropCommand(createTrashToolPayload(), { kind: "gross_balance" })).toEqual({
      kind: "restore_trashed_tool_to_gross_balance",
      payload: { trash_tool_id: "trash_tool_1" },
    });
  });

  it("routes analytical-balance drops and rejects unsupported basket moves", () => {
    expect(resolveToolDropCommand(createToolbarToolPayload(), { kind: "analytical_balance" })).toEqual({
      kind: "place_tool_on_analytical_balance",
      payload: { tool_id: "centrifuge_tube_50ml" },
    });

    expect(resolveToolDropCommand(createWorkbenchToolPayload(), { kind: "analytical_balance" })).toEqual({
      kind: "move_workbench_tool_to_analytical_balance",
      payload: { source_slot_id: "station_1" },
    });

    expect(resolveToolDropCommand(createRackToolPayload(), { kind: "analytical_balance" })).toEqual({
      kind: "move_rack_tool_to_analytical_balance",
      payload: { rack_slot_id: "rack_a1" },
    });

    expect(resolveToolDropCommand(createGrossBalanceToolPayload(), { kind: "analytical_balance" })).toEqual({
      kind: "move_gross_balance_tool_to_analytical_balance",
    });

    expect(resolveToolDropCommand(createTrashToolPayload(), { kind: "analytical_balance" })).toEqual({
      kind: "restore_trashed_tool_to_analytical_balance",
      payload: { trash_tool_id: "trash_tool_1" },
    });

    expect(resolveToolDropCommand(createBasketToolPayload(), { kind: "analytical_balance" })).toBeNull();
  });

  it("routes trash drops for every supported origin", () => {
    expect(resolveToolDropCommand(createToolbarToolPayload(), { kind: "trash_bin" })).toEqual({
      kind: "discard_tool_from_palette",
      payload: { tool_id: "centrifuge_tube_50ml" },
    });

    expect(resolveToolDropCommand(createWorkbenchToolPayload(), { kind: "trash_bin" })).toEqual({
      kind: "discard_workbench_tool",
      payload: { slot_id: "station_1" },
    });

    expect(resolveToolDropCommand(createBasketToolPayload(), { kind: "trash_bin" })).toEqual({
      kind: "discard_basket_tool",
      payload: { tool_id: "received_bag_1" },
    });

    expect(resolveToolDropCommand(createRackToolPayload(), { kind: "trash_bin" })).toEqual({
      kind: "discard_rack_tool",
      payload: { rack_slot_id: "rack_a1" },
    });

    expect(resolveToolDropCommand(createGrossBalanceToolPayload(), { kind: "trash_bin" })).toEqual({
      kind: "discard_gross_balance_tool",
    });

    expect(resolveToolDropCommand(createAnalyticalBalanceToolPayload(), { kind: "trash_bin" })).toEqual({
      kind: "discard_analytical_balance_tool",
    });
  });
});
