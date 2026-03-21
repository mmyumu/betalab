import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LabShell } from "@/components/lab-shell";
import { mockExperiment } from "@/lib/mock-experiment";

vi.mock("@/components/results-panel", () => ({
  ResultsPanel: ({ run }: { run: { id: string } | undefined }) => (
    <div data-testid="results-panel">{run?.id ?? "no-run"}</div>
  ),
}));

describe("LabShell", () => {
  it("shows only prepared flasks in the bench setup and exposes the toolbar catalog", () => {
    render(<LabShell experiment={mockExperiment} />);

    expect(screen.getByText("Lab toolbar")).toBeInTheDocument();
    expect(screen.getByText("Glassware")).toBeInTheDocument();
    expect(screen.getByText("Liquids")).toBeInTheDocument();
    expect(screen.getByText("Volumetric flask")).toBeInTheDocument();
    expect(screen.getByText("Acetonitrile")).toBeInTheDocument();

    const workbench = screen.getByText("Preparation bench").closest("section");
    expect(workbench).not.toBeNull();

    const workbenchScope = within(workbench as HTMLElement);
    expect(workbenchScope.getByText("Std 1")).toBeInTheDocument();
    expect(workbenchScope.getByText("Std 2")).toBeInTheDocument();
    expect(workbenchScope.getByText("Sample")).toBeInTheDocument();
    expect(workbenchScope.queryByText("Stock analyte")).not.toBeInTheDocument();
    expect(workbenchScope.queryByText("Solvent A")).not.toBeInTheDocument();
    expect(workbenchScope.queryByText("Matrix blank")).not.toBeInTheDocument();
  });

  it("passes the first run into the results panel", () => {
    render(<LabShell experiment={mockExperiment} />);

    expect(screen.getByTestId("results-panel")).toHaveTextContent("run_std_1");
  });
});
