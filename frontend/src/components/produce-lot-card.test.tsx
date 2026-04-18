import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProduceLotCard } from "@/components/produce-lot-card";

describe("ProduceLotCard", () => {
  it("shows a jammed marker in compact mode for waste lots", () => {
    render(
      <ProduceLotCard
        dataTestId="produce-lot-card"
        metadata="Jammed waste • 12 units"
        produceLot={{
          id: "produce_1",
          label: "Apple lot 1",
          produceType: "apple",
          totalMassG: 2450,
          unitCount: 12,
          materialState: "waste",
          temperatureC: -8.2,
        }}
        variant="compact"
      />,
    );

    expect(screen.getByText("Jammed")).toBeInTheDocument();
    expect(screen.getByText("Jammed waste • 12 units")).toBeInTheDocument();
  });

  it("shows a degassing indicator when residual CO2 remains in the lot", () => {
    render(
      <ProduceLotCard
        dataTestId="produce-lot-card"
        metadata="12 units"
        produceLot={{
          id: "produce_1",
          label: "Apple lot 1",
          produceType: "apple",
          totalMassG: 2450,
          unitCount: 12,
          materialState: "ground",
          residualCo2MassG: 24.6,
          temperatureC: -62.4,
        }}
        variant="compact"
      />,
    );

    expect(screen.getByTestId("produce-lot-card")).toHaveAttribute("data-degassing", "true");
    expect(screen.getByTestId("degassing-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("degassing-indicator-fill")).toHaveStyle({ height: "10%" });
  });
});
