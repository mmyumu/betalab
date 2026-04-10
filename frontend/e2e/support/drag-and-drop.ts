import type { Locator, Page } from "@playwright/test";

async function createDataTransfer(page: Page) {
  return page.evaluateHandle(() => new DataTransfer());
}

export async function dragAndDrop(source: Locator, target: Locator) {
  const page = source.page();
  const dataTransfer = await createDataTransfer(page);

  await source.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragenter", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
}
