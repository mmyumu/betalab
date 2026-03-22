import { afterEach, describe, expect, it, vi } from "vitest";

import { createExperiment, getExperiment, sendExperimentCommand } from "@/lib/api";
import type { Experiment } from "@/types/experiment";

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
  containers: {},
  rack: { positions: {} },
  runs: [],
  audit_log: [],
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("creates an experiment with the default scenario", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(createExperiment()).resolves.toEqual(experiment);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/experiments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scenario_id: "lcmsms_single_analyte" }),
    });
  });

  it("sends a command to the experiment endpoint", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendExperimentCommand("experiment_123", "run_sequence", { rack_id: "rack_1" }),
    ).resolves.toBe(experiment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/commands",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "run_sequence", payload: { rack_id: "rack_1" } }),
      },
    );
  });

  it("fetches an experiment by id", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getExperiment("experiment_123")).resolves.toEqual(experiment);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/experiments/experiment_123");
  });

  it("throws when experiment creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(createExperiment("bad_scenario")).rejects.toThrow("Failed to create experiment");
  });

  it("throws when command execution fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(sendExperimentCommand("experiment_123", "create_flask", {})).rejects.toThrow(
      "Failed to send experiment command",
    );
  });

  it("throws when experiment loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(getExperiment("experiment_123")).rejects.toThrow("Failed to fetch experiment");
  });
});
