import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSpatulaInteraction } from "@/hooks/use-spatula-interaction";
import type { BenchToolInstance, SpatulaState } from "@/types/workbench";

function makeSpatulaState(overrides: Partial<SpatulaState> = {}): SpatulaState {
  return {
    isLoaded: false,
    produceFractions: [],
    sourceToolId: null,
    ...overrides,
  };
}

function makeTool(overrides: Partial<BenchToolInstance> = {}): BenchToolInstance {
  return {
    id: "bench_tool_1",
    toolId: "sample_vial_lcms",
    label: "Autosampler vial",
    subtitle: "Injection ready",
    accent: "sky",
    toolType: "sample_vial",
    capacity_ml: 2,
    sampleLabelText: null,
    produceLots: [],
    produceFractions: [],
    liquids: [],
    ...overrides,
  };
}

function makePointerEvent(overrides: Partial<PointerEvent> = {}) {
  return {
    button: 0,
    clientY: 200,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as unknown as React.PointerEvent<HTMLElement>;
}

function makeMouseEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: document.createElement("button"),
  } as unknown as React.MouseEvent<HTMLButtonElement>;
}

describe("useSpatulaInteraction", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reloads from the analytical balance on the first click after pouring", () => {
    const onDiscardSpatula = vi.fn();
    const onLoadFromTool = vi.fn();
    const onLoadFromAnalyticalBalance = vi.fn();
    const onPourIntoTool = vi.fn();
    const onPourIntoAnalyticalBalanceTool = vi.fn();
    const analyticalTool = makeTool({
      powderMassG: 0.18,
      produceFractions: [{ id: "powder_tool_1", produceLotId: "lot_1", produceMaterialStateId: "state_ground", massG: 0.18 }],
    });

    const { result, rerender } = renderHook(
      ({ spatula }) =>
        useSpatulaInteraction({
          isSpatulaMode: true,
          onDiscardSpatula,
          onLoadFromTool,
          onLoadFromAnalyticalBalance,
          onPourIntoTool,
          onPourIntoAnalyticalBalanceTool,
          spatula,
        }),
      {
        initialProps: {
          spatula: makeSpatulaState({
            isLoaded: true,
            produceFractions: [{ id: "powder_spatula_1", produceLotId: "lot_1", produceMaterialStateId: "state_ground", massG: 0.05 }],
            sourceToolId: "bench_tool_jar",
          }),
        },
      },
    );

    act(() => {
      result.current.handleSpatulaAnalyticalBalancePointerDown(analyticalTool, makePointerEvent());
    });
    act(() => {
      result.current.handleSpatulaToolPointerUp();
    });

    expect(onPourIntoAnalyticalBalanceTool).toHaveBeenCalledTimes(1);

    rerender({
      spatula: makeSpatulaState(),
    });

    act(() => {
      result.current.handleSpatulaAnalyticalBalancePointerDown(analyticalTool, makePointerEvent());
    });

    expect(onLoadFromAnalyticalBalance).toHaveBeenCalledTimes(1);
  });

  it("reloads from a bench source on the first click after pouring", () => {
    vi.useFakeTimers();

    const onDiscardSpatula = vi.fn();
    const onLoadFromTool = vi.fn();
    const onLoadFromAnalyticalBalance = vi.fn();
    const onPourIntoTool = vi.fn();
    const onPourIntoAnalyticalBalanceTool = vi.fn();
    const targetTool = makeTool();
    const sourceTool = makeTool({
      toolId: "hdpe_storage_jar_2l",
      label: "Wide-neck HDPE jar",
      subtitle: "Bulk powder storage",
      toolType: "storage_jar",
      capacity_ml: 2000,
      powderMassG: 2.5,
      produceFractions: [{ id: "powder_tool_1", produceLotId: "lot_1", produceMaterialStateId: "state_ground", massG: 2.5 }],
    });

    const { result, rerender } = renderHook(
      ({ spatula }) =>
        useSpatulaInteraction({
          isSpatulaMode: true,
          onDiscardSpatula,
          onLoadFromTool,
          onLoadFromAnalyticalBalance,
          onPourIntoTool,
          onPourIntoAnalyticalBalanceTool,
          spatula,
        }),
      {
        initialProps: {
          spatula: makeSpatulaState({
            isLoaded: true,
            produceFractions: [{ id: "powder_spatula_1", produceLotId: "lot_1", produceMaterialStateId: "state_ground", massG: 0.05 }],
            sourceToolId: "bench_tool_jar",
          }),
        },
      },
    );

    act(() => {
      result.current.handleSpatulaToolPointerDown("station_2", targetTool, makePointerEvent());
    });
    act(() => {
      result.current.handleSpatulaToolPointerUp();
    });

    expect(onPourIntoTool).toHaveBeenCalledTimes(1);

    rerender({
      spatula: makeSpatulaState(),
    });

    act(() => {
      result.current.handleSpatulaToolIllustrationClick("station_1", sourceTool, makeMouseEvent());
    });

    expect(onLoadFromTool).not.toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.handleSpatulaToolIllustrationClick("station_1", sourceTool, makeMouseEvent());
    });

    expect(onLoadFromTool).toHaveBeenCalledWith({ slot_id: "station_1" });
  });
});
