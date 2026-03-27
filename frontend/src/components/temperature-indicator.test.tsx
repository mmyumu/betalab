import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TemperatureIndicator } from "@/components/temperature-indicator";

describe("TemperatureIndicator", () => {
  it("lowers the thermometer column as the produce gets colder", () => {
    const { rerender } = render(<TemperatureIndicator temperatureC={12} />);

    const warmFill = screen.getByTestId("temperature-indicator-fill");
    const warmHeight = Number.parseFloat(warmFill.style.height);

    rerender(<TemperatureIndicator temperatureC={-20} />);

    const coldFill = screen.getByTestId("temperature-indicator-fill");
    const coldHeight = Number.parseFloat(coldFill.style.height);

    expect(warmHeight).toBeGreaterThan(coldHeight);
    expect(warmHeight).toBeGreaterThan(90);
    expect(coldHeight).toBeLessThan(60);
  });
});
