import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GrossBalanceWidget } from "@/components/gross-balance-widget";

describe("GrossBalanceWidget", () => {
  it("renders gross, offset, and net values", () => {
    render(
      <GrossBalanceWidget
        grossMassOffsetG={-35}
        isDropHighlighted={false}
        measuredGrossMassG={2485}
        netMassG={2450}
        onDecrementOffset={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onIncrementOffset={vi.fn()}
      />,
    );

    expect(screen.getByText("2485.0 g")).toBeInTheDocument();
    expect(screen.getByText("-35 g")).toBeInTheDocument();
    expect(screen.getByText("2450.0 g")).toBeInTheDocument();
    expect(screen.getByText("Drop object here")).toBeInTheDocument();
  });

  it("disables offset buttons at the allowed bounds and forwards clicks", () => {
    const decrement = vi.fn();
    const increment = vi.fn();
    const { rerender } = render(
      <GrossBalanceWidget
        grossMassOffsetG={0}
        isDropHighlighted
        measuredGrossMassG={null}
        netMassG={null}
        onDecrementOffset={decrement}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onIncrementOffset={increment}
        stagedContent={<div>Staged bag</div>}
      />,
    );

    const decreaseButton = screen.getByRole("button", { name: "Decrease gross balance offset" });
    const increaseButton = screen.getByRole("button", { name: "Increase gross balance offset" });
    expect(decreaseButton).not.toBeDisabled();
    expect(increaseButton).toBeDisabled();
    expect(screen.getByText("Staged bag")).toBeInTheDocument();

    fireEvent.click(decreaseButton);
    expect(decrement).toHaveBeenCalledTimes(1);

    rerender(
      <GrossBalanceWidget
        grossMassOffsetG={-100}
        isDropHighlighted={false}
        measuredGrossMassG={null}
        netMassG={null}
        onDecrementOffset={decrement}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onIncrementOffset={increment}
      />,
    );

    expect(screen.getByRole("button", { name: "Decrease gross balance offset" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase gross balance offset" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase gross balance offset" }));
    expect(increment).toHaveBeenCalledTimes(1);
  });
});
