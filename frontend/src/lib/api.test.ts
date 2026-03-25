import { afterEach, describe, expect, it, vi } from "vitest";

import { createExperiment, getExperiment, sendExperimentCommand } from "@/lib/api";
import type { Experiment } from "@/types/experiment";

const makeExperiment = (): Experiment => ({
  id: "experiment_test",
  status: "preparing",
  workbench: {
    slots: [],
  },
  rack: {
    slots: [],
  },
  trash: {
    tools: [],
  },
  workspace: {
    produceLots: [],
    widgets: [],
  },
  audit_log: [],
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("creates an empty experiment", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(createExperiment()).resolves.toEqual(experiment);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/experiments", {
      method: "POST",
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
      sendExperimentCommand("experiment_123", "place_tool_on_workbench", { slot_id: "station_1" }),
    ).resolves.toEqual(experiment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/commands",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "place_tool_on_workbench",
          payload: { slot_id: "station_1" },
        }),
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

  it("normalizes snake_case workbench payloads from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...makeExperiment(),
        workbench: {
          slots: [
            {
              id: "station_1",
              label: "Station 1",
              tool: {
                id: "bench_tool_1",
                tool_id: "sample_vial_lcms",
                label: "Autosampler vial",
                subtitle: "Injection ready",
                accent: "sky",
                tool_type: "sample_vial",
                capacity_ml: 2,
                accepts_liquids: true,
                trashable: true,
                liquids: [
                  {
                    id: "bench_liquid_1",
                    liquid_id: "acetonitrile_extraction",
                    name: "Acetonitrile",
                    volume_ml: 2,
                    accent: "amber",
                  },
                ],
              },
            },
          ],
        },
        rack: {
          slots: [
            {
              id: "rack_slot_1",
              label: "Position 1",
              tool: {
                id: "bench_tool_2",
                tool_id: "sample_vial_lcms",
                label: "Autosampler vial",
                subtitle: "Injection ready",
                accent: "sky",
                tool_type: "sample_vial",
                capacity_ml: 2,
                accepts_liquids: true,
                trashable: true,
                liquids: [],
              },
            },
          ],
        },
        trash: {
          tools: [
            {
              id: "trash_tool_1",
              origin_label: "Station 1",
              tool: {
                id: "bench_tool_3",
                tool_id: "sample_vial_lcms",
                label: "Autosampler vial",
                subtitle: "Injection ready",
                accent: "sky",
                tool_type: "sample_vial",
                capacity_ml: 2,
                accepts_liquids: true,
                trashable: true,
                liquids: [],
              },
            },
          ],
        },
        workspace: {
          produce_lots: [
            {
              id: "produce_1",
              label: "Apple lot 1",
              produce_type: "apple",
              total_mass_g: 2450.0,
              unit_count: 12,
            },
          ],
          widgets: [
            {
              id: "rack",
              widget_type: "autosampler_rack",
              label: "Autosampler rack",
              x: 234,
              y: 886,
              is_present: false,
              is_trashed: true,
              trashable: true,
            },
          ],
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const experiment = await getExperiment("experiment_123");

    expect(experiment.workbench.slots[0].tool?.toolId).toBe("sample_vial_lcms");
    expect(experiment.workbench.slots[0].tool?.toolType).toBe("sample_vial");
    expect(experiment.workbench.slots[0].tool?.trashable).toBe(true);
    expect(experiment.workbench.slots[0].tool?.liquids[0].liquidId).toBe(
      "acetonitrile_extraction",
    );
    expect(experiment.rack.slots[0].tool?.toolId).toBe("sample_vial_lcms");
    expect(experiment.trash.tools[0]?.originLabel).toBe("Station 1");
    expect(experiment.workspace.widgets[0]?.widgetType).toBe("autosampler_rack");
    expect(experiment.workspace.widgets[0]?.isTrashed).toBe(true);
    expect(experiment.workspace.produceLots[0]?.produceType).toBe("apple");
    expect(experiment.workspace.produceLots[0]?.label).toBe("Apple lot 1");
    expect(experiment.workspace.produceLots[0]?.unitCount).toBe(12);
    expect(experiment.workspace.produceLots[0]?.totalMassG).toBe(2450);
  });

  it("throws when experiment creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(createExperiment()).rejects.toThrow("Failed to create experiment");
  });

  it("throws when command execution fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(sendExperimentCommand("experiment_123", "place_tool_on_workbench", {})).rejects.toThrow(
      "Failed to send experiment command",
    );
  });

  it("surfaces backend error detail for command execution failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Experiment not found" }),
      }),
    );

    await expect(sendExperimentCommand("experiment_123", "place_tool_on_workbench", {})).rejects.toThrow(
      "Experiment not found",
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
