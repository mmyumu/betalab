import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";

describe("workspace equipment illustrations", () => {
  it("renders rack occupancy as data attributes", () => {
    render(
      <AutosamplerRackIllustration
        occupiedSlotLiquids={{
          1: [
            {
              accent: "rose",
              id: "bench_liquid_1",
              liquidId: "apple_extract",
              name: "Apple extract",
              volume_ml: 1,
            },
          ],
          3: [
            {
              accent: "emerald",
              id: "bench_liquid_2",
              liquidId: "matrix_blank",
              name: "Matrix blank",
              volume_ml: 1,
            },
          ],
          5: [],
          4: [
            {
              accent: "amber",
              id: "bench_liquid_3",
              liquidId: "acetonitrile_extraction",
              name: "Acetonitrile",
              volume_ml: 1,
            },
            {
              accent: "sky",
              id: "bench_liquid_4",
              liquidId: "ultrapure_water_rinse",
              name: "Ultrapure water",
              volume_ml: 1,
            },
          ],
        }}
        occupiedSlots={[1, 3, 4, 5]}
        testId="autosampler-rack-illustration"
        tone="active"
      />,
    );

    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-occupied-count",
      "4",
    );
    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-tone",
      "active",
    );
    expect(screen.getByTestId("autosampler-rack-illustration-slot-liquid-1")).toHaveAttribute(
      "fill",
      "#fb7185",
    );
    expect(screen.getByTestId("autosampler-rack-illustration-slot-liquid-3")).toHaveAttribute(
      "fill",
      "#10b981",
    );
    expect(screen.getByTestId("autosampler-rack-illustration-slot-liquid-4")).toHaveAttribute(
      "fill",
      "url(#autosampler-rack-illustration-slot-gradient-4)",
    );
    expect(screen.getByTestId("autosampler-rack-illustration-slot-gradient-4").querySelectorAll("stop")).toHaveLength(4);
    expect(screen.getByTestId("autosampler-rack-illustration-slot-liquid-5")).toHaveAttribute(
      "fill",
      "#cbd5e1",
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
