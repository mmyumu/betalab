import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PesticideWorkbench } from "@/components/pesticide-workbench";
import {
  createDataTransfer,
  dndSourceCases,
  dndTargetCases,
  type DndTargetId,
} from "@/components/pesticide-workbench-dnd-test-helpers";

vi.mock("@/lib/api", () => ({
  createExperiment: vi.fn(),
  sendExperimentCommand: vi.fn(),
}));

import { createExperiment, sendExperimentCommand } from "@/lib/api";

async function renderWorkbenchForSource(sourceCase: (typeof dndSourceCases)[number]) {
  const experiment = sourceCase.buildExperiment();
  vi.mocked(createExperiment).mockResolvedValue(experiment);
  vi.mocked(sendExperimentCommand).mockResolvedValue(experiment);

  render(<PesticideWorkbench />);

  await waitFor(() => {
    expect(screen.getByTestId("widget-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("bench-slot-station_1")).toBeInTheDocument();
    expect(screen.getByTestId("bench-slot-station_2")).toBeInTheDocument();
    expect(screen.getByTestId("trash-dropzone")).toBeInTheDocument();
  });

  if (sourceCase.expectRackWidget) {
    await waitFor(() => {
      expect(screen.getByTestId("widget-rack")).toBeInTheDocument();
      expect(screen.getByTestId("rack-illustration-slot-1")).toBeInTheDocument();
    });
  } else {
    expect(screen.queryByTestId("widget-rack")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rack-illustration-slot-1")).not.toBeInTheDocument();
  }

  if (sourceCase.openTrash) {
    fireEvent.click(screen.getByTestId("trash-dropzone"));
    await waitFor(() => {
      expect(screen.getByTestId(sourceCase.sourceTestId)).toBeInTheDocument();
    });
  }

  if (sourceCase.openBasket) {
    fireEvent.click(screen.getByTestId("basket-open-button"));
    await waitFor(() => {
      expect(screen.getByTestId(sourceCase.sourceTestId)).toBeInTheDocument();
    });
  }
}

function isAvailableTarget(
  sourceCase: (typeof dndSourceCases)[number],
  targetId: DndTargetId,
) {
  return sourceCase.availableTargets.includes(targetId);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PesticideWorkbench DnD matrix", () => {
  dndSourceCases.forEach((sourceCase) => {
    dndTargetCases.forEach((targetCase) => {
      if (!isAvailableTarget(sourceCase, targetCase.id)) {
        return;
      }

      const expectation = sourceCase.targetExpectations[targetCase.id];

      it(`marks ${sourceCase.label} ${expectation?.compatible ? "compatible" : "incompatible"} with ${targetCase.label}`, async () => {
        await renderWorkbenchForSource(sourceCase);

        const dataTransfer = createDataTransfer();
        fireEvent.dragStart(screen.getByTestId(sourceCase.sourceTestId), { dataTransfer });

        const target = screen.getByTestId(targetCase.id);
        expect(target).toHaveAttribute(
          "data-drop-highlighted",
          expectation?.compatible ? "true" : "false",
        );

        if (!targetCase.assertDragOver) {
          return;
        }

        const dragOverEvent = createEvent.dragOver(target, { dataTransfer });
        fireEvent(target, dragOverEvent);
        expect(dragOverEvent.defaultPrevented).toBe(expectation?.compatible ?? false);
      });
    });
  });
});
