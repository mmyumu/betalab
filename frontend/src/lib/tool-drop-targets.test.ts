import { describe, expect, it } from "vitest";

import { canToolBeSealed } from "@/lib/entity-rules";
import {
  getLiquidDropTargets,
  getProduceLotDropTargets,
  getToolDropTargets,
} from "@/lib/tool-drop-targets";

describe("tool drop targets", () => {
  it("keeps autosampler vial compatible with rack slots regardless of origin", () => {
    expect(getToolDropTargets("sample_vial")).toEqual([
      "workbench_slot",
      "rack_slot",
      "trash_bin",
      "gross_balance_widget",
    ]);
  });

  it("keeps non-vial tools off the rack", () => {
    expect(getToolDropTargets("beaker")).toEqual(["workbench_slot", "trash_bin", "gross_balance_widget"]);
    expect(getToolDropTargets("cutting_board")).toEqual(["workbench_slot", "trash_bin", "gross_balance_widget"]);
    expect(getToolDropTargets("sample_bag")).toEqual(["workbench_slot", "trash_bin", "gross_balance_widget"]);
    expect(getToolDropTargets("storage_jar")).toEqual(["workbench_slot", "trash_bin", "gross_balance_widget"]);
  });

  it("keeps produce lot compatibility independent from origin and includes the grinder", () => {
    expect(getProduceLotDropTargets()).toEqual([
      "workbench_slot",
      "grinder_widget",
      "trash_bin",
      "gross_balance_widget",
    ]);
  });

  it("marks sealable containers consistently across tool types", () => {
    expect(canToolBeSealed("sample_bag")).toBe(true);
    expect(canToolBeSealed("storage_jar")).toBe(true);
    expect(canToolBeSealed("centrifuge_tube")).toBe(true);
    expect(canToolBeSealed("cleanup_tube")).toBe(true);
    expect(canToolBeSealed("sample_vial")).toBe(true);
    expect(canToolBeSealed("beaker")).toBe(false);
  });


  it("routes dry ice pellets to the grinder while regular liquids stay on bench tools", () => {
    expect(getLiquidDropTargets("dry_ice_pellets")).toEqual(["grinder_widget"]);
    expect(getLiquidDropTargets("acetonitrile")).toEqual(["workbench_slot"]);
    expect(getLiquidDropTargets("apple_extract")).toEqual(["workbench_slot"]);
  });
});
