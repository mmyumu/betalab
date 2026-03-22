import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PesticideWorkbench } from "@/components/pesticide-workbench";
import type { Experiment } from "@/types/experiment";
import type { BenchSlot, BenchToolInstance } from "@/types/workbench";

vi.mock("@/lib/api", () => ({
  createExperiment: vi.fn(),
  sendExperimentCommand: vi.fn(),
}));

import { createExperiment, sendExperimentCommand } from "@/lib/api";

type MockDataTransfer = {
  data: Map<string, string>;
  dropEffect: string;
  effectAllowed: string;
  getData: (type: string) => string;
  setData: (type: string, value: string) => void;
};

function createDataTransfer(): MockDataTransfer {
  const data = new Map<string, string>();

  return {
    data,
    dropEffect: "copy",
    effectAllowed: "copy",
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
  };
}

function makeSlots(overrides: Partial<BenchSlot>[] = []): BenchSlot[] {
  const baseSlots: BenchSlot[] = [
    { id: "station_1", label: "Station 1", tool: null },
    { id: "station_2", label: "Station 2", tool: null },
    { id: "station_3", label: "Station 3", tool: null },
    { id: "station_4", label: "Station 4", tool: null },
  ];

  return baseSlots.map((slot, index) => ({
    ...slot,
    ...(overrides[index] ?? {}),
  }));
}

function makeTool(overrides: Partial<BenchToolInstance> = {}): BenchToolInstance {
  return {
    id: "bench_tool_1",
    toolId: "sample_vial_lcms",
    label: "Autosampler vial",
    subtitle: "Injection ready",
    accent: "sky",
    toolType: "sample_vial",
    capacity_ml: 2,
    accepts_liquids: true,
    liquids: [],
    ...overrides,
  };
}

function makeWorkbenchExperiment({
  auditLog = ["Experiment created", "Start by dragging an extraction tool onto the bench."],
  slots = makeSlots(),
}: {
  auditLog?: string[];
  slots?: BenchSlot[];
} = {}): Experiment {
  return {
    id: "experiment_pesticides",
    status: "preparing",
    workbench: { slots },
    audit_log: auditLog,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PesticideWorkbench", () => {
  it("starts with an empty bench loaded from the backend", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());

    render(<PesticideWorkbench />);

    expect(screen.getByText("Creating pesticide workbench from backend...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("Empty station")).toHaveLength(4);
    });

    const placedToolsCard = screen.getByText("Placed tools").closest("div");
    const liquidDropsCard = screen.getByText("Liquid drops").closest("div");

    expect(placedToolsCard).not.toBeNull();
    expect(liquidDropsCard).not.toBeNull();
    expect(within(placedToolsCard as HTMLElement).getByText("0")).toBeInTheDocument();
    expect(within(liquidDropsCard as HTMLElement).getByText("0")).toBeInTheDocument();
  });

  it("places a tool and then adds a liquid through backend commands", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand)
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          auditLog: ["Autosampler vial placed on Station 1."],
          slots: makeSlots([{ tool: makeTool() }]),
        }),
      )
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          auditLog: ["Acetonitrile added to Autosampler vial at 2 mL (remaining capacity)."],
          slots: makeSlots([
            {
              tool: makeTool({
                liquids: [
                  {
                    id: "bench_liquid_1",
                    liquidId: "acetonitrile_extraction",
                    name: "Acetonitrile",
                    volume_ml: 2,
                    accent: "amber",
                  },
                ],
              }),
            },
          ]),
        }),
      );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getAllByText("Empty station")).toHaveLength(4);
    });

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: toolTransfer });

    await waitFor(() => {
      expect(screen.getByText("Autosampler vial placed on Station 1.")).toBeInTheDocument();
    });

    const liquidTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-acetonitrile_extraction"), {
      dataTransfer: liquidTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: liquidTransfer });

    await waitFor(() => {
      expect(
        screen.getByText("Acetonitrile added to Autosampler vial at 2 mL (remaining capacity)."),
      ).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenNthCalledWith(
      1,
      "experiment_pesticides",
      "place_tool_on_workbench",
      { slot_id: "station_1", tool_id: "sample_vial_lcms" },
    );
    expect(sendExperimentCommand).toHaveBeenNthCalledWith(
      2,
      "experiment_pesticides",
      "add_liquid_to_workbench_tool",
      { slot_id: "station_1", liquid_id: "acetonitrile_extraction" },
    );
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
  });

  it("merges repeated drops of the same liquid via backend state", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool({ toolId: "centrifuge_tube_50ml", label: "50 mL centrifuge tube", toolType: "centrifuge_tube", capacity_ml: 50 }) }]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Acetonitrile increased to 20 mL in 50 mL centrifuge tube."],
        slots: makeSlots([
          {
            tool: makeTool({
              toolId: "centrifuge_tube_50ml",
              label: "50 mL centrifuge tube",
              toolType: "centrifuge_tube",
              capacity_ml: 50,
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 20,
                  accent: "amber",
                },
              ],
            }),
          },
        ]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_1")).getByText("50 mL centrifuge tube"),
      ).toBeInTheDocument();
    });

    const liquidTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-acetonitrile_extraction"), {
      dataTransfer: liquidTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: liquidTransfer });

    await waitFor(() => {
      expect(screen.getByText("Acetonitrile increased to 20 mL in 50 mL centrifuge tube.")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Acetonitrile volume")).toHaveLength(1);
  });

  it("lets the user edit the liquid volume through a backend command", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([
          {
            tool: makeTool({
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 2,
                  accent: "amber",
                },
              ],
            }),
          },
        ]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Acetonitrile adjusted to 1.5 mL in Autosampler vial."],
        slots: makeSlots([
          {
            tool: makeTool({
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 1.5,
                  accent: "amber",
                },
              ],
            }),
          },
        ]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Acetonitrile volume"), { target: { value: "1.5" } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.5")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "update_workbench_liquid_volume",
      {
        slot_id: "station_1",
        liquid_entry_id: "bench_liquid_1",
        volume_ml: 1.5,
      },
    );
    expect(screen.getByText("Acetonitrile adjusted to 1.5 mL in Autosampler vial.")).toBeInTheDocument();
  });

  it("changes the volume with the mouse wheel only while the input is focused", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([
          {
            tool: makeTool({
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 2,
                  accent: "amber",
                },
              ],
            }),
          },
        ]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Acetonitrile adjusted to 1.9 mL in Autosampler vial."],
        slots: makeSlots([
          {
            tool: makeTool({
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 1.9,
                  accent: "amber",
                },
              ],
            }),
          },
        ]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });

    const volumeInput = screen.getByLabelText("Acetonitrile volume");
    fireEvent.focus(volumeInput);
    fireEvent.wheel(volumeInput, { deltaY: 100 });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.9")).toBeInTheDocument();
    });

    fireEvent.blur(volumeInput);
    fireEvent.wheel(volumeInput, { deltaY: -100 });
    expect(sendExperimentCommand).toHaveBeenCalledTimes(1);
  });
});
