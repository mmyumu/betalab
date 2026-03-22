import { describe, expect, it } from "vitest";

import {
  hasCompatibleDropTarget,
  readToolbarDragPayload,
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
});
