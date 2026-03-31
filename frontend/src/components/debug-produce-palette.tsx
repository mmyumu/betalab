"use client";

import { DraggableInventoryItem } from "@/components/draggable-inventory-item";
import { AppleIllustration } from "@/components/illustrations/apple-illustration";
import type { DebugProducePresetId } from "@/types/workbench";

export type DebugProducePreset = {
  id: DebugProducePresetId;
  label: string;
  subtitle: string;
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
          <DraggableInventoryItem
            className="rounded-[1rem] border-amber-200 bg-[linear-gradient(180deg,#fffdf5,#fff7e8)]"
            contentClassName="flex-1"
            dataTestId={`debug-palette-preset-${preset.id}`}
            key={preset.id}
            leading={<AppleIllustration className="h-10 w-10 shrink-0" />}
            onDragEnd={onItemDragEnd}
            onDragStart={
              onPresetDragStart
                ? (dataTransfer) => onPresetDragStart(preset, dataTransfer)
                : undefined
            }
            subtitle={<span className="block text-xs text-slate-500">{preset.subtitle}</span>}
            title={<span className="block truncate text-sm font-semibold text-slate-900">{preset.label}</span>}
          />
        ))}
      </div>
    </section>
  );
}
