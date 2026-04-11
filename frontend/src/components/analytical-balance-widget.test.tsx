import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalyticalBalanceWidget } from "@/components/analytical-balance-widget";

describe("AnalyticalBalanceWidget", () => {
  it("renders the precise mass and net values", () => {
    render(
      <AnalyticalBalanceWidget
        isDropHighlighted={false}
        measuredMassG={22.124}
        netMassG={10.124}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onTare={vi.fn()}
        tareMassG={12}
      />,
    );

    expect(screen.getByText("22.124 g")).toBeInTheDocument();
    expect(screen.getByText("10.124 g")).toBeInTheDocument();
    expect(screen.getByText("Drop 50 mL tube here")).toBeInTheDocument();
  });

  it("shows the overload display and emits the tare action", () => {
    const onTare = vi.fn();

    render(
      <AnalyticalBalanceWidget
        isDropHighlighted
        measuredMassG={221}
        netMassG={209}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onTare={onTare}
        stagedContent={<div>Tube on pan</div>}
        tareMassG={12}
      />,
    );

    expect(screen.getByText("L-O-A-D")).toBeInTheDocument();
    expect(screen.getByText("---")).toBeInTheDocument();
    expect(screen.queryByText("209.000 g")).not.toBeInTheDocument();
    expect(screen.getByText("Tube on pan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tare" }));

    expect(onTare).toHaveBeenCalledTimes(1);
  });
});
