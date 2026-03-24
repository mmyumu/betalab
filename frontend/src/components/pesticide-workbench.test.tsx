import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PesticideWorkbench } from "@/components/pesticide-workbench";
import type { Experiment } from "@/types/experiment";
import type { BenchSlot, BenchToolInstance, ExperimentWorkspaceWidget, RackSlot, TrashToolEntry } from "@/types/workbench";

vi.mock("@/lib/api", () => ({
  createExperiment: vi.fn(),
  sendExperimentCommand: vi.fn(),
}));

import { createExperiment, sendExperimentCommand } from "@/lib/api";

type MockDataTransfer = {
  data: Map<string, string>;
  dropEffect: string;
  effectAllowed: string;
  types: string[];
  getData: (type: string) => string;
  setData: (type: string, value: string) => void;
};

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
};

function createDataTransfer(): MockDataTransfer {
  const data = new Map<string, string>();
  const dataTransfer = {
    data,
    dropEffect: "copy",
    effectAllowed: "copy",
    types: [] as string[],
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => {
      data.set(type, value);
      dataTransfer.types = Array.from(data.keys());
    },
  };

  return dataTransfer;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, reject, resolve };
}

function makeSlots(overrides: Partial<BenchSlot>[] = [], count = Math.max(2, overrides.length)): BenchSlot[] {
  const baseSlots: BenchSlot[] = Array.from({ length: count }, (_, index) => ({
    id: `station_${index + 1}`,
    label: `Station ${index + 1}`,
    tool: null,
  }));

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
    trashable: true,
    liquids: [],
    ...overrides,
  };
}

function makeRackSlots(overrides: Partial<RackSlot>[] = []): RackSlot[] {
  const baseSlots: RackSlot[] = Array.from({ length: 12 }, (_, index) => ({
    id: `rack_slot_${index + 1}`,
    label: `Position ${index + 1}`,
    tool: null,
  }));

  return baseSlots.map((slot, index) => ({
    ...slot,
    ...(overrides[index] ?? {}),
  }));
}

function makeWorkspaceWidgets(
  overrides: Partial<ExperimentWorkspaceWidget>[] = [],
): ExperimentWorkspaceWidget[] {
  const baseWidgets: ExperimentWorkspaceWidget[] = [
    {
      id: "workbench",
      widgetType: "workbench",
      label: "Workbench",
      x: 234,
      y: 0,
      isPresent: true,
      isTrashed: false,
      trashable: false,
    },
    {
      id: "trash",
      widgetType: "trash",
      label: "Trash",
      x: 1530,
      y: 0,
      isPresent: true,
      isTrashed: false,
      trashable: false,
    },
    {
      id: "rack",
      widgetType: "autosampler_rack",
      label: "Autosampler rack",
      x: 234,
      y: 886,
      isPresent: false,
      isTrashed: false,
      trashable: true,
    },
    {
      id: "instrument",
      widgetType: "lc_msms_instrument",
      label: "LC-MS/MS",
      x: 812,
      y: 886,
      isPresent: false,
      isTrashed: false,
      trashable: true,
    },
    {
      id: "basket",
      widgetType: "produce_basket",
      label: "Produce basket",
      x: 1460,
      y: 248,
      isPresent: false,
      isTrashed: false,
      trashable: true,
    },
  ];

  return baseWidgets.map((widget, index) => ({
    ...widget,
    ...(overrides[index] ?? {}),
  }));
}

function makeWorkbenchExperiment({
  auditLog = ["Experiment created", "Start by dragging an extraction tool onto the bench."],
  rackSlots = makeRackSlots(),
  slots = makeSlots(),
  trashTools = [],
  workspaceWidgets = makeWorkspaceWidgets(),
}: {
  auditLog?: string[];
  rackSlots?: RackSlot[];
  slots?: BenchSlot[];
  trashTools?: TrashToolEntry[];
  workspaceWidgets?: ExperimentWorkspaceWidget[];
} = {}): Experiment {
  return {
    id: "experiment_pesticides",
    status: "preparing",
    workbench: { slots },
    rack: { slots: rackSlots },
    trash: { tools: trashTools },
    workspace: { widgets: workspaceWidgets },
    audit_log: auditLog,
  };
}

