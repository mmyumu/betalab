import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlaskCard } from "@/components/flask-card";
import type { Container } from "@/types/experiment";

const makeContainer = (overrides: Partial<Container> = {}): Container => ({
  id: "flask_std_1",
  kind: "flask",
  label: "Std 1",
  capacity_ml: 100,
  current_volume_ml: 75,
  contents: [],
  analyte_concentration_ng_ml: 10,
  matrix_effect_factor: 0.86,
  ...overrides,
});

describe("FlaskCard", () => {
  it("renders the flask metadata", () => {
    render(<FlaskCard container={makeContainer()} />);

    expect(screen.getByText("Std 1")).toBeInTheDocument();
    expect(screen.getByText("75 / 100 mL")).toBeInTheDocument();
    expect(screen.getByText("10 ng/mL")).toBeInTheDocument();
    expect(screen.getByText("0.86")).toBeInTheDocument();
  });

  it("caps the displayed fill level at 100%", () => {
    const { container } = render(
      <FlaskCard container={makeContainer({ current_volume_ml: 150, capacity_ml: 100 })} />,
    );

    const liquidLevel = container.querySelector('[style*="height: 100%"]');
    expect(liquidLevel).not.toBeNull();
  });

  it("keeps an empty flask visible with a minimum fill indicator", () => {
    const { container } = render(
      <FlaskCard container={makeContainer({ current_volume_ml: 0, capacity_ml: 100 })} />,
    );

    const liquidLevel = container.querySelector('[style*="height: 8%"]');
    expect(liquidLevel).not.toBeNull();
  });
});
