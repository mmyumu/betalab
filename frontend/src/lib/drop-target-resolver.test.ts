import { describe, expect, it } from "vitest";

import {
  resolveDropTargetFromActiveDrag,
  resolveDropTargetFromDataTransfer,
  type DropTargetNode,
} from "@/lib/drop-target-resolver";
import type { DragDescriptor } from "@/types/workbench";

function createDataTransferMock() {
  return {} as DataTransfer;
}

describe("drop-target-resolver", () => {
  it("prefers the deepest accepting child when resolving from the active drag item", () => {
    const activeDragItem = { entityKind: "sample_label" } as DragDescriptor;
    const tree: DropTargetNode<string> = {
      acceptsDrop: () => true,
      children: [
        {
          acceptsDrop: ({ activeDragItem: descriptor }) => descriptor?.entityKind === "sample_label",
          resolveTarget: () => "tool",
        },
      ],
      resolveTarget: () => "widget",
    };

    expect(resolveDropTargetFromActiveDrag(tree, activeDragItem)).toBe("tool");
  });

  it("falls back to the parent when no child accepts the drop", () => {
    const activeDragItem = { entityKind: "sample_label" } as DragDescriptor;
    const tree: DropTargetNode<string> = {
      acceptsDrop: ({ activeDragItem: descriptor }) => descriptor?.entityKind === "sample_label",
      children: [
        {
          acceptsDrop: () => false,
          resolveTarget: () => "tool",
        },
      ],
      resolveTarget: () => "widget",
    };

    expect(resolveDropTargetFromActiveDrag(tree, activeDragItem)).toBe("widget");
  });

  it("supports resolving from a dataTransfer payload as well", () => {
    const dataTransfer = createDataTransferMock();
    const tree: DropTargetNode<string> = {
      acceptsDrop: ({ dataTransfer: payload }) => payload === dataTransfer,
      children: [
        {
          acceptsDrop: () => false,
          resolveTarget: () => "tool",
        },
      ],
      resolveTarget: () => "widget",
    };

    expect(resolveDropTargetFromDataTransfer(tree, dataTransfer)).toBe("widget");
  });
});
