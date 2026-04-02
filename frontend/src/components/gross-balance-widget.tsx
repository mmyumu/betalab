"use client";

import type { DragEvent } from "react";
import type { ReactNode } from "react";

import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";

type GrossBalanceWidgetProps = {
  isDropHighlighted: boolean;
  measuredGrossMassG: number | null;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  stagedContent?: ReactNode;
};

export function GrossBalanceWidget({
  isDropHighlighted,
  measuredGrossMassG,
  onDragOver,
  onDrop,
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Mass</p>
          <p className="mt-2 font-mono text-3xl">
            {measuredGrossMassG === null ? "----.-" : measuredGrossMassG.toFixed(1)} g
          </p>
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
