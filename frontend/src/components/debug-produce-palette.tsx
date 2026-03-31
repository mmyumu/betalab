"use client";

import { ProduceLotCard } from "@/components/produce-lot-card";
import { ProduceLotStatusBadge } from "@/components/produce-lot-status-badge";
import type { DebugProducePresetId, ExperimentProduceLot } from "@/types/workbench";

export type DebugProducePreset = {
  id: DebugProducePresetId;
  produceLot: ExperimentProduceLot;
};

type DebugProducePaletteProps = {
  onPresetDragStart?: (preset: DebugProducePreset, dataTransfer: DataTransfer) => void;
  onItemDragEnd?: () => void;
  presets: DebugProducePreset[];
};

export function DebugProducePalette({
  onPresetDragStart,
  onItemDragEnd,
  presets,
}: DebugProducePaletteProps) {
  return (
    <section className="overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.95))] shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
      <div className="border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Debug Palette
        </p>
      </div>
      <div className="space-y-3 px-4 py-4">
        {presets.map((preset) => (
          <ProduceLotCard
            className="rounded-[1rem] border-amber-200 bg-[linear-gradient(180deg,#fffdf5,#fff7e8)]"
            dataTestId={`debug-palette-preset-${preset.id}`}
            draggable={Boolean(onPresetDragStart)}
            footerBadge={<ProduceLotStatusBadge produceLot={preset.produceLot} />}
            key={preset.id}
            metadata="850 g"
            onDragEnd={onItemDragEnd}
            onDragStart={
              onPresetDragStart
                ? (event) => onPresetDragStart(preset, event.dataTransfer)
                : undefined
            }
            produceLot={preset.produceLot}
            variant="compact"
          />
        ))}
      </div>
    </section>
  );
}
