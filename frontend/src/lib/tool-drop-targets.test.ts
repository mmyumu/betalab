import { describe, expect, it } from "vitest";

import { getToolDropTargets } from "@/lib/tool-drop-targets";

describe("tool drop targets", () => {
  it("keeps autosampler vial compatible with rack slots regardless of origin", () => {
    expect(getToolDropTargets("sample_vial")).toEqual(["workbench_slot", "rack_slot"]);
    expect(getToolDropTargets("sample_vial", { includeTrash: true })).toEqual([
      "workbench_slot",
      "rack_slot",
      "trash_bin",
    ]);
  });

  it("keeps non-vial tools off the rack", () => {
    expect(getToolDropTargets("beaker")).toEqual(["workbench_slot"]);
    expect(getToolDropTargets("beaker", { includeTrash: true })).toEqual([
      "workbench_slot",
      "trash_bin",
    ]);
  });
});
