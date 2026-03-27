import { expect, test } from "@playwright/test";

import { dragAndDrop } from "./support/drag-and-drop";
import { mockWorkbenchApi } from "./support/workbench-api";

async function expandToolbarCategory(page: Parameters<typeof test.beforeEach>[0]["page"], name: string) {
  const toggle = page.getByRole("button", { name: new RegExp(name, "i") });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

test.describe("Pesticide workbench", () => {
  let api: Awaited<ReturnType<typeof mockWorkbenchApi>>;

  test.beforeEach(async ({ page }) => {
    api = await mockWorkbenchApi(page);
    await page.goto("/");
    await expect(page.getByText("Creating pesticide workbench from backend...")).toBeVisible();
    await expect(page.getByTestId("bench-slot-station_1")).toBeVisible();
  });

  test("loads the initial lab workspace from the mocked backend", async ({ page }) => {
    await expect(page.getByText("Empty station")).toHaveCount(2);

    await expandToolbarCategory(page, "Workspace equipment");
    await expandToolbarCategory(page, "MISC");

    await expect(page.getByTestId("toolbar-item-autosampler_rack_widget")).toBeVisible();
    await expect(page.getByTestId("toolbar-item-lc_msms_instrument_widget")).toBeVisible();
    await expect(page.getByTestId("toolbar-item-sealed_sampling_bag")).toBeVisible();
    await expect(page.getByTestId("widget-basket")).toBeVisible();
    await expect(page.getByTestId("widget-rack")).toHaveCount(0);
    await expect(page.getByTestId("widget-instrument")).toHaveCount(0);
  });

  test("adds and removes a workbench station through the real browser UI", async ({ page }) => {
    await expect(page.getByTestId("bench-slot-station_3")).toHaveCount(0);

    await page.getByTestId("add-workbench-slot-button").click();
    await expect(page.getByTestId("bench-slot-station_3")).toBeVisible();

    await page.getByTestId("remove-workbench-slot-button-station_3").click();
    await expect(page.getByTestId("bench-slot-station_3")).toHaveCount(0);
  });

  test("stages an autosampler vial from the palette onto the bench and into the rack", async ({
    page,
  }) => {
    await expandToolbarCategory(page, "Workspace equipment");
    await expandToolbarCategory(page, "Containers");

    await dragAndDrop(
      page.getByTestId("toolbar-item-autosampler_rack_widget"),
      page.getByTestId("widget-workspace"),
    );

    await expect(page.getByTestId("widget-rack")).toBeVisible();
    await expect(page.getByTestId("rack-summary")).toContainText("No vial staged yet.");

    await dragAndDrop(
      page.getByTestId("toolbar-item-sample_vial_lcms"),
      page.getByTestId("bench-slot-station_1"),
    );

    await expect(page.getByTestId("bench-slot-station_1")).toContainText("Autosampler vial");

    await dragAndDrop(
      page.getByTestId("bench-tool-card-bench_tool_sample_vial_lcms"),
      page.getByTestId("rack-illustration-slot-1"),
    );

    await expect(page.getByTestId("rack-slot-summary-1")).toContainText("Autosampler vial");
    await expect(page.getByTestId("bench-slot-station_1")).toContainText("Empty station");
    expect(api.commands).toMatchObject([
      {
        payload: expect.objectContaining({ widget_id: "rack" }),
        type: "add_workspace_widget",
      },
      {
        payload: { slot_id: "station_1", tool_id: "sample_vial_lcms" },
        type: "place_tool_on_workbench",
      },
      {
        payload: { rack_slot_id: "rack_slot_1", source_slot_id: "station_1" },
        type: "place_workbench_tool_in_rack_slot",
      },
    ]);
  });

  test("moves a discarded tool into trash and restores it back to the bench", async ({ page }) => {
    await expandToolbarCategory(page, "MISC");

    await dragAndDrop(
      page.getByTestId("toolbar-item-sealed_sampling_bag"),
      page.getByTestId("bench-slot-station_1"),
    );
    await expect(page.getByTestId("bench-slot-station_1")).toContainText("Sealed sampling bag");

    await dragAndDrop(
      page.getByTestId("bench-tool-card-bench_tool_sealed_sampling_bag"),
      page.getByTestId("trash-dropzone"),
    );
    await expect(page.getByTestId("bench-slot-station_1")).toContainText("Empty station");

    await page.getByTestId("trash-dropzone").click();
    await expect(page.getByTestId("trash-tool-trash_tool_1")).toBeVisible();

    await dragAndDrop(
      page.getByTestId("trash-tool-trash_tool_1"),
      page.getByTestId("bench-slot-station_1"),
    );

    await expect(page.getByTestId("bench-slot-station_1")).toContainText("Sealed sampling bag");
    await expect(page.getByTestId("trash-tool-trash_tool_1")).toHaveCount(0);
    expect(api.commands).toEqual([
      {
        payload: { slot_id: "station_1", tool_id: "sealed_sampling_bag" },
        type: "place_tool_on_workbench",
      },
      {
        payload: { slot_id: "station_1" },
        type: "discard_workbench_tool",
      },
      {
        payload: { target_slot_id: "station_1", trash_tool_id: "trash_tool_1" },
        type: "restore_trashed_tool_to_workbench_slot",
      },
    ]);
  });
});
