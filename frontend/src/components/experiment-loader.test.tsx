import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExperimentLoader } from "@/components/experiment-loader";
import type { Experiment } from "@/types/experiment";

vi.mock("@/lib/api", () => ({
  createExperiment: vi.fn(),
  getExperiment: vi.fn(),
}));

import { createExperiment, getExperiment } from "@/lib/api";

afterEach(() => {
  vi.clearAllMocks();
});

const makeExperiment = (): Experiment => ({
  id: "experiment_test",
  scenario_id: "lcmsms_single_analyte",
  status: "preparing",
  molecule: {
    id: "molecule_a",
    name: "Molecule A",
    retention_time_min: 1.35,
    response_factor: 180,
    expected_ion_ratio: 0.62,
    transitions: [],
  },
  containers: {
    flask_std_1: {
      id: "flask_std_1",
      kind: "flask",
      label: "Std 1",
      capacity_ml: 100,
      current_volume_ml: 100,
      contents: [],
      analyte_concentration_ng_ml: 10,
      matrix_effect_factor: 1,
    },
  },
  rack: { positions: { A1: null, A2: null, A3: null } },
  runs: [],
  audit_log: ["Experiment created"],
});

describe("ExperimentLoader", () => {
  it("creates and fetches an experiment before rendering the lab shell", async () => {
    const experiment = makeExperiment();

    vi.mocked(createExperiment).mockResolvedValue(experiment);
    vi.mocked(getExperiment).mockResolvedValue(experiment);

    render(<ExperimentLoader />);

    expect(screen.getByText("Creating experiment from backend...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Experiment experiment_test | preparing")).toBeInTheDocument();
    });

    expect(createExperiment).toHaveBeenCalledTimes(1);
    expect(getExperiment).toHaveBeenCalledWith("experiment_test");
    expect(screen.getByText("Std 1")).toBeInTheDocument();
  });

  it("shows an error state and retries loading", async () => {
    const experiment = makeExperiment();

    vi.mocked(createExperiment)
      .mockRejectedValueOnce(new Error("Failed to create experiment"))
      .mockResolvedValueOnce(experiment);
    vi.mocked(getExperiment).mockResolvedValue(experiment);

    render(<ExperimentLoader />);

    await waitFor(() => {
      expect(screen.getByText("Failed to create experiment")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Experiment experiment_test | preparing")).toBeInTheDocument();
    });

    expect(createExperiment).toHaveBeenCalledTimes(2);
  });
});