function makeTrashToolEntry(overrides: Partial<TrashToolEntry> = {}): TrashToolEntry {
  return {
    id: "trash_tool_1",
    originLabel: "Station 1",
    tool: makeTool(),
    ...overrides,
  };
}

function makeWorkspaceWithRackVisible(overrides: Partial<ExperimentWorkspaceWidget> = {}) {
  return makeWorkspaceWidgets([{}, {}, { isPresent: true, ...overrides }, {}, {}]);
}

function makeWorkspaceWithRackAndInstrumentVisible(
  rackOverrides: Partial<ExperimentWorkspaceWidget> = {},
  instrumentOverrides: Partial<ExperimentWorkspaceWidget> = {},
) {
  return makeWorkspaceWidgets([
    {},
    {},
    { isPresent: true, ...rackOverrides },
    { isPresent: true, ...instrumentOverrides },
    {},
  ]);
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
      expect(screen.getAllByText("Empty station")).toHaveLength(2);
    });

    expect(screen.getByTestId("toolbar-item-autosampler_rack_widget")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-item-lc_msms_instrument_widget")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-item-produce_basket_widget")).toBeInTheDocument();
    expect(screen.queryByTestId("widget-rack")).not.toBeInTheDocument();
    expect(screen.queryByTestId("widget-instrument")).not.toBeInTheDocument();
    expect(screen.queryByTestId("widget-basket")).not.toBeInTheDocument();
  });

  it("starts with two workbench stations and can add a station", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Station 3 added to workbench."],
        slots: makeSlots([], 3),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByText("Station 1")).toBeInTheDocument();
      expect(screen.getByText("Station 2")).toBeInTheDocument();
    });

    expect(screen.queryByText("Station 3")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("add-workbench-slot-button"));

    await waitFor(() => {
      expect(screen.getByText("Station 3")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "add_workbench_slot",
      {},
    );
  });

  it("removes an empty workbench station", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([], 3),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Station 3 removed from workbench."],
        slots: makeSlots(),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByText("Station 3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("remove-workbench-slot-button-station_3"));

    await waitFor(() => {
      expect(screen.queryByText("Station 3")).not.toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "remove_workbench_slot",
      { slot_id: "station_3" },
    );
  });

  it("lets the user drag widgets around the workspace", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-toolbar")).toBeInTheDocument();
    });

    const toolbarWidget = screen.getByTestId("widget-toolbar");

    expect(toolbarWidget).toHaveStyle({ left: "0px", top: "0px" });

    fireEvent.mouseDown(screen.getByText("Palette"), { button: 0, clientX: 24, clientY: 16 });
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 164, clientY: 156 }));
    window.dispatchEvent(new MouseEvent("mouseup"));

    await waitFor(() => {
      expect(toolbarWidget).toHaveStyle({ left: "140px", top: "140px" });
    });
  });

  it("shows the backend error state and retries experiment creation", async () => {
    vi.mocked(createExperiment)
      .mockRejectedValueOnce(new Error("Backend unavailable"))
      .mockResolvedValueOnce(makeWorkbenchExperiment());

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByText("Backend connection error")).toBeInTheDocument();
    });

    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getAllByText("Empty station")).toHaveLength(2);
    });

    expect(createExperiment).toHaveBeenCalledTimes(2);
  });

  it("adds workspace equipment widgets when dropped from the palette into the canvas", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand)
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWidgets([{}, {}, {}, {}, { isPresent: true, x: 379, y: 388 }]),
        }),
      )
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWithRackVisible({ x: 379, y: 388 }),
        }),
      )
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWithRackAndInstrumentVisible(
            { x: 379, y: 388 },
            { x: 655, y: 388 },
          ),
        }),
      );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-workspace")).toBeInTheDocument();
    });

    const workspace = screen.getByTestId("widget-workspace");
    const basketTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByTestId("toolbar-item-produce_basket_widget"), {
      dataTransfer: basketTransfer,
    });
    fireEvent.dragOver(workspace, { dataTransfer: basketTransfer });
    fireEvent.drop(workspace, { clientX: 360, clientY: 420, dataTransfer: basketTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-basket")).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId("widget-basket")).getByTestId("produce-basket-illustration"),
    ).toHaveAttribute(
      "data-item-count",
      "6",
    );

    const rackTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByTestId("toolbar-item-autosampler_rack_widget"), {
      dataTransfer: rackTransfer,
    });
    fireEvent.dragOver(workspace, { dataTransfer: rackTransfer });
    fireEvent.drop(workspace, { clientX: 480, clientY: 420, dataTransfer: rackTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-occupied-count",
      "0",
    );

    const instrumentTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-lc_msms_instrument_widget"), {
      dataTransfer: instrumentTransfer,
    });
    fireEvent.dragOver(workspace, { dataTransfer: instrumentTransfer });
    fireEvent.drop(workspace, { clientX: 980, clientY: 420, dataTransfer: instrumentTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-instrument")).toBeInTheDocument();
    });

    expect(screen.getByTestId("lc-msms-instrument-illustration")).toHaveAttribute(
      "data-status",
      "idle",
    );
  });

  it("does not create duplicate equipment widgets when the same palette item is dropped twice", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand)
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWithRackVisible({ x: 206, y: 388 }),
        }),
      )
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWithRackVisible({ x: 466, y: 488 }),
        }),
      );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-workspace")).toBeInTheDocument();
    });

    const workspace = screen.getByTestId("widget-workspace");
    const rackTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByTestId("toolbar-item-autosampler_rack_widget"), {
      dataTransfer: rackTransfer,
    });
    fireEvent.dragOver(workspace, { dataTransfer: rackTransfer });
    fireEvent.drop(workspace, { clientX: 480, clientY: 420, dataTransfer: rackTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    fireEvent.dragStart(screen.getByTestId("toolbar-item-autosampler_rack_widget"), {
      dataTransfer: rackTransfer,
    });
    fireEvent.dragOver(workspace, { dataTransfer: rackTransfer });
    fireEvent.drop(workspace, { clientX: 740, clientY: 520, dataTransfer: rackTransfer });

    expect(screen.getAllByTestId("widget-rack")).toHaveLength(1);
  });

  it("ignores non-equipment drops on the workspace canvas", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-workspace")).toBeInTheDocument();
    });

    const workspace = screen.getByTestId("widget-workspace");
    const toolTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.dragOver(workspace, { dataTransfer: toolTransfer });
    fireEvent.drop(workspace, { clientX: 480, clientY: 420, dataTransfer: toolTransfer });

    expect(screen.queryByTestId("widget-rack")).not.toBeInTheDocument();
    expect(screen.queryByTestId("widget-instrument")).not.toBeInTheDocument();
    expect(sendExperimentCommand).not.toHaveBeenCalled();
  });

  it("accepts dragover on an empty station when dragging a tool from the palette", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Autosampler vial placed on Station 1."],
        slots: makeSlots([{ tool: makeTool() }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("bench-slot-station_1")).toBeInTheDocument();
    });

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: toolTransfer,
    });

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer: toolTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer: toolTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_1")).getByText("Autosampler vial"),
      ).toBeInTheDocument();
    });
  });

  it("highlights only the workspace canvas when dragging a workspace widget from the palette", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-workspace")).toBeInTheDocument();
    });

    const widgetTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-autosampler_rack_widget"), {
      dataTransfer: widgetTransfer,
    });

    expect(screen.getByTestId("widget-workspace")).toHaveAttribute("data-drop-highlighted", "true");
    expect(screen.getByTestId("bench-slot-station_1")).toHaveAttribute("data-drop-highlighted", "false");
    expect(screen.getByTestId("trash-dropzone")).toHaveAttribute("data-drop-highlighted", "false");

    fireEvent.dragEnd(screen.getByTestId("toolbar-item-autosampler_rack_widget"));

    expect(screen.getByTestId("widget-workspace")).toHaveAttribute("data-drop-highlighted", "false");
  });

  it("highlights only occupied compatible stations when dragging a liquid", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool() }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("bench-slot-station_1")).toBeInTheDocument();
    });

    const liquidTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-acetonitrile_extraction"), {
      dataTransfer: liquidTransfer,
    });

    expect(screen.getByTestId("bench-slot-station_1")).toHaveAttribute("data-drop-highlighted", "true");
    expect(screen.getByTestId("bench-slot-station_2")).toHaveAttribute("data-drop-highlighted", "false");
    expect(screen.getByTestId("widget-workspace")).toHaveAttribute("data-drop-highlighted", "false");
    expect(screen.getByTestId("trash-dropzone")).toHaveAttribute("data-drop-highlighted", "false");

    fireEvent.dragEnd(screen.getByTestId("toolbar-item-acetonitrile_extraction"));

    expect(screen.getByTestId("bench-slot-station_1")).toHaveAttribute("data-drop-highlighted", "false");
  });

  it("highlights stations, rack slots, and trash when dragging an autosampler vial", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool() }]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool() }]),
        workspaceWidgets: makeWorkspaceWithRackVisible({ x: 206, y: 388 }),
      }),
    );

    render(<PesticideWorkbench />);

    const workspace = await screen.findByTestId("widget-workspace");
    const rackTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-autosampler_rack_widget"), {
      dataTransfer: rackTransfer,
    });
    fireEvent.drop(workspace, { clientX: 480, clientY: 420, dataTransfer: rackTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    const vialTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("bench-tool-card-bench_tool_1"), {
      dataTransfer: vialTransfer,
    });

    expect(screen.getByTestId("bench-slot-station_2")).toHaveAttribute("data-drop-highlighted", "true");
    expect(screen.getByTestId("rack-illustration-slot-1")).toHaveAttribute("data-drop-highlighted", "true");
    expect(screen.getByTestId("trash-dropzone")).toHaveAttribute("data-drop-highlighted", "true");
    expect(screen.getByTestId("widget-workspace")).toHaveAttribute("data-drop-highlighted", "false");

    fireEvent.dragEnd(screen.getByTestId("bench-tool-card-bench_tool_1"));

    expect(screen.getByTestId("bench-slot-station_2")).toHaveAttribute("data-drop-highlighted", "false");
    expect(screen.getByTestId("rack-illustration-slot-1")).toHaveAttribute("data-drop-highlighted", "false");
    expect(screen.getByTestId("trash-dropzone")).toHaveAttribute("data-drop-highlighted", "false");
  });

  it("discards a bench tool when dropped into the trash", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool({ toolType: "beaker", toolId: "beaker_rinse", label: "Bench beaker" }) }]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Bench beaker discarded from Station 1."],
        slots: makeSlots(),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("bench-tool-card-bench_tool_1")).toBeInTheDocument();
    });

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("bench-tool-card-bench_tool_1"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("trash-dropzone"), { dataTransfer: toolTransfer });
    fireEvent.drop(screen.getByTestId("trash-dropzone"), { dataTransfer: toolTransfer });

    await waitFor(() => {
      expect(within(screen.getByTestId("bench-slot-station_1")).getByText("Empty station")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "discard_workbench_tool",
      { slot_id: "station_1" },
    );
  });

  it("discards a rack vial when dropped into the trash", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        rackSlots: makeRackSlots([{ tool: makeTool() }]),
        workspaceWidgets: makeWorkspaceWithRackVisible(),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Autosampler vial discarded from Position 1."],
        rackSlots: makeRackSlots(),
        workspaceWidgets: makeWorkspaceWithRackVisible(),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("rack-slot-tool-1")).toBeInTheDocument();
    });

    const vialTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("rack-slot-tool-1"), {
      dataTransfer: vialTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("trash-dropzone"), { dataTransfer: vialTransfer });
    fireEvent.drop(screen.getByTestId("trash-dropzone"), { dataTransfer: vialTransfer });

    await waitFor(() => {
      expect(screen.queryByTestId("rack-slot-tool-1")).not.toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "discard_rack_tool",
      { rack_slot_id: "rack_slot_1" },
    );
  });

  it("removes a workspace equipment widget when dropped on the trash", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand)
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWithRackVisible({ x: 206, y: 388 }),
        }),
      )
      .mockResolvedValueOnce(
        makeWorkbenchExperiment({
          workspaceWidgets: makeWorkspaceWidgets(),
        }),
      );

    render(<PesticideWorkbench />);

    const workspace = await screen.findByTestId("widget-workspace");
    const rackTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-autosampler_rack_widget"), {
      dataTransfer: rackTransfer,
    });
    fireEvent.drop(workspace, { clientX: 480, clientY: 420, dataTransfer: rackTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Workspace Equipment"), {
      button: 0,
      clientX: 500,
      clientY: 430,
    });
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 1600, clientY: 140 }));

    await waitFor(() => {
      expect(screen.queryByTestId("widget-rack")).not.toBeInTheDocument();
    });
  });

  it("does not remove the workbench when dragged onto the trash", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-workbench")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Workbench"), {
      button: 0,
      clientX: 260,
      clientY: 24,
    });
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 1600, clientY: 140 }));

    expect(screen.getByTestId("widget-workbench")).toBeInTheDocument();
  });

  it("opens the trash view on click and lists deleted tools and widgets from the backend", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        trashTools: [
          makeTrashToolEntry({
            tool: makeTool({ liquids: [{ accent: "amber", id: "liq_1", liquidId: "acetonitrile", name: "Acetonitrile", volume_ml: 1 }] }),
          }),
        ],
        workspaceWidgets: makeWorkspaceWidgets([{}, {}, { isPresent: false, isTrashed: true }, { isPresent: false, isTrashed: true }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("trash-dropzone")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("trash-dropzone"));

    const dialog = await screen.findByRole("dialog");
    expect(screen.getByTestId("trash-dialog-overlay")).toHaveClass("absolute");
    expect(screen.getByTestId("trash-dialog-overlay")).toHaveClass("top-full");
    expect(within(dialog).getByTestId("trash-tool-trash_tool_1")).toBeInTheDocument();
    expect(within(dialog).getByTestId("trash-widget-rack")).toBeInTheDocument();
    expect(within(dialog).getByTestId("trash-widget-instrument")).toBeInTheDocument();
  });

  it("restores a trashed tool to a workbench station from the trash view", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        trashTools: [makeTrashToolEntry()],
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool() }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("trash-dropzone")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("trash-dropzone"));

    const trashTool = await screen.findByTestId("trash-tool-trash_tool_1");
    const transfer = createDataTransfer();

    fireEvent.dragStart(trashTool, { dataTransfer: transfer });
    fireEvent.dragOver(screen.getByTestId("bench-slot-station_1"), { dataTransfer: transfer });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: transfer });

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_1")).getByText("Autosampler vial"),
      ).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "restore_trashed_tool_to_workbench_slot",
      { target_slot_id: "station_1", trash_tool_id: "trash_tool_1" },
    );
  });

  it("restores a deleted workspace widget from the trash view into the workspace", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        workspaceWidgets: makeWorkspaceWidgets([{}, {}, { isPresent: false, isTrashed: true }, {}]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        workspaceWidgets: makeWorkspaceWithRackVisible({ x: 379, y: 388 }),
      }),
    );

    render(<PesticideWorkbench />);

    const workspace = await screen.findByTestId("widget-workspace");
    fireEvent.click(screen.getByTestId("trash-dropzone"));

    const trashedWidget = await screen.findByTestId("trash-widget-rack");
    const transfer = createDataTransfer();

    fireEvent.dragStart(trashedWidget, { dataTransfer: transfer });
    fireEvent.dragOver(workspace, { dataTransfer: transfer });
    fireEvent.drop(workspace, { clientX: 480, clientY: 420, dataTransfer: transfer });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "add_workspace_widget",
      expect.objectContaining({ widget_id: "rack" }),
    );
  });

  it("moves any bench tool from one station to another through the generic drop system", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([
          {
            tool: makeTool({
              toolId: "beaker_rinse",
              label: "Bench beaker",
              subtitle: "Temporary holding",
              toolType: "beaker",
              capacity_ml: 100,
            }),
          },
        ]),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Bench beaker moved from Station 1 to Station 2."],
        slots: makeSlots([
          { tool: null },
          {
            tool: makeTool({
              toolId: "beaker_rinse",
              label: "Bench beaker",
              subtitle: "Temporary holding",
              toolType: "beaker",
              capacity_ml: 100,
            }),
          },
        ]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_1")).getByText("Bench beaker"),
      ).toBeInTheDocument();
    });

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("bench-tool-card-bench_tool_1"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("bench-slot-station_2"), { dataTransfer: toolTransfer });
    fireEvent.drop(screen.getByTestId("bench-slot-station_2"), { dataTransfer: toolTransfer });

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_2")).getByText("Bench beaker"),
      ).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "move_tool_between_workbench_slots",
      {
        source_slot_id: "station_1",
        target_slot_id: "station_2",
      },
    );
  });

  it("moves an autosampler vial from a station into the rack", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        workspaceWidgets: makeWorkspaceWithRackVisible({ x: 379, y: 388 }),
        slots: makeSlots([
          {
            tool: makeTool({
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 1.2,
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
        auditLog: ["Autosampler vial moved from Station 1 to Position 1."],
        workspaceWidgets: makeWorkspaceWithRackVisible({ x: 379, y: 388 }),
        rackSlots: makeRackSlots([{ tool: makeTool({
          liquids: [
            {
              id: "bench_liquid_1",
              liquidId: "acetonitrile_extraction",
              name: "Acetonitrile",
              volume_ml: 1.2,
              accent: "amber",
            },
          ],
        }) }]),
        slots: makeSlots([{ tool: null }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("bench-tool-card-bench_tool_1")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    const vialTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("bench-tool-card-bench_tool_1"), {
      dataTransfer: vialTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("rack-illustration-slot-1"), { dataTransfer: vialTransfer });
    fireEvent.drop(screen.getByTestId("rack-illustration-slot-1"), { dataTransfer: vialTransfer });

    await waitFor(() => {
      expect(within(screen.getByTestId("rack-slot-summary-1")).getByText("Autosampler vial")).toBeInTheDocument();
    });

    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-occupied-count",
      "1",
    );
    expect(screen.getByTestId("autosampler-rack-illustration-slot-liquid-1")).toHaveAttribute(
      "fill",
      "#f59e0b",
    );
    expect(within(screen.getByTestId("bench-slot-station_1")).getByText("Empty station")).toBeInTheDocument();
    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "place_workbench_tool_in_rack_slot",
      {
        source_slot_id: "station_1",
        rack_slot_id: "rack_slot_1",
      },
    );
  });

  it("moves an autosampler vial from the palette directly into the rack", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        workspaceWidgets: makeWorkspaceWithRackVisible({ x: 379, y: 388 }),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Autosampler vial placed in Position 1."],
        workspaceWidgets: makeWorkspaceWithRackVisible({ x: 379, y: 388 }),
        rackSlots: makeRackSlots([{ tool: makeTool() }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
    });

    const vialTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: vialTransfer,
    });

    expect(screen.getByTestId("rack-illustration-slot-1")).toHaveAttribute(
      "data-drop-highlighted",
      "true",
    );

    fireEvent.dragOver(screen.getByTestId("rack-illustration-slot-1"), { dataTransfer: vialTransfer });
    fireEvent.drop(screen.getByTestId("rack-illustration-slot-1"), { dataTransfer: vialTransfer });

    await waitFor(() => {
      expect(within(screen.getByTestId("rack-slot-summary-1")).getByText("Autosampler vial")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "place_tool_in_rack_slot",
      {
        rack_slot_id: "rack_slot_1",
        tool_id: "sample_vial_lcms",
      },
    );
  });

  it("returns a vial from the rack to a station through the backend rack model", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        rackSlots: makeRackSlots([{ tool: makeTool() }]),
        slots: makeSlots(),
        workspaceWidgets: makeWorkspaceWithRackVisible(),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Autosampler vial moved from Position 1 to Station 1."],
        rackSlots: makeRackSlots(),
        slots: makeSlots([{ tool: makeTool() }]),
        workspaceWidgets: makeWorkspaceWithRackVisible(),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("rack-slot-tool-1")).toBeInTheDocument();
    });

    const rackToBenchTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("rack-illustration-slot-1"), {
      dataTransfer: rackToBenchTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("bench-slot-station_1"), { dataTransfer: rackToBenchTransfer });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: rackToBenchTransfer });

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_1")).getByText("Autosampler vial"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("rack-slot-summary-1")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("rack-summary")).getByText("No vial staged yet.")).toBeInTheDocument();
    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "remove_rack_tool_to_workbench_slot",
      {
        rack_slot_id: "rack_slot_1",
        target_slot_id: "station_1",
      },
    );
  });

  it("moves a vial from the rack to another station through the generic drop system", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        rackSlots: makeRackSlots([{ tool: makeTool() }]),
        slots: makeSlots(),
        workspaceWidgets: makeWorkspaceWithRackVisible(),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        auditLog: ["Autosampler vial moved from Position 1 to Station 2."],
        rackSlots: makeRackSlots(),
        slots: makeSlots([
          { tool: null },
          { tool: makeTool() },
        ]),
        workspaceWidgets: makeWorkspaceWithRackVisible(),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("rack-slot-tool-1")).toBeInTheDocument();
    });

    const rackToBenchTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("rack-slot-tool-1"), {
      dataTransfer: rackToBenchTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("bench-slot-station_2"), { dataTransfer: rackToBenchTransfer });
    fireEvent.drop(screen.getByTestId("bench-slot-station_2"), { dataTransfer: rackToBenchTransfer });

    await waitFor(() => {
      expect(
        within(screen.getByTestId("bench-slot-station_2")).getByText("Autosampler vial"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("rack-slot-summary-1")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("rack-summary")).getByText("No vial staged yet.")).toBeInTheDocument();
    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "remove_rack_tool_to_workbench_slot",
      {
        rack_slot_id: "rack_slot_1",
        target_slot_id: "station_2",
      },
    );
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
      expect(screen.getAllByText("Empty station")).toHaveLength(2);
    });

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: toolTransfer });

    await waitFor(() => {
      expect(screen.getByText("Autosampler vial placed on Station 1.")).toBeInTheDocument();
    });

    expect(
      screen
        .getByTestId("bench-slot-station_1")
        .querySelector("[data-kind='sample_vial']"),
    ).toHaveAttribute("data-tone", "neutral");

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

    expect(
      screen
        .getByTestId("bench-slot-station_1")
        .querySelector("[data-kind='sample_vial']"),
    ).toHaveAttribute("data-tone", "neutral");
    expect(
      screen
        .getByTestId("bench-slot-station_1")
        .querySelector("[data-kind='sample_vial']"),
    ).toHaveAttribute("data-fill-segments", "1");

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

  it("shows a syncing status and ignores additional commands while one is pending", async () => {
    const deferredCommand = createDeferred<Experiment>();
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand).mockReturnValue(deferredCommand.promise);

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getAllByText("Empty station")).toHaveLength(2);
    });

    const firstTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: firstTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: firstTransfer });

    await waitFor(() => {
      expect(screen.getByText(/Syncing\.\.\./)).toBeInTheDocument();
    });

    const secondTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-beaker_rinse"), {
      dataTransfer: secondTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_2"), { dataTransfer: secondTransfer });

    expect(sendExperimentCommand).toHaveBeenCalledTimes(1);

    deferredCommand.resolve(
      makeWorkbenchExperiment({
        auditLog: ["Autosampler vial placed on Station 1."],
        slots: makeSlots([{ tool: makeTool() }]),
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Autosampler vial placed on Station 1.")).toBeInTheDocument();
    });
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

  it("lets the user remove a liquid from a tool through a backend command", async () => {
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
        auditLog: ["Acetonitrile removed from Autosampler vial."],
        slots: makeSlots([{ tool: makeTool({ liquids: [] }) }]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Remove Acetonitrile" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Acetonitrile" }));

    await waitFor(() => {
      expect(screen.getByText("Acetonitrile removed from Autosampler vial.")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "remove_liquid_from_workbench_tool",
      {
        slot_id: "station_1",
        liquid_entry_id: "bench_liquid_1",
      },
    );
    expect(screen.queryByLabelText("Acetonitrile volume")).not.toBeInTheDocument();
  });

  it("surfaces backend command failures in the status panel without mutating the bench", async () => {
    vi.mocked(createExperiment).mockResolvedValue(makeWorkbenchExperiment());
    vi.mocked(sendExperimentCommand).mockRejectedValue(new Error("Station 1 is unavailable"));

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getAllByText("Empty station")).toHaveLength(2);
    });

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-sample_vial_lcms"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: toolTransfer });

    await waitFor(() => {
      expect(screen.getByText("Station 1 is unavailable")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Empty station")).toHaveLength(2);
    expect(sendExperimentCommand).toHaveBeenCalledTimes(1);
  });

  it("accepts a second liquid drop on a station that already contains a filled tool", async () => {
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
                  volume_ml: 1,
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
        auditLog: ["Ultrapure water added to Autosampler vial."],
        slots: makeSlots([
          {
            tool: makeTool({
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 1,
                  accent: "amber",
                },
                {
                  id: "bench_liquid_2",
                  liquidId: "ultrapure_water",
                  name: "Ultrapure water",
                  volume_ml: 1,
                  accent: "sky",
                },
              ],
            }),
          },
        ]),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("bench-slot-station_1")).toBeInTheDocument();
    });

    const liquidTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-ultrapure_water_rinse"), {
      dataTransfer: liquidTransfer,
    });

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer: liquidTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer: liquidTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(screen.getByText("Ultrapure water added to Autosampler vial.")).toBeInTheDocument();
    });

    expect(sendExperimentCommand).toHaveBeenCalledWith(
      "experiment_pesticides",
      "add_liquid_to_workbench_tool",
      { slot_id: "station_1", liquid_id: "ultrapure_water_rinse" },
    );
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

  it("marks the rack and instrument as ready when a vial is staged in the rack", async () => {
    vi.mocked(createExperiment).mockResolvedValue(
      makeWorkbenchExperiment({
        slots: makeSlots([{ tool: makeTool() }]),
        workspaceWidgets: makeWorkspaceWithRackAndInstrumentVisible(),
      }),
    );
    vi.mocked(sendExperimentCommand).mockResolvedValue(
      makeWorkbenchExperiment({
        rackSlots: makeRackSlots([{ tool: makeTool() }]),
        slots: makeSlots([{ tool: null }]),
        workspaceWidgets: makeWorkspaceWithRackAndInstrumentVisible(),
      }),
    );

    render(<PesticideWorkbench />);

    await waitFor(() => {
      expect(screen.getByTestId("bench-tool-card-bench_tool_1")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
      expect(screen.getByTestId("widget-instrument")).toBeInTheDocument();
    });

    const vialTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("bench-tool-card-bench_tool_1"), {
      dataTransfer: vialTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("rack-illustration-slot-1"), { dataTransfer: vialTransfer });
    fireEvent.drop(screen.getByTestId("rack-illustration-slot-1"), { dataTransfer: vialTransfer });

    await waitFor(() => {
      expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
        "data-occupied-count",
        "1",
      );
    });

    expect(screen.getByTestId("autosampler-rack-illustration")).toHaveAttribute(
      "data-tone",
      "active",
    );
    expect(screen.getByTestId("lc-msms-instrument-illustration")).toHaveAttribute(
      "data-status",
      "ready",
    );
  });
});
