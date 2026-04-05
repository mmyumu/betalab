import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GrossBalanceWidget } from "@/components/gross-balance-widget";

describe("GrossBalanceWidget", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders gross, offset, and net values", () => {
    render(
      <GrossBalanceWidget
        grossMassOffsetG={-35}
        isDropHighlighted={false}
        measuredGrossMassG={2485}
        netMassG={2450}
        onCommitOffset={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
      />,
    );

    expect(screen.getByText("2485.0 g")).toBeInTheDocument();
    expect(screen.getByText("-35 g")).toBeInTheDocument();
    expect(screen.getByText("2450.0 g")).toBeInTheDocument();
    expect(screen.getByText("Drop object here")).toBeInTheDocument();
  });

  it("disables offset buttons at the allowed bounds and commits clicks", () => {
    const commitOffset = vi.fn();
    const { rerender } = render(
      <GrossBalanceWidget
        grossMassOffsetG={0}
        isDropHighlighted
        measuredGrossMassG={null}
        netMassG={null}
        onCommitOffset={commitOffset}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        stagedContent={<div>Staged bag</div>}
      />,
    );

    const decreaseButton = screen.getByRole("button", { name: "Decrease gross balance offset" });
    const increaseButton = screen.getByRole("button", { name: "Increase gross balance offset" });
    expect(decreaseButton).not.toBeDisabled();
    expect(increaseButton).toBeDisabled();
    expect(screen.getByText("Staged bag")).toBeInTheDocument();

    fireEvent.click(decreaseButton);
    expect(commitOffset).toHaveBeenCalledWith(-1);

    rerender(
      <GrossBalanceWidget
        grossMassOffsetG={-100}
        isDropHighlighted={false}
        measuredGrossMassG={null}
        netMassG={null}
        onCommitOffset={commitOffset}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Decrease gross balance offset" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase gross balance offset" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase gross balance offset" }));
    expect(commitOffset).toHaveBeenCalledWith(-99);
  });

  it("updates the display while holding and commits only the final offset on release", () => {
    vi.useFakeTimers();

    const commitOffset = vi.fn();

    render(
      <GrossBalanceWidget
        grossMassOffsetG={-35}
        isDropHighlighted={false}
        measuredGrossMassG={2485}
        netMassG={2450}
        onCommitOffset={commitOffset}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
      />,
    );

    const decreaseButton = screen.getByRole("button", { name: "Decrease gross balance offset" });

    fireEvent.pointerDown(decreaseButton);
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(commitOffset).toHaveBeenCalledTimes(0);
    expect(screen.getByText("-35 g")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(commitOffset).toHaveBeenCalledTimes(0);
    expect(screen.getByText("-36 g")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(commitOffset).toHaveBeenCalledTimes(0);
    expect(screen.getByText("-38 g")).toBeInTheDocument();

    fireEvent.pointerUp(decreaseButton);
    fireEvent.click(decreaseButton);
    expect(commitOffset).toHaveBeenCalledTimes(1);
    expect(commitOffset).toHaveBeenCalledWith(-38);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(commitOffset).toHaveBeenCalledTimes(1);
  });
});
