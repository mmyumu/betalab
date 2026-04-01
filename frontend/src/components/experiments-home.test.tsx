import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExperimentsHome } from "@/components/experiments-home";

const pushMock = vi.fn();
const createExperimentMock = vi.fn();
const deleteExperimentMock = vi.fn();
const listExperimentsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/lib/api", () => ({
  createExperiment: (...args: unknown[]) => createExperimentMock(...args),
  deleteExperiment: (...args: unknown[]) => deleteExperimentMock(...args),
  listExperiments: (...args: unknown[]) => listExperimentsMock(...args),
}));

describe("ExperimentsHome", () => {
  beforeEach(() => {
    pushMock.mockReset();
    createExperimentMock.mockReset();
    deleteExperimentMock.mockReset();
    listExperimentsMock.mockReset();
  });

  it("lists saved experiments and opens one on click", async () => {
    listExperimentsMock.mockResolvedValue([
      {
        id: "experiment_2",
        status: "preparing",
        last_simulation_at: "2026-04-01T10:00:00Z",
        snapshot_version: 4,
        updated_at: "2026-04-01T10:03:00Z",
        last_audit_entry: "Wide-neck HDPE jar sealed on Station 1.",
      },
    ]);

    render(<ExperimentsHome />);

    expect(await screen.findByText("experiment_2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open experiment" }));

    expect(pushMock).toHaveBeenCalledWith("/experiments/experiment_2");
  });

  it("creates a new experiment and redirects to it", async () => {
    listExperimentsMock.mockResolvedValue([]);
    createExperimentMock.mockResolvedValue({
      id: "experiment_new",
    });

    render(<ExperimentsHome />);

    await waitFor(() => {
      expect(screen.getByText("No saved experiments yet.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "New experiment" }));

    await waitFor(() => {
      expect(createExperimentMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/experiments/experiment_new");
    });
  });

  it("deletes a saved experiment from the list", async () => {
    listExperimentsMock.mockResolvedValue([
      {
        id: "experiment_2",
        status: "preparing",
        last_simulation_at: "2026-04-01T10:00:00Z",
        snapshot_version: 4,
        updated_at: "2026-04-01T10:03:00Z",
        last_audit_entry: "Wide-neck HDPE jar sealed on Station 1.",
      },
    ]);
    deleteExperimentMock.mockResolvedValue(undefined);

    render(<ExperimentsHome />);

    expect(await screen.findByText("experiment_2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteExperimentMock).toHaveBeenCalledWith("experiment_2");
      expect(screen.queryByText("experiment_2")).not.toBeInTheDocument();
    });
  });
});
