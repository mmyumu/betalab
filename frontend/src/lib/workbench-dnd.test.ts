import { describe, expect, it } from "vitest";

import {
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readProduceDragPayload,
  readRackToolDragPayload,
  readSampleLabelDragPayload,
  readToolbarDragPayload,
  writeBenchToolDragPayload,
  writeProduceDragPayload,
  writeRackToolDragPayload,
  writeSampleLabelDragPayload,
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
  it("marks toolbar autosampler vials as compatible with both stations and rack slots", () => {
    const dataTransfer = createDataTransfer();

    writePayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "rack_slot"],
      entityKind: "tool",
      itemId: "sample_vial_lcms",
      itemType: "tool",
      sourceId: "sample_vial_lcms",
      sourceKind: "palette",
      toolType: "sample_vial",
      trashable: true,
    });

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(true);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "rack_slot"],
      entityKind: "tool",
      itemId: "sample_vial_lcms",
      itemType: "tool",
      sourceId: "sample_vial_lcms",
      sourceKind: "palette",
      toolType: "sample_vial",
      trashable: true,
    });
  });

  it("marks workspace widget drags as workspace-only drops", () => {
    const dataTransfer = createDataTransfer();

    writePayload(dataTransfer, {
      allowedDropTargets: ["workspace_canvas"],
      entityKind: "workspace_widget",
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
      sourceId: "autosampler_rack_widget",
      sourceKind: "palette",
      trashable: true,
      widgetType: "autosampler_rack",
    });

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(false);
    expect(hasCompatibleDropTarget(dataTransfer, "workspace_canvas")).toBe(true);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workspace_canvas"],
      entityKind: "workspace_widget",
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
      sourceId: "autosampler_rack_widget",
      sourceKind: "palette",
      trashable: true,
      widgetType: "autosampler_rack",
    });
  });

  it("marks palette sampling label drags as workbench-and-trash drops", () => {
    const dataTransfer = createDataTransfer();

    writePayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "sample_label",
      itemId: "sampling_bag_label",
      itemType: "sample_label",
      sourceId: "sampling_bag_label",
      sourceKind: "palette",
      trashable: false,
    });

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(false);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "sample_label",
      itemId: "sampling_bag_label",
      itemType: "sample_label",
      sourceId: "sampling_bag_label",
      sourceKind: "palette",
      trashable: false,
    });
  });

  it("reads workbench sample label drags as workbench-and-trash compatible", () => {
    const dataTransfer = createDataTransfer();

    writeSampleLabelDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "sample_label",
      sampleLabelId: "bench_tool_bag-sample-label",
      sampleLabelText: "LOT-2026-041",
      sourceId: "station_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      trashable: false,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(readSampleLabelDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "sample_label",
      sampleLabelId: "bench_tool_bag-sample-label",
      sampleLabelText: "LOT-2026-041",
      sourceId: "station_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      trashable: false,
    });
  });

  it("marks basket produce drags as workbench-and-trash drops", () => {
    const dataTransfer = createDataTransfer();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "basket",
      trashable: false,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(false);
    expect(readProduceDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "basket",
      trashable: false,
    });
  });

  it("marks workbench produce drags as workbench-and-trash drops", () => {
    const dataTransfer = createDataTransfer();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      trashable: false,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(readProduceDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      trashable: false,
    });
  });

  it("marks trash produce drags as workbench-and-trash drops", () => {
    const dataTransfer = createDataTransfer();

    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "trash",
      trashProduceLotId: "trash_produce_lot_1",
      trashable: false,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(readProduceDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "trash",
      trashProduceLotId: "trash_produce_lot_1",
      trashable: false,
    });
  });

  it("marks autosampler vial drags as compatible with both stations and rack slots", () => {
    const dataTransfer = createDataTransfer();

    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "rack_slot", "trash_bin"],
      entityKind: "tool",
      sourceId: "station_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(readBenchToolDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "rack_slot", "trash_bin"],
      entityKind: "tool",
      sourceId: "station_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    });
  });

  it("marks non-vial bench tools as station-only moves", () => {
    const dataTransfer = createDataTransfer();

    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "tool",
      sourceId: "station_2",
      sourceKind: "workbench",
      sourceSlotId: "station_2",
      toolId: "beaker_rinse",
      toolType: "beaker",
      trashable: true,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(false);
    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(readBenchToolDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "tool",
      sourceId: "station_2",
      sourceKind: "workbench",
      sourceSlotId: "station_2",
      toolId: "beaker_rinse",
      toolType: "beaker",
      trashable: true,
    });
  });

  it("marks rack vial drags as station-compatible moves", () => {
    const dataTransfer = createDataTransfer();

    writeRackToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "tool",
      rackSlotId: "rack_slot_1",
      sourceId: "rack_slot_1",
      sourceKind: "rack",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    });
    syncTypes(dataTransfer);

    expect(hasCompatibleDropTarget(dataTransfer, "workbench_slot")).toBe(true);
    expect(hasCompatibleDropTarget(dataTransfer, "rack_slot")).toBe(false);
    expect(hasCompatibleDropTarget(dataTransfer, "trash_bin")).toBe(true);
    expect(readRackToolDragPayload(dataTransfer)).toEqual({
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "tool",
      rackSlotId: "rack_slot_1",
      sourceId: "rack_slot_1",
      sourceKind: "rack",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    });
  });
});
