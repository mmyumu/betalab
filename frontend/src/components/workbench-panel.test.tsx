import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkbenchPanel } from "@/components/workbench-panel";
import type { Container } from "@/types/experiment";

const makeFlask = (label: string): Container => ({
  id: `flask_${label.toLowerCase().replace(/\s+/g, "_")}`,
  kind: "flask",
  label,
  capacity_ml: 100,
  current_volume_ml: 100,
  contents: [],
  analyte_concentration_ng_ml: 10,
  matrix_effect_factor: 1,
});

describe("WorkbenchPanel", () => {
  it("renders the preparation bench lanes with prepared flasks", () => {
    render(<WorkbenchPanel flasks={[makeFlask("Std 1"), makeFlask("Std 2"), makeFlask("Sample")]} />);

    expect(screen.getByText("Preparation bench")).toBeInTheDocument();
    expect(screen.getByText("Calibration lane")).toBeInTheDocument();
    expect(screen.getByText("Standards staged")).toBeInTheDocument();
    expect(screen.getByText("Std 1")).toBeInTheDocument();
    expect(screen.getByText("Std 2")).toBeInTheDocument();
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("keeps open slots visible when not all bench lanes are occupied", () => {
    render(<WorkbenchPanel flasks={[makeFlask("Std 1"), makeFlask("Sample")]} />);

    expect(screen.getByText("Reserve slot")).toBeInTheDocument();
    expect(screen.getByText("Ready for the next prep")).toBeInTheDocument();
  });
});
