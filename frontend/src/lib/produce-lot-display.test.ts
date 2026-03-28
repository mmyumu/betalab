import { describe, expect, it } from "vitest";

import { getProduceLotDisplayName } from "@/lib/produce-lot-display";

describe("getProduceLotDisplayName", () => {
  it("keeps the base label for whole produce lots", () => {
    expect(
      getProduceLotDisplayName({
        id: "produce_1",
        label: "Apple lot 1",
        produceType: "apple",
        totalMassG: 1200,
        unitCount: 6,
      }),
    ).toBe("Apple lot 1");
  });

  it("adds the powder suffix for ground produce lots", () => {
    expect(
      getProduceLotDisplayName({
        id: "produce_1",
        cutState: "ground",
        label: "Apple lot 1",
        produceType: "apple",
        totalMassG: 1200,
        unitCount: 6,
      }),
    ).toBe("Apple lot 1 powder");
  });
});
