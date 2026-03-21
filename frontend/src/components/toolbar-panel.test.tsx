import { render, screen } from "@testing-library/react";
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
        name: "Volumetric flask",
        subtitle: "100 mL calibration prep",
        description: "Build standard dilutions with a fixed final volume.",
        accent: "sky",
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
        name: "Acetonitrile",
        subtitle: "Organic modifier",
        description: "Common LC solvent for sample prep and rinsing.",
        accent: "amber",
      },
    ],
  },
];

describe("ToolbarPanel", () => {
  it("renders categories and their items", () => {
    render(<ToolbarPanel categories={categories} />);

    expect(screen.getByText("Lab toolbar")).toBeInTheDocument();
    expect(screen.getByText("Glassware")).toBeInTheDocument();
    expect(screen.getByText("Liquids")).toBeInTheDocument();
    expect(screen.getByText("Volumetric flask")).toBeInTheDocument();
    expect(screen.getByText("Acetonitrile")).toBeInTheDocument();
    expect(screen.getByText("Core containers for standards and samples.")).toBeInTheDocument();
    expect(screen.getByText("Solvents and matrices available on the bench.")).toBeInTheDocument();
  });
});
