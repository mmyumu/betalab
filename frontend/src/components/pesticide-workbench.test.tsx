import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PesticideWorkbench } from "@/components/pesticide-workbench";

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

describe("PesticideWorkbench", () => {
  it("starts with an empty bench", () => {
    render(<PesticideWorkbench />);

    expect(screen.getByText("Pesticide prep workbench")).toBeInTheDocument();
    expect(screen.getAllByText("Empty station")).toHaveLength(4);

    const placedToolsCard = screen.getByText("Placed tools").closest("div");
    const liquidDropsCard = screen.getByText("Liquid drops").closest("div");

    expect(placedToolsCard).not.toBeNull();
    expect(liquidDropsCard).not.toBeNull();
    expect(within(placedToolsCard as HTMLElement).getByText("0")).toBeInTheDocument();
    expect(within(liquidDropsCard as HTMLElement).getByText("0")).toBeInTheDocument();
  });

  it("places a tool on the bench and accepts a liquid drop into it", () => {
    render(<PesticideWorkbench />);

    const toolTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-centrifuge_tube_50ml"), {
      dataTransfer: toolTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: toolTransfer });

    expect(screen.getAllByText("50 mL centrifuge tube")).toHaveLength(2);
    expect(screen.getByText("50 mL centrifuge tube placed on Station 1.")).toBeInTheDocument();

    const placedToolsCard = screen.getByText("Placed tools").closest("div");
    expect(placedToolsCard).not.toBeNull();
    expect(within(placedToolsCard as HTMLElement).getByText("1")).toBeInTheDocument();

    const liquidTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-acetonitrile_extraction"), {
      dataTransfer: liquidTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_1"), { dataTransfer: liquidTransfer });

    expect(screen.getByText("Acetonitrile 10 mL")).toBeInTheDocument();
    expect(screen.getByText("Acetonitrile added to 50 mL centrifuge tube.")).toBeInTheDocument();
    expect(screen.getByText("10 / 50 mL")).toBeInTheDocument();
  });

  it("refuses liquid drops on an empty station", () => {
    render(<PesticideWorkbench />);

    const liquidTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId("toolbar-item-acetonitrile_extraction"), {
      dataTransfer: liquidTransfer,
    });
    fireEvent.drop(screen.getByTestId("bench-slot-station_2"), { dataTransfer: liquidTransfer });

    expect(screen.getByText("Place a tool on Station 2 before adding liquids.")).toBeInTheDocument();
  });
});
