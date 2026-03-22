import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToolbarPanel } from "@/components/toolbar-panel";
import type { ToolbarCategory } from "@/types/workbench";

const categories: ToolbarCategory[] = [
  {
    id: "glassware",
    label: "Glassware",
    description: "Core containers for standards and samples.",
    items: [
      {
        id: "volumetric_flask",
        allowedDropTargets: ["workbench_slot"],
        itemType: "tool",
        name: "Volumetric flask",
        subtitle: "100 mL calibration prep",
        description: "Build standard dilutions with a fixed final volume.",
        accent: "sky",
        toolType: "volumetric_flask",
        capacity_ml: 100,
        accepts_liquids: true,
      },
    ],
  },
  {
    id: "liquids",
    label: "Liquids",
    description: "Solvents and matrices available on the bench.",
    items: [
      {
        id: "acetonitrile",
        allowedDropTargets: ["workbench_slot"],
        itemType: "liquid",
        name: "Acetonitrile",
        subtitle: "Organic modifier",
        description: "Common LC solvent for sample prep and rinsing.",
        accent: "amber",
        liquidType: "acetonitrile",
        transfer_volume_ml: 10,
      },
    ],
  },
  {
    id: "workspace_equipment",
    label: "Workspace equipment",
    description: "Larger systems dropped directly into the workspace.",
    items: [
      {
        id: "autosampler_rack_widget",
        allowedDropTargets: ["workspace_canvas"],
        itemType: "workspace_widget",
        name: "Autosampler rack",
        subtitle: "Sequence staging",
        description: "Stages vials before the instrument.",
        accent: "sky",
        widgetType: "autosampler_rack",
      },
    ],
  },
];

describe("ToolbarPanel", () => {
  it("renders categories, their items, and exposes draggable inventory cards", async () => {
    render(<ToolbarPanel categories={categories} />);

    expect(screen.getByText("Palette")).toBeInTheDocument();
    expect(screen.getByText("Inventory rail")).toBeInTheDocument();
    expect(screen.getByText("Glassware")).toBeInTheDocument();
    expect(screen.getByText("Liquids")).toBeInTheDocument();
    expect(screen.getByText("Workspace equipment")).toBeInTheDocument();
    expect(screen.getByText("Volumetric flask")).toBeInTheDocument();
    expect(screen.getByText("Acetonitrile")).toBeInTheDocument();
    expect(screen.getByText("Autosampler rack")).toBeInTheDocument();
    expect(screen.queryByText("Core containers for standards and samples.")).not.toBeInTheDocument();
    expect(screen.queryByText("Solvents and matrices available on the bench.")).not.toBeInTheDocument();
    expect(screen.getByTestId("toolbar-item-volumetric_flask")).toHaveAttribute("draggable", "true");
    expect(screen.getByTestId("toolbar-item-acetonitrile")).toHaveAttribute("draggable", "true");
    expect(screen.getByTestId("toolbar-item-autosampler_rack_widget")).toHaveAttribute(
      "draggable",
      "true",
    );
    expect(screen.getByTestId("toolbar-item-volumetric_flask")).toHaveAttribute(
      "title",
      "100 mL calibration prep",
    );
    expect(
      screen
        .getByTestId("toolbar-item-volumetric_flask")
        .querySelector("[data-kind='volumetric_flask']"),
    ).toHaveAttribute("data-tone", "neutral");
    expect(
      screen.getByTestId("toolbar-item-acetonitrile").querySelector("[data-kind='acetonitrile']"),
    ).toHaveAttribute("data-tone", "accent");
    expect(
      screen
        .getByTestId("toolbar-item-autosampler_rack_widget")
        .querySelector("[data-widget-type='autosampler_rack']"),
    ).toBeInTheDocument();
    expect(screen.queryByText("100 mL calibration prep")).not.toBeInTheDocument();
    expect(screen.queryByText("Organic modifier")).not.toBeInTheDocument();
    expect(screen.queryByText("Sequence staging")).not.toBeInTheDocument();
    expect(screen.queryByText("tool")).not.toBeInTheDocument();
    expect(screen.queryByText("liquid")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Glassware/i }));
    expect(screen.queryByTestId("toolbar-item-volumetric_flask")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Glassware/i }));
    expect(screen.getByTestId("toolbar-item-volumetric_flask")).toBeInTheDocument();
  });
});
