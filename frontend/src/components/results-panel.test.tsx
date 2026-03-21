import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultsPanel } from "@/components/results-panel";
import type { Run } from "@/types/experiment";

vi.mock("recharts", () => ({
  Line: () => <div data-testid="line-series" />,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}));

const makeRun = (): Run => ({
  id: "run_std_1",
  source_vial_id: "vial_std_1",
  sample_type: "standard",
  status: "completed",
  result: {
    observed_retention_time: 1.35,
    estimated_concentration_ng_ml: 10,
    warnings: [],
    transition_results: [
      {
        transition_id: "tr_1",
        area: 1800,
        height: 1200,
        chromatogram_points: [
          { time_min: 1.1, intensity: 100 },
          { time_min: 1.35, intensity: 1200 },
        ],
      },
      {
        transition_id: "tr_2",
        area: 1116,
        height: 744,
        chromatogram_points: [
          { time_min: 1.1, intensity: 62 },
          { time_min: 1.35, intensity: 744 },
        ],
      },
    ],
  },
});

describe("ResultsPanel", () => {
  it("shows an empty state when no run result is available", () => {
    render(<ResultsPanel run={undefined} />);

    expect(screen.getByText("Aucun run simule pour le moment.")).toBeInTheDocument();
  });

  it("renders result metrics and one card per transition", () => {
    render(<ResultsPanel run={makeRun()} />);

    expect(screen.getByText("standard")).toBeInTheDocument();
    expect(screen.getByText("1.35 min")).toBeInTheDocument();
    expect(screen.getByText("10 ng/mL")).toBeInTheDocument();
    expect(screen.getByText("tr_1")).toBeInTheDocument();
    expect(screen.getByText("tr_2")).toBeInTheDocument();
    expect(screen.getAllByTestId("line-series")).toHaveLength(2);
  });
});
