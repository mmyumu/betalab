import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import {
  writeBenchToolDragPayload,
  writeProduceDragPayload,
  writeRackToolDragPayload,
  writeToolbarDragPayload,
} from "@/lib/workbench-dnd";
import type { BenchSlot } from "@/types/workbench";

const slots: BenchSlot[] = [
  { id: "station_1", label: "Station 1", tool: null },
  { id: "station_2", label: "Station 2", tool: null },
];

type MockDataTransfer = DataTransfer & {
  data: Map<string, string>;
  types: string[];
};

function createDataTransfer(): MockDataTransfer {
  const data = new Map<string, string>();

  return {
    data,
    dropEffect: "copy",
    effectAllowed: "copy",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: (format?: string) => {
      if (format) {
        data.delete(format);
      } else {
        data.clear();
      }
    },
    getData: (format: string) => data.get(format) ?? "",
    setData: (format: string, value: string) => {
      data.set(format, value);
    },
    setDragImage: () => {},
  };
}

function syncTypes(dataTransfer: MockDataTransfer) {
  Object.defineProperty(dataTransfer, "types", {
    configurable: true,
    value: Array.from(dataTransfer.data.keys()),
  });
}

function writePayload(
  dataTransfer: MockDataTransfer,
  payload: Parameters<typeof writeToolbarDragPayload>[1],
) {
  writeToolbarDragPayload(dataTransfer, payload);
  syncTypes(dataTransfer);
}

