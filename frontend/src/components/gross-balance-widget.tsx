"use client";

import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";

type GrossBalanceWidgetProps = {
  measuredGrossMassG: number | null;
  onMeasure: () => void;
};

export function GrossBalanceWidget({
  measuredGrossMassG,
  onMeasure,
}: GrossBalanceWidgetProps) {
  return (
    <WorkspaceEquipmentWidget
      bodyClassName="px-4 py-4"
      eyebrow="Gross balance"
    >
      <div className="space-y-3">
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-950 px-4 py-4 text-center text-emerald-300">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Masse</p>
          <p className="mt-2 font-mono text-3xl">
            {measuredGrossMassG === null ? "----.-" : measuredGrossMassG.toFixed(1)} g
          </p>
        </div>
        <button
          className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300"
          data-testid="gross-balance-measure-button"
          onClick={onMeasure}
          type="button"
        >
          Peser le sac
        </button>
      </div>
    </WorkspaceEquipmentWidget>
  );
}
