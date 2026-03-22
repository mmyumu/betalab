import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";

describe("workspace equipment illustrations", () => {
  it("renders rack occupancy as data attributes", () => {
    render(
      <AutosamplerRackIllustration
        occupiedSlots={[1, 3, 4]}
        testId="autosampler-rack-illustration"
        tone="active"
      />,
    );

    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-occupied-count",
      "3",
    );
    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-tone",
      "active",
    );
  });

  it("renders instrument state as data attributes", () => {
    render(
      <LcMsMsInstrumentIllustration
        activeStage="msms"
        status="running"
        testId="lc-msms-instrument-illustration"
      />,
    );

    expect(screen.getByTestId("lc-msms-instrument-illustration")).toHaveAttribute(
      "data-status",
      "running",
    );
    expect(screen.getByTestId("lc-msms-instrument-illustration")).toHaveAttribute(
      "data-active-stage",
      "msms",
    );
  });
});
