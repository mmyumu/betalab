import { describe, expect, it } from "vitest";

import {
  hasWorkbenchTargetDragPayload,
  hasWorkspaceWidgetDragPayload,
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

    writePayload(dataTransfer, { itemId: "sample_vial_lcms", itemType: "tool" });

    expect(hasWorkbenchTargetDragPayload(dataTransfer)).toBe(true);
    expect(hasWorkspaceWidgetDragPayload(dataTransfer)).toBe(false);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      itemId: "sample_vial_lcms",
      itemType: "tool",
    });
  });

  it("marks workspace widget drags as workspace-only drops", () => {
    const dataTransfer = createDataTransfer();

    writePayload(dataTransfer, {
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
    });

    expect(hasWorkbenchTargetDragPayload(dataTransfer)).toBe(false);
    expect(hasWorkspaceWidgetDragPayload(dataTransfer)).toBe(true);
    expect(readToolbarDragPayload(dataTransfer)).toEqual({
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
    });
  });
});
