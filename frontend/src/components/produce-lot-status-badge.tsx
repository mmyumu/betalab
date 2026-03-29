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
  const statusLabel = produceLot.isContaminated
    ? "contaminated"
    : produceLot.cutState === "waste"
      ? "waste"
    : produceLot.cutState === "ground"
      ? "ground"
      : produceLot.cutState === "cut"
        ? "cut"
        : "clean";
  const toneClassName = produceLot.isContaminated
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : produceLot.cutState === "waste"
      ? "border-slate-300 bg-slate-100 text-slate-600"
    : produceLot.cutState === "ground"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : produceLot.cutState === "cut"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex w-full justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClassName} ${className}`.trim()}
    >
      {statusLabel}
    </span>
  );
}
