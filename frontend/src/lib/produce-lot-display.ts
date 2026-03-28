import type { ExperimentProduceLot } from "@/types/workbench";

export function getProduceLotDisplayName(produceLot: ExperimentProduceLot) {
  return produceLot.cutState === "ground" ? `${produceLot.label} powder` : produceLot.label;
}