describe("PesticideWorkbenchPanel", () => {
  it("renders empty stations with add/remove controls", () => {
    render(
      <PesticideWorkbenchPanel
        onAddWorkbenchSlot={vi.fn()}
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onRemoveWorkbenchSlot={vi.fn()}
        slots={slots}
        statusMessage="Start by dragging an extraction tool onto the bench."
        onToolbarItemDrop={vi.fn()}
      />,
    );

    expect(screen.getByText("Station 1")).toBeInTheDocument();
    expect(screen.getByText("Station 2")).toBeInTheDocument();
    expect(screen.getAllByText("Empty station")).toHaveLength(2);
    expect(screen.getByTestId("add-workbench-slot-button")).toBeInTheDocument();
    expect(screen.getByTestId("remove-workbench-slot-button-station_1")).toBeEnabled();
  });

  it("adds a station and only allows removing empty ones", () => {
    const onAddWorkbenchSlot = vi.fn();
    const onRemoveWorkbenchSlot = vi.fn();

    render(
      <PesticideWorkbenchPanel
        onAddWorkbenchSlot={onAddWorkbenchSlot}
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onRemoveWorkbenchSlot={onRemoveWorkbenchSlot}
        slots={[
          { id: "station_1", label: "Station 1", tool: null },
          {
            id: "station_2",
            label: "Station 2",
            tool: {
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
            },
          },
        ]}
        statusMessage="Ready."
        onToolbarItemDrop={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("add-workbench-slot-button"));
    fireEvent.click(screen.getByTestId("remove-workbench-slot-button-station_1"));

    expect(onAddWorkbenchSlot).toHaveBeenCalledTimes(1);
    expect(onRemoveWorkbenchSlot).toHaveBeenCalledWith("station_1");
    expect(screen.getByTestId("remove-workbench-slot-button-station_2")).toBeDisabled();
  });

  it("shows multi-liquid tools with multiple fill segments", () => {
    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_1",
              toolId: "centrifuge_tube_50ml",
              label: "50 mL centrifuge tube",
              subtitle: "Extraction ready",
              accent: "sky",
              toolType: "centrifuge_tube",
              capacity_ml: 50,
              accepts_liquids: true,
              trashable: true,
              liquids: [
                {
                  id: "bench_liquid_1",
                  liquidId: "acetonitrile_extraction",
                  name: "Acetonitrile",
                  volume_ml: 10,
                  accent: "amber",
                },
                {
                  id: "bench_liquid_2",
                  liquidId: "matrix_blank",
                  name: "Matrix blank",
                  volume_ml: 5,
                  accent: "emerald",
                },
              ],
            },
          },
        ]}
        statusMessage="Bench ready."
      />,
    );

    expect(
      screen
        .getByTestId("bench-slot-station_1")
        .querySelector("[data-kind='centrifuge_tube']"),
    ).toHaveAttribute("data-fill-segments", "2");
  });

  it("renders a filled sampling bag with visible produce state", () => {
    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_bag",
              toolId: "sealed_sampling_bag",
              label: "Sealed sampling bag",
              subtitle: "Field collection",
              accent: "emerald",
              toolType: "sample_bag",
              capacity_ml: 500,
              accepts_liquids: false,
              produceLots: [
                {
                  id: "produce_1",
                  label: "Apple lot 1",
                  produceType: "apple",
                  totalMassG: 2450,
                  unitCount: 12,
                },
              ],
              trashable: true,
              liquids: [],
            },
          },
        ]}
        statusMessage="Ready."
      />,
    );

    expect(
      screen
        .getByTestId("bench-slot-station_1")
        .querySelector("[data-kind='sample_bag']"),
    ).toHaveAttribute("data-produce-lot-count", "1");
    expect(screen.getByText("Apple lot 1")).toBeInTheDocument();
    expect(screen.getByText("12 units • 2.45 kg")).toBeInTheDocument();
  });

  it("accepts tool drags on stations and forwards the drop payload", () => {
    const onToolbarItemDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writePayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "tool",
      itemId: "sample_vial_lcms",
      itemType: "tool",
      sourceId: "sample_vial_lcms",
      sourceKind: "palette",
      toolType: "sample_vial",
      trashable: true,
    });

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={onToolbarItemDrop}
        slots={slots}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onToolbarItemDrop).toHaveBeenCalledWith("station_1", {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "tool",
      itemId: "sample_vial_lcms",
      itemType: "tool",
      sourceId: "sample_vial_lcms",
      sourceKind: "palette",
      toolType: "sample_vial",
      trashable: true,
    });
  });

  it("rejects liquid drags on empty stations", () => {
    const onToolbarItemDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writePayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "liquid",
      itemId: "acetonitrile_extraction",
      itemType: "liquid",
      liquidType: "acetonitrile",
      sourceId: "acetonitrile_extraction",
      sourceKind: "palette",
      trashable: false,
    });

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={onToolbarItemDrop}
        slots={slots}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(false);
    expect(onToolbarItemDrop).not.toHaveBeenCalled();
  });

  it("accepts liquid drags only on stations that already contain a compatible tool", () => {
    const onToolbarItemDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writePayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "liquid",
      itemId: "acetonitrile_extraction",
      itemType: "liquid",
      liquidType: "acetonitrile",
      sourceId: "acetonitrile_extraction",
      sourceKind: "palette",
      trashable: false,
    });

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={onToolbarItemDrop}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
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
            },
          },
          slots[1],
        ]}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onToolbarItemDrop).toHaveBeenCalledWith("station_1", {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "liquid",
      itemId: "acetonitrile_extraction",
      itemType: "liquid",
      liquidType: "acetonitrile",
      sourceId: "acetonitrile_extraction",
      sourceKind: "palette",
      trashable: false,
    });
  });

  it("rejects workspace widget drags on stations", () => {
    const onToolbarItemDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writePayload(dataTransfer, {
      allowedDropTargets: ["workspace_canvas"],
      entityKind: "workspace_widget",
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
      sourceId: "autosampler_rack_widget",
      sourceKind: "palette",
      trashable: true,
      widgetType: "autosampler_rack",
    });

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={onToolbarItemDrop}
        slots={slots}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(false);
    expect(onToolbarItemDrop).not.toHaveBeenCalled();
  });

  it("accepts produce drags only on stations containing a sealed sampling bag", () => {
    const onProduceDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "basket",
      trashable: false,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onProduceDrop={onProduceDrop}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_bag",
              toolId: "sealed_sampling_bag",
              label: "Sealed sampling bag",
              subtitle: "Field collection",
              accent: "emerald",
              toolType: "sample_bag",
              capacity_ml: 500,
              accepts_liquids: false,
              produceLots: [],
              trashable: true,
              liquids: [],
            },
          },
          slots[1],
        ]}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onProduceDrop).toHaveBeenCalledWith("station_1", {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "basket",
      trashable: false,
    });
  });

  it("rejects produce drags on stations without a sealed sampling bag", () => {
    const onProduceDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "basket",
      trashable: false,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onProduceDrop={onProduceDrop}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_tube",
              toolId: "centrifuge_tube_50ml",
              label: "50 mL centrifuge tube",
              subtitle: "Extraction ready",
              accent: "amber",
              toolType: "centrifuge_tube",
              capacity_ml: 50,
              accepts_liquids: true,
              produceLots: [],
              trashable: true,
              liquids: [],
            },
          },
          slots[1],
        ]}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(false);
    expect(onProduceDrop).not.toHaveBeenCalled();
  });

  it("rejects produce drags on sampling bags that already contain a lot", () => {
    const onProduceDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "produce",
      produceLotId: "produce_2",
      produceType: "apple",
      sourceId: "produce_2",
      sourceKind: "basket",
      trashable: false,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onProduceDrop={onProduceDrop}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_bag",
              toolId: "sealed_sampling_bag",
              label: "Sealed sampling bag",
              subtitle: "Field collection",
              accent: "emerald",
              toolType: "sample_bag",
              capacity_ml: 500,
              accepts_liquids: false,
              produceLots: [
                {
                  id: "produce_1",
                  label: "Apple lot 1",
                  produceType: "apple",
                  totalMassG: 2450,
                  unitCount: 12,
                },
              ],
              trashable: true,
              liquids: [],
            },
          },
          slots[1],
        ]}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(false);
    expect(onProduceDrop).not.toHaveBeenCalled();
  });

  it("accepts produce drags coming from a workbench sample bag on empty sampling bags", () => {
    const onProduceDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      trashable: false,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onProduceDrop={onProduceDrop}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_bag",
              toolId: "sealed_sampling_bag",
              label: "Sealed sampling bag",
              subtitle: "Field collection",
              accent: "emerald",
              toolType: "sample_bag",
              capacity_ml: 500,
              accepts_liquids: false,
              produceLots: [],
              trashable: true,
              liquids: [],
            },
          },
          {
            id: "station_2",
            label: "Station 2",
            tool: {
              id: "bench_tool_bag_2",
              toolId: "sealed_sampling_bag",
              label: "Sealed sampling bag",
              subtitle: "Field collection",
              accent: "emerald",
              toolType: "sample_bag",
              capacity_ml: 500,
              accepts_liquids: false,
              produceLots: [],
              trashable: true,
              liquids: [],
            },
          },
        ]}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_2");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onProduceDrop).toHaveBeenCalledWith("station_2", {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      trashable: false,
    });
  });

  it("accepts produce drags coming from trash on empty sampling bags", () => {
    const onProduceDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeProduceDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "trash",
      trashProduceLotId: "trash_produce_lot_1",
      trashable: false,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        onProduceDrop={onProduceDrop}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_bag",
              toolId: "sealed_sampling_bag",
              label: "Sealed sampling bag",
              subtitle: "Field collection",
              accent: "emerald",
              toolType: "sample_bag",
              capacity_ml: 500,
              accepts_liquids: false,
              produceLots: [],
              trashable: true,
              liquids: [],
            },
          },
          slots[1],
        ]}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_1");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onProduceDrop).toHaveBeenCalledWith("station_1", {
      allowedDropTargets: ["workbench_slot", "trash_bin"],
      entityKind: "produce",
      produceLotId: "produce_1",
      produceType: "apple",
      sourceId: "produce_1",
      sourceKind: "trash",
      trashProduceLotId: "trash_produce_lot_1",
      trashable: false,
    });
  });

  it("forwards bench-tool drops between stations", () => {
    const onBenchToolDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeBenchToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "tool",
      sourceId: "station_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      toolId: "beaker_rinse",
      toolType: "beaker",
      trashable: true,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onBenchToolDrop={onBenchToolDrop}
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={slots}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_2");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onBenchToolDrop).toHaveBeenCalledWith("station_2", {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "tool",
      sourceId: "station_1",
      sourceKind: "workbench",
      sourceSlotId: "station_1",
      toolId: "beaker_rinse",
      toolType: "beaker",
      trashable: true,
    });
  });

  it("forwards rack-tool drops onto stations", () => {
    const onBenchToolDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writeRackToolDragPayload(dataTransfer, {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "tool",
      rackSlotId: "rack_slot_1",
      sourceId: "rack_slot_1",
      sourceKind: "rack",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    });
    syncTypes(dataTransfer);

    render(
      <PesticideWorkbenchPanel
        onBenchToolDrop={onBenchToolDrop}
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={slots}
        statusMessage="Ready."
      />,
    );

    const station = screen.getByTestId("bench-slot-station_2");
    const dragOverEvent = createEvent.dragOver(station, { dataTransfer });
    fireEvent(station, dragOverEvent);
    fireEvent.drop(station, { dataTransfer });

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(onBenchToolDrop).toHaveBeenCalledWith("station_2", {
      allowedDropTargets: ["workbench_slot"],
      entityKind: "tool",
      rackSlotId: "rack_slot_1",
      sourceId: "rack_slot_1",
      sourceKind: "rack",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    });
  });

  it("exposes any configured bench tool as draggable", () => {
    render(
      <PesticideWorkbenchPanel
        canDragBenchTool={() => true}
        onBenchToolDragStart={vi.fn()}
        onLiquidVolumeChange={vi.fn()}
        onRemoveLiquid={vi.fn()}
        onToolbarItemDrop={vi.fn()}
        slots={[
          {
            id: "station_1",
            label: "Station 1",
            tool: {
              id: "bench_tool_vial",
              toolId: "sample_vial_lcms",
              label: "Autosampler vial",
              subtitle: "Injection ready",
              accent: "sky",
              toolType: "sample_vial",
              capacity_ml: 2,
              accepts_liquids: true,
              trashable: true,
              liquids: [],
            },
          },
          {
            id: "station_2",
            label: "Station 2",
            tool: {
              id: "bench_tool_tube",
              toolId: "centrifuge_tube_50ml",
              label: "50 mL centrifuge tube",
              subtitle: "Extraction ready",
              accent: "amber",
              toolType: "centrifuge_tube",
              capacity_ml: 50,
              accepts_liquids: true,
              trashable: true,
              liquids: [
                {
                  id: "bench_liquid_2",
                  liquidId: "apple_extract",
                  name: "Apple extract",
                  volume_ml: 10,
                  accent: "rose",
                },
              ],
            },
          },
        ]}
        statusMessage="Ready."
      />,
    );

    expect(screen.getByTestId("bench-tool-card-bench_tool_vial")).toHaveAttribute(
      "draggable",
      "true",
    );
    expect(screen.getByTestId("bench-tool-card-bench_tool_tube")).toHaveAttribute(
      "draggable",
      "true",
    );
  });
});
