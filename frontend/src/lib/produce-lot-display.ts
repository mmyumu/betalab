import type { ExperimentProduceLot } from "@/types/workbench";

export function getProduceLotDisplayName(produceLot: ExperimentProduceLot) {
  if (produceLot.cutState !== "ground") {
    return produceLot.label;
  }

  return /\bpowder\b/i.test(produceLot.label) ? produceLot.label : `${produceLot.label} powder`;
}

export function isProduceLotDegassing(produceLot: ExperimentProduceLot) {
  return (produceLot.residualCo2MassG ?? 0) > 0;
}

export function getProduceLotDegassingIntensity(produceLot: ExperimentProduceLot) {
  const residualCo2MassG = produceLot.residualCo2MassG ?? 0;
  if (residualCo2MassG <= 0) {
    return "none";
  }

  const degassingRatio = residualCo2MassG / Math.max(produceLot.totalMassG, 1);
  if (degassingRatio >= 0.12) {
    return "heavy";
  }
  if (degassingRatio >= 0.03) {
    return "medium";
  }

  return "light";
}
