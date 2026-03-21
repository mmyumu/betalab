import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RackPanel } from "@/components/rack-panel";

describe("RackPanel", () => {
  it("renders rack positions and empty slots", () => {
    render(
      <RackPanel
        rack={{
          positions: {
            A1: "vial_std_1",
            A2: null,
            A3: "vial_sample",
          },
        }}
      />,
    );

    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText("A3")).toBeInTheDocument();
    expect(screen.getByText("vial_std_1")).toBeInTheDocument();
    expect(screen.getByText("vial_sample")).toBeInTheDocument();
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
