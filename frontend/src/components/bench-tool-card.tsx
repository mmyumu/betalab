import type { DragEvent } from "react";

import { LabAssetIcon } from "@/components/icons/lab-asset-icon";
import type { BenchToolInstance, ToolbarAccent } from "@/types/workbench";

type BenchToolCardProps = {
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onLiquidVolumeChange: (liquidId: string, volumeMl: number) => void;
  tool: BenchToolInstance;
};

const liquidToneClasses: Record<ToolbarAccent, string> = {
  amber: "from-amber-500 to-amber-200",
  emerald: "from-emerald-500 to-emerald-200",
  rose: "from-rose-500 to-rose-200",
  sky: "from-sky-500 to-sky-200",
};

const neutralToneClass = "from-slate-300 to-slate-100";
const liquidToneHex: Record<ToolbarAccent, string> = {
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#fb7185",
  sky: "#38bdf8",
};

const wheelListenerRegistry = new WeakMap<HTMLInputElement, EventListener>();

function attachWheelListener(
  input: HTMLInputElement,
  liquidId: string,
  onLiquidVolumeChange: (liquidId: string, volumeMl: number) => void,
) {
  const existingListener = wheelListenerRegistry.get(input);
  if (existingListener) {
    input.removeEventListener("wheel", existingListener);
  }

  const listener: EventListener = (event) => {
    if (!(event instanceof WheelEvent)) {
      return;
    }

    event.preventDefault();

    const direction = Math.sign(event.deltaY);
    if (direction === 0) {
      return;
    }

    const currentValue = Number.parseFloat(input.value);
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0;
    const delta = direction < 0 ? 0.1 : -0.1;
    const nextVolume = Number((safeCurrentValue + delta).toFixed(1));

    onLiquidVolumeChange(liquidId, nextVolume);
  };

  input.addEventListener("wheel", listener, { passive: false });
  wheelListenerRegistry.set(input, listener);
}

function detachWheelListener(input: HTMLInputElement) {
  const listener = wheelListenerRegistry.get(input);
  if (!listener) {
    return;
  }

  input.removeEventListener("wheel", listener);
  wheelListenerRegistry.delete(input);
}

function formatVolume(volumeMl: number) {
  return Number.parseFloat(volumeMl.toFixed(3)).toString();
}

function buildLiquidGradient(volumes: Array<{ accent: ToolbarAccent; ratio: number }>) {
  if (volumes.length === 0) {
    return undefined;
  }

  let offset = 0;
  const stops = volumes.flatMap((volume, index) => {
    const start = offset;
    offset += volume.ratio * 100;
    const end = index === volumes.length - 1 ? 100 : offset;
    const color = liquidToneHex[volume.accent];

    return [`${color} ${start}%`, `${color} ${end}%`];
  });

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export function BenchToolCard({
  draggable = false,
  onDragStart,
  onLiquidVolumeChange,
  tool,
}: BenchToolCardProps) {
  const currentVolume = Number.parseFloat(
    tool.liquids.reduce((total, liquid) => total + liquid.volume_ml, 0).toFixed(3),
  );
  const fillRatio = Math.min(currentVolume / tool.capacity_ml, 1);
  const isFilled = currentVolume > 0;
  const fillPercentage = (fillRatio * 100).toFixed(2);
  const liquidSegments =
    currentVolume > 0
      ? tool.liquids
          .filter((liquid) => liquid.volume_ml > 0)
          .map((liquid) => ({
            accent: liquid.accent,
            ratio: liquid.volume_ml / currentVolume,
          }))
      : [];
  const fillBorderStyle = isFilled
    ? { backgroundImage: buildLiquidGradient(liquidSegments) }
    : undefined;

  return (
    <article
      className={`rounded-[1.45rem] border border-slate-200 bg-white p-3 shadow-sm ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      data-testid={`bench-tool-card-${tool.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex flex-col gap-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-5 text-slate-950">{tool.label}</h3>
          <div className="flex min-w-0 items-start gap-3">
            <LabAssetIcon
              accent={tool.accent}
              className="h-22 w-16 shrink-0"
              fillRatio={fillRatio}
              fillSegments={liquidSegments}
              kind={tool.toolType}
              tone="neutral"
            />
            <div className="min-w-0">
              <p className="text-xs text-slate-600">{tool.subtitle}</p>
              <p className="mt-2 text-[11px] font-medium text-slate-500">
                {tool.liquids.length > 0 ? `${tool.liquids.length} liquid loaded` : "Ready for liquid additions"}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-[1rem] bg-gradient-to-r p-[1px] ${isFilled ? "" : neutralToneClass}`}
          style={fillBorderStyle}
        >
          <div className="flex min-h-16 items-center rounded-[0.95rem] bg-white/90 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Current fill
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{fillPercentage}%</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {formatVolume(currentVolume)} / {formatVolume(tool.capacity_ml)} mL
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {tool.liquids.length > 0 ? (
            tool.liquids.map((liquid) => (
              <div
                key={liquid.id}
                className="flex items-center justify-between gap-2 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${liquidToneClasses[liquid.accent]}`}
                  />
                  <span className="truncate">{liquid.name}</span>
                </div>

                <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="sr-only">{liquid.name} volume</span>
                  <input
                    aria-label={`${liquid.name} volume`}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] font-semibold text-slate-900 outline-none transition focus:border-slate-400"
                    min={0}
                    onChange={(event) => {
                      const parsed = Number.parseFloat(event.target.value);
                      onLiquidVolumeChange(liquid.id, Number.isFinite(parsed) ? parsed : 0);
                    }}
                    onBlur={(event) => {
                      detachWheelListener(event.currentTarget);
                    }}
                    onFocus={(event) => {
                      attachWheelListener(event.currentTarget, liquid.id, onLiquidVolumeChange);
                    }}
                    step={0.1}
                    type="number"
                    value={liquid.volume_ml}
                  />
                  <span>mL</span>
                </label>
              </div>
            ))
          ) : (
            <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500">
              Drop liquid here
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
