import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LabShell } from "@/components/lab-shell";
import { mockExperiment } from "@/lib/mock-experiment";

vi.mock("@/components/results-panel", () => ({
  ResultsPanel: ({ run }: { run: { id: string } | undefined }) => (
    <div data-testid="results-panel">{run?.id ?? "no-run"}</div>
  ),
}));

describe("LabShell", () => {
  it("shows only prepared flasks in the bench setup", () => {
    render(<LabShell experiment={mockExperiment} />);

    expect(screen.getByText("Std 1")).toBeInTheDocument();
    expect(screen.getByText("Std 2")).toBeInTheDocument();
    expect(screen.getByText("Sample")).toBeInTheDocument();
    expect(screen.queryByText("Stock analyte")).not.toBeInTheDocument();
    expect(screen.queryByText("Solvent A")).not.toBeInTheDocument();
    expect(screen.queryByText("Matrix blank")).not.toBeInTheDocument();
  });

  it("passes the first run into the results panel", () => {
    render(<LabShell experiment={mockExperiment} />);

    expect(screen.getByTestId("results-panel")).toHaveTextContent("run_std_1");
  });
});
