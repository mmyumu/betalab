import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProduceLotCard } from "@/components/produce-lot-card";

describe("ProduceLotCard", () => {
  it("shows a jammed marker in compact mode for waste lots", () => {
    render(
      <ProduceLotCard
        dataTestId="produce-lot-card"
        metadata="Jammed waste • 12 units • 2450 g"
        produceLot={{
          id: "produce_1",
          label: "Apple lot 1",
          produceType: "apple",
          totalMassG: 2450,
          unitCount: 12,
          cutState: "waste",
          temperatureC: -8.2,
        }}
        variant="compact"
      />,
    );

    expect(screen.getByText("Jammed")).toBeInTheDocument();
    expect(screen.getByText("Jammed waste • 12 units • 2450 g")).toBeInTheDocument();
  });
});
