import { afterEach, describe, expect, it, vi } from "vitest";

import {
  closeWorkbenchTool,
  createDebugProduceLotOnWorkbench,
  createDebugProduceLotToWidget,
  createExperiment,
  deleteExperiment,
  getExperiment,
  listExperiments,
  openWorkbenchTool,
  placeToolOnWorkbench,
  subscribeToExperimentStream,
} from "@/lib/api";
import type { Experiment, ExperimentListEntry } from "@/types/experiment";

const makeExperiment = (): Experiment => ({
  id: "experiment_test",
  status: "preparing",
  last_simulation_at: "2026-03-28T19:00:00Z",
  snapshot_version: 1,
  workbench: {
    slots: [],
  },
  rack: {
    slots: [],
  },
  trash: {
    produceLots: [],
    sampleLabels: [],
    tools: [],
  },
  workspace: {
    produceLots: [],
    widgets: [],
  },
  limsReception: {
    id: null,
    orchardName: "",
    harvestDate: "",
    indicativeMassG: 0,
    measuredGrossMassG: null,
    grossMassOffsetG: 0,
    measuredSampleMassG: null,
    labSampleCode: null,
    status: "awaiting_reception",
    printedLabelTicket: null,
  },
  limsEntries: [],
  basketTool: null,
  spatula: {
    isLoaded: false,
    loadedPowderMassG: 0,
    sourceToolId: null,
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

  it("lists saved experiments", async () => {
    const experiments: ExperimentListEntry[] = [
      {
        id: "experiment_2",
        status: "preparing",
        last_simulation_at: "2026-04-01T10:00:00Z",
        snapshot_version: 4,
        updated_at: "2026-04-01T10:03:00Z",
        last_audit_entry: "Wide-neck HDPE jar sealed on Station 1.",
      },
      {
        id: "experiment_1",
        status: "preparing",
        last_simulation_at: "2026-04-01T09:00:00Z",
        snapshot_version: 2,
        updated_at: "2026-04-01T09:01:00Z",
        last_audit_entry: null,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiments,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(listExperiments()).resolves.toEqual(experiments);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/experiments");
  });

  it("deletes a saved experiment", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteExperiment("experiment_123")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/experiments/experiment_123", {
      method: "DELETE",
    });
  });

  it("places a tool on the workbench via its dedicated endpoint", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      placeToolOnWorkbench("experiment_123", {
        slot_id: "station_1",
        tool_id: "sample_vial_lcms",
      }),
    ).resolves.toEqual(experiment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/workbench/slots/station_1/place-tool",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_id: "sample_vial_lcms",
        }),
      },
    );
  });

  it("closes a sealable workbench tool via its dedicated endpoint", async () => {
    const initialExperiment = {
      ...makeExperiment(),
      id: "experiment_123",
      workbench: {
        slots: [
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_1",
              tool_id: "hdpe_storage_jar_2l",
              label: "Wide-neck HDPE jar",
              subtitle: "Bulk powder storage",
              accent: "amber",
              tool_type: "storage_jar",
              capacity_ml: 2000,
              is_sealed: false,
              closure_fault: null,
              produce_lots: [],
              liquids: [],
            },
          },
        ],
      },
    } satisfies Experiment;
    const closedExperiment = {
      ...initialExperiment,
      workbench: {
        slots: [
          {
            ...initialExperiment.workbench.slots[0],
            tool: {
              ...initialExperiment.workbench.slots[0].tool!,
              is_sealed: true,
            },
          },
        ],
      },
    } satisfies Experiment;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialExperiment,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => closedExperiment,
      });

    vi.stubGlobal("fetch", fetchMock);

    await getExperiment("experiment_123");
    await expect(closeWorkbenchTool("experiment_123", { slot_id: "station_1" })).resolves.toMatchObject({
      workbench: { slots: [{ tool: { isSealed: true } }] },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/workbench/tools/bench_tool_1/close",
      {
        method: "POST",
      },
    );
  });

  it("opens a sealable workbench tool via its dedicated endpoint", async () => {
    const initialExperiment = {
      ...makeExperiment(),
      id: "experiment_123",
      workbench: {
        slots: [
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_1",
              tool_id: "hdpe_storage_jar_2l",
              label: "Wide-neck HDPE jar",
              subtitle: "Bulk powder storage",
              accent: "amber",
              tool_type: "storage_jar",
              capacity_ml: 2000,
              is_sealed: true,
              closure_fault: null,
              produce_lots: [],
              liquids: [],
            },
          },
        ],
      },
    } satisfies Experiment;
    const openedExperiment = {
      ...initialExperiment,
      workbench: {
        slots: [
          {
            ...initialExperiment.workbench.slots[0],
            tool: {
              ...initialExperiment.workbench.slots[0].tool!,
              is_sealed: false,
            },
          },
        ],
      },
    } satisfies Experiment;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialExperiment,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => openedExperiment,
      });

    vi.stubGlobal("fetch", fetchMock);

    await getExperiment("experiment_123");
    await expect(openWorkbenchTool("experiment_123", { slot_id: "station_1" })).resolves.toMatchObject({
      id: "experiment_123",
      workbench: {
        slots: [
          {
            id: "station_1",
            tool: {
              id: "bench_tool_1",
              isSealed: false,
              closureFault: null,
              toolId: "hdpe_storage_jar_2l",
              toolType: "storage_jar",
            },
          },
        ],
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/workbench/tools/bench_tool_1/open",
      {
        method: "POST",
      },
    );
  });

  it("sends debug produce overrides when spawning on the workbench", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createDebugProduceLotOnWorkbench("experiment_123", {
        preset_id: "apple_powder_residual_co2",
        total_mass_g: 2450,
        residual_co2_mass_g: 24,
        target_slot_id: "station_1",
        temperature_c: -70,
      }),
    ).resolves.toEqual(experiment);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/debug/produce-presets/apple_powder_residual_co2/spawn-on-workbench",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_slot_id: "station_1",
          total_mass_g: 2450,
          temperature_c: -70,
          residual_co2_mass_g: 24,
        }),
      },
    );
  });

  it("sends debug produce overrides when spawning on a widget", async () => {
    const experiment = makeExperiment();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => experiment,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createDebugProduceLotToWidget("experiment_123", {
        preset_id: "apple_powder_residual_co2",
        total_mass_g: 2450,
        residual_co2_mass_g: 12,
        temperature_c: -55,
        widget_id: "grinder",
      }),
    ).resolves.toEqual(experiment);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/experiments/experiment_123/debug/produce-presets/apple_powder_residual_co2/spawn-on-widget",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          widget_id: "grinder",
          total_mass_g: 2450,
          temperature_c: -55,
          residual_co2_mass_g: 12,
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
                liquids: [],
              },
            },
          ],
        },
        trash: {
          produce_lots: [
            {
              id: "trash_produce_lot_1",
              origin_label: "Sealed sampling bag",
              produce_lot: {
                id: "produce_1",
                label: "Apple lot 1",
                produce_type: "apple",
                total_mass_g: 2450.0,
                unit_count: 12,
              },
            },
          ],
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
              grind_quality_label: "powder_fine",
              homogeneity_score: 0.94,
            },
          ],
          widgets: [
            {
              id: "rack",
              widget_type: "autosampler_rack",
              label: "Autosampler rack",
              anchor: "top-left",
              offset_x: 234,
              offset_y: 886,
              is_present: false,
              is_trashed: true,
            },
          ],
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const experiment = await getExperiment("experiment_123");

    expect(experiment.workbench.slots[0].tool?.toolId).toBe("sample_vial_lcms");
    expect(experiment.workbench.slots[0].tool?.toolType).toBe("sample_vial");
    expect(experiment.workbench.slots[0].tool?.liquids[0].liquidId).toBe(
      "acetonitrile_extraction",
    );
    expect(experiment.rack.slots[0].tool?.toolId).toBe("sample_vial_lcms");
    expect(experiment.trash.tools[0]?.originLabel).toBe("Station 1");
    expect(experiment.trash.produceLots[0]?.originLabel).toBe("Sealed sampling bag");
    expect(experiment.trash.produceLots[0]?.produceLot.label).toBe("Apple lot 1");
    expect(experiment.workspace.widgets[0]?.widgetType).toBe("autosampler_rack");
    expect(experiment.workspace.widgets[0]?.anchor).toBe("top-left");
    expect(experiment.workspace.widgets[0]?.offsetX).toBe(234);
    expect(experiment.workspace.widgets[0]?.isTrashed).toBe(true);
    expect(experiment.workspace.produceLots[0]?.produceType).toBe("apple");
    expect(experiment.workspace.produceLots[0]?.label).toBe("Apple lot 1");
    expect(experiment.workspace.produceLots[0]?.unitCount).toBe(12);
    expect(experiment.workspace.produceLots[0]?.totalMassG).toBe(2450);
    expect(experiment.workspace.produceLots[0]?.grindQualityLabel).toBe("powder_fine");
    expect(experiment.workspace.produceLots[0]?.homogeneityScore).toBe(0.94);
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

    await expect(
      placeToolOnWorkbench("experiment_123", {
        slot_id: "station_1",
        tool_id: "sample_vial_lcms",
      }),
    ).rejects.toThrow("Failed to send experiment mutation");
  });

  it("subscribes to the experiment stream over WebSocket", () => {
    const onMessage = vi.fn();
    const close = vi.fn();
    const socket = {
      close,
      onerror: null,
      onmessage: null,
    };
    const webSocketMock = vi.fn(() => socket);

    vi.stubGlobal("WebSocket", webSocketMock);

    const unsubscribe = subscribeToExperimentStream("experiment_123", { onMessage });

    expect(webSocketMock).toHaveBeenCalledWith("ws://localhost:8000/experiments/experiment_123/stream");
    unsubscribe();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("reconnects the experiment stream after an unexpected socket close", () => {
    vi.useFakeTimers();

    const sockets: Array<{
      close: ReturnType<typeof vi.fn>;
      onclose: null | (() => void);
      onerror: null | (() => void);
      onmessage: null | ((event: { data: string }) => void);
      onopen: null | (() => void);
      readyState: number;
    }> = [];
    const webSocketMock = vi.fn(() => {
      const socket = {
        close: vi.fn(),
        onclose: null,
        onerror: null,
        onmessage: null,
        onopen: null,
        readyState: 1,
      };
      sockets.push(socket);
      return socket;
    });

    vi.stubGlobal("WebSocket", webSocketMock);

    const unsubscribe = subscribeToExperimentStream("experiment_123", { onMessage: vi.fn() });

    expect(webSocketMock).toHaveBeenCalledTimes(1);

    sockets[0]?.onclose?.();

    vi.advanceTimersByTime(1000);

    expect(webSocketMock).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("surfaces backend error detail for command execution failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Experiment not found" }),
      }),
    );

    await expect(
      placeToolOnWorkbench("experiment_123", {
        slot_id: "station_1",
        tool_id: "sample_vial_lcms",
      }),
    ).rejects.toThrow("Experiment not found");
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
