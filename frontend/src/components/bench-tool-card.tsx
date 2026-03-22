import type { DragEvent } from "react";

import { LabAssetIcon } from "@/components/icons/lab-asset-icon";
import {
  buildCssLinearGradient,
  getContainerLiquidVisualState,
  getLiquidAccentPalette,
} from "@/lib/liquid-visuals";
import type { BenchToolInstance } from "@/types/workbench";

type BenchToolCardProps = {
  draggable?: boolean;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onRemoveLiquid: (liquidId: string) => void;
  onLiquidVolumeChange: (liquidId: string, volumeMl: number) => void;
  tool: BenchToolInstance;
};

const neutralToneClass = "from-slate-300 to-slate-100";

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

export function BenchToolCard({
  draggable = false,
  onDragEnd,
  onDragStart,
  onRemoveLiquid,
  onLiquidVolumeChange,
  tool,
}: BenchToolCardProps) {
  const currentVolume = Number.parseFloat(
    tool.liquids.reduce((total, liquid) => total + liquid.volume_ml, 0).toFixed(3),
  );
  const fillRatio = Math.min(currentVolume / tool.capacity_ml, 1);
  const liquidVisualState = getContainerLiquidVisualState(tool.liquids, tool.accent);
  const isFilled = liquidVisualState.hasVisibleLiquid;
  const fillPercentage = (fillRatio * 100).toFixed(2);
  const liquidSegments = liquidVisualState.segments;
  const fillBorderStyle = isFilled
    ? { backgroundImage: buildCssLinearGradient(liquidSegments) }
    : undefined;

  return (
    <article
      className="rounded-[1.45rem] border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        <div
          className={draggable ? "cursor-grab active:cursor-grabbing" : ""}
          data-testid={`bench-tool-card-${tool.id}`}
          draggable={draggable}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
        >
          <h3 className="text-base font-semibold leading-5 text-slate-950">{tool.label}</h3>
          <div className="mt-2 flex min-w-0 items-start gap-3">
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
                className="rounded-[0.9rem] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getLiquidAccentPalette(liquid.accent).liquid }}
                  />
                  <span className="truncate">{liquid.name}</span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="sr-only">{liquid.name} volume</span>
                    <input
                      aria-label={`${liquid.name} volume`}
                      className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] font-semibold text-slate-900 outline-none transition focus:border-slate-400"
                      draggable={false}
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
                  <button
                    aria-label={`Remove ${liquid.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                    draggable={false}
                    onClick={() => {
                      onRemoveLiquid(liquid.id);
                    }}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.5 4.5H12.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M6 2.75H10"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M5 4.5V11C5 12 5.5 12.5 6.5 12.5H9.5C10.5 12.5 11 12 11 11V4.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M6.75 6.5V10"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M9.25 6.5V10"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </button>
                </div>
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
