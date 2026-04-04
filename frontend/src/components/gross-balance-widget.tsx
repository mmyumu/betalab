"use client";

import type { DragEvent } from "react";
import type { ReactNode } from "react";

import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";

type GrossBalanceWidgetProps = {
  isDropHighlighted: boolean;
  measuredGrossMassG: number | null;
  netMassG: number | null;
  grossMassOffsetG: number;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onIncrementOffset: () => void;
  onDecrementOffset: () => void;
  stagedContent?: ReactNode;
};

export function GrossBalanceWidget({
  isDropHighlighted,
  measuredGrossMassG,
  netMassG,
  grossMassOffsetG,
  onDragOver,
  onDrop,
  onIncrementOffset,
  onDecrementOffset,
  stagedContent,
}: GrossBalanceWidgetProps) {
  return (
    <WorkspaceEquipmentWidget
      bodyClassName="px-4 py-4"
      dataDropHighlighted={isDropHighlighted ? "true" : "false"}
      dropZoneTestId="gross-balance-dropzone"
      eyebrow="Gross balance"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="space-y-3">
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-950 px-4 py-4 text-center text-emerald-300">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Gross</p>
          <p className="mt-2 font-mono text-3xl">
            {measuredGrossMassG === null ? "----.-" : measuredGrossMassG.toFixed(1)} g
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              aria-label="Decrease gross balance offset"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-lg font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={grossMassOffsetG <= -100}
              onClick={onDecrementOffset}
              type="button"
            >
              -
            </button>
            <div className="min-w-24 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                Offset
              </p>
              <p className="mt-1 font-mono text-lg">{grossMassOffsetG >= 0 ? `+${grossMassOffsetG}` : grossMassOffsetG} g</p>
            </div>
            <button
              aria-label="Increase gross balance offset"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-lg font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={grossMassOffsetG >= 0}
              onClick={onIncrementOffset}
              type="button"
            >
              +
            </button>
          </div>
          <div className="mt-4 border-t border-emerald-500/20 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Net</p>
            <p className="mt-1 font-mono text-2xl text-emerald-100">
              {netMassG === null ? "----.-" : netMassG.toFixed(1)} g
            </p>
          </div>
        </div>
        <div className="min-h-24 rounded-[1rem] border border-dashed border-slate-300 bg-white/80 px-2 py-2">
          {stagedContent ?? (
            <div className="flex h-full min-h-20 items-center justify-center rounded-[0.85rem] bg-slate-50 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              Drop object here
            </div>
          )}
        </div>
      </div>
    </WorkspaceEquipmentWidget>
  );
}
