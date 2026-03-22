import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import { writeToolbarDragPayload } from "@/lib/workbench-dnd";
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
  payload: { itemId: string; itemType: "tool" | "liquid" | "workspace_widget" },
) {
  writeToolbarDragPayload(dataTransfer, payload);
  syncTypes(dataTransfer);
}

describe("PesticideWorkbenchPanel", () => {
  it("renders empty stations and a drop status message", () => {
    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
        slots={slots}
        statusMessage="Start by dragging an extraction tool onto the bench."
        onToolbarItemDrop={vi.fn()}
      />,
    );

    expect(screen.getByText("Empty prep bench")).toBeInTheDocument();
    expect(screen.getByText("Station 1")).toBeInTheDocument();
    expect(screen.getByText("Station 2")).toBeInTheDocument();
    expect(screen.getAllByText("Empty station")).toHaveLength(2);
    expect(
      screen.getByText("Start by dragging an extraction tool onto the bench."),
    ).toBeInTheDocument();
  });

  it("shows multi-liquid tools with multiple fill segments", () => {
    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
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

  it("accepts tool drags on stations and forwards the drop payload", () => {
    const onToolbarItemDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writePayload(dataTransfer, {
      itemId: "sample_vial_lcms",
      itemType: "tool",
    });

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
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
      itemId: "sample_vial_lcms",
      itemType: "tool",
    });
  });

  it("rejects workspace widget drags on stations", () => {
    const onToolbarItemDrop = vi.fn();
    const dataTransfer = createDataTransfer();
    writePayload(dataTransfer, {
      itemId: "autosampler_rack_widget",
      itemType: "workspace_widget",
    });

    render(
      <PesticideWorkbenchPanel
        onLiquidVolumeChange={vi.fn()}
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
});
