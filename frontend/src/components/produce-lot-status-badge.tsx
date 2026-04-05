"use client";

import type { ExperimentProduceLot } from "@/types/workbench";

type ProduceLotStatusBadgeProps = {
  className?: string;
  produceLot: ExperimentProduceLot;
};

export function ProduceLotStatusBadge({
  className = "",
  produceLot,
}: ProduceLotStatusBadgeProps) {
  void className;
  void produceLot;
  return null;
}
