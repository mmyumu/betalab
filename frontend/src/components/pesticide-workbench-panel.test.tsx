import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import type { BenchSlot } from "@/types/workbench";

const slots: BenchSlot[] = [
  { id: "station_1", label: "Station 1", tool: null },
  { id: "station_2", label: "Station 2", tool: null },
];

describe("PesticideWorkbenchPanel", () => {
  it("renders empty stations and a drop status message", () => {
    render(
      <PesticideWorkbenchPanel
        slots={slots}
        statusMessage="Start by dragging an extraction tool onto the bench."
        onToolbarItemDrop={vi.fn()}
      />,
    );

    expect(screen.getByText("Empty prep bench")).toBeInTheDocument();
    expect(screen.getByText("Station 1")).toBeInTheDocument();
    expect(screen.getByText("Station 2")).toBeInTheDocument();
    expect(screen.getAllByText("Empty station")).toHaveLength(2);
    expect(
      screen.getByText("Start by dragging an extraction tool onto the bench."),
    ).toBeInTheDocument();
  });
});
