import { describe, expect, it } from "vitest";

import {
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
  writeBenchToolDragPayload,
  writeRackToolDragPayload,
  writeToolbarDragPayload,
} from "@/lib/workbench-dnd";
import type { ToolbarDragPayload } from "@/types/workbench";

type MockDataTransfer = DataTransfer & {
  data: Map<string, string>;
};

function createDataTransfer(): MockDataTransfer {
  const data = new Map<string, string>();

  return {
    data,
    dropEffect: "copy",
    effectAllowed: "copy",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: (format?: string) => {
      if (format) {
        data.delete(format);
      } else {
        data.clear();
      }
    },
    getData: (format: string) => data.get(format) ?? "",
    setData: (format: string, value: string) => {
      data.set(format, value);
    },
    setDragImage: () => {},
  } as MockDataTransfer;
}

function syncTypes(dataTransfer: MockDataTransfer) {
  Object.defineProperty(dataTransfer, "types", {
    configurable: true,
    value: Array.from(dataTransfer.data.keys()),
  });
}

function writePayload(dataTransfer: MockDataTransfer, payload: ToolbarDragPayload) {
  writeToolbarDragPayload(dataTransfer, payload);
  syncTypes(dataTransfer);
}

describe("workbench dnd helpers", () => {
  it("marks tool and liquid drags as workbench-target drops", () => {
    const dataTransfer = createDataTransfer();

    writePayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      itemId: "sample_vial_lcms",
      itemType: "tool",
    });

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "workspace_canvas")).toBe(false);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot"],
      itemId: "sample_vial_lcms",
      itemType: "tool",
    });
  });

  it("marks workspace widget drags as workspace-only drops", () => {
    const dataTransfer = createDataTransfer();

    writePayload(dataTransfer, {
      allowedDropTargets: ["workspace_canvas"],
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
    });

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(false);
    expect(hasCompatibleDropTarget(dataTransfer, "workspace_canvas")).toBe(true);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workspace_canvas"],
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
    });
  });

  it("marks autosampler vial drags as compatible with both stations and rack slots", () => {
    const dataTransfer = createDataTransfer();

    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "rack_slot"],
      sourceSlotId: "station_1",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(readBenchToolDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "rack_slot"],
      sourceSlotId: "station_1",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
    });
  });

  it("marks non-vial bench tools as station-only moves", () => {
    const dataTransfer = createDataTransfer();

    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      sourceSlotId: "station_2",
      toolId: "beaker_rinse",
      toolType: "beaker",
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(false);
    expect(readBenchToolDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot"],
      sourceSlotId: "station_2",
      toolId: "beaker_rinse",
      toolType: "beaker",
    });
  });

  it("marks rack vial drags as station-compatible moves", () => {
    const dataTransfer = createDataTransfer();

    writeRackToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      rackSlotId: "rack_slot_1",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(false);
    expect(readRackToolDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot"],
      rackSlotId: "rack_slot_1",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
    });
  });
});
