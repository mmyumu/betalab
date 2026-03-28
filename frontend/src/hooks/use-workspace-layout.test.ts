import { act, renderHook } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  inferAnchoredLayout,
  useWorkspaceLayout,
  type WidgetLayout,
} from "@/hooks/use-workspace-layout";

describe("inferAnchoredLayout", () => {
  it("keeps widgets vertically anchored from the top near the bottom edge", () => {
    expect(
      inferAnchoredLayout(
        { x: 180, y: 920 },
        { width: 320, height: 220 },
        { width: 1600, height: 1200 },
      ),
    ).toEqual({
      anchor: "top-left",
      offsetX: 180,
      offsetY: 920,
    });
  });

  it("still chooses the right horizontal anchor when closer to the right edge", () => {
    expect(
      inferAnchoredLayout(
        { x: 1220, y: 920 },
        { width: 320, height: 220 },
        { width: 1600, height: 1200 },
      ),
    ).toEqual({
      anchor: "top-right",
      offsetX: 60,
      offsetY: 920,
    });
  });
});

describe("useWorkspaceLayout", () => {
  it("does not snap a dragged widget back to its anchor while the workspace grows", () => {
    let workspaceRect = {
      left: 0,
      top: 0,
      width: 1600,
      height: 1100,
    };

    class ResizeObserverMock {
      static callback: ResizeObserverCallback | null = null;

      constructor(callback: ResizeObserverCallback) {
        ResizeObserverMock.callback = callback;
      }

      disconnect() {}

      observe() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const workspaceRef = {
      current: {
        getBoundingClientRect: () => workspaceRect,
      } as HTMLDivElement,
    };

    const initialLayout: Record<"rack" | "trash", WidgetLayout> = {
      rack: {
        anchor: "top-left",
        fallbackHeight: 392,
        offsetX: 234,
        offsetY: 886,
        width: 548,
        x: 234,
        y: 886,
      },
      trash: {
        anchor: "top-right",
        fallbackHeight: 214,
        offsetX: 0,
        offsetY: 126,
        width: 164,
        x: 1436,
        y: 126,
      },
    };

    const { result } = renderHook(() =>
      useWorkspaceLayout({
        fixedWidgetIds: [],
        getIsWidgetTrashable: () => false,
        initialLayout,
        initialOrder: ["rack", "trash"],
        onDiscardWidget: vi.fn(),
        onMoveWidget: vi.fn(),
        presentWidgetIds: ["rack", "trash"],
        syncKey: null,
        trashWidgetId: "trash",
        widgets: [],
        workspaceRef,
      }),
    );

    act(() => {
      result.current.handleWidgetDragStart("rack", {
        button: 0,
        clientX: 300,
        clientY: 930,
        preventDefault: vi.fn(),
      } as unknown as ReactMouseEvent<HTMLDivElement>);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 300, clientY: 980 }));
    });

    expect(result.current.widgetLayout.rack.y).toBe(708);

    workspaceRect = {
      ...workspaceRect,
      height: 1376,
    };

    act(() => {
      ResizeObserverMock.callback?.([], {} as ResizeObserver);
    });

    expect(result.current.widgetLayout.rack.y).toBe(708);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 980 }));
    });

    vi.unstubAllGlobals();
  });
});
