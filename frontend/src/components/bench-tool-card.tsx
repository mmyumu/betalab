import type { DragEvent, ReactNode } from "react";

import { LabAssetIcon } from "@/components/icons/lab-asset-icon";
import { ProduceLotCard } from "@/components/produce-lot-card";
import { ProduceLotStatusBadge } from "@/components/produce-lot-status-badge";
import { dragAffordanceClassName } from "@/lib/drag-affordance";
import { canToolAcceptProduce, canToolBeSealed } from "@/lib/entity-rules";
import {
  buildCssLinearGradient,
  getContainerLiquidVisualState,
  getLiquidAccentPalette,
} from "@/lib/liquid-visuals";
import type { BenchToolInstance, ExperimentProduceLot } from "@/types/workbench";

type BenchToolCardProps = {
  draggable?: boolean;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onProduceLotClick?: (produceLot: ExperimentProduceLot) => void;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  pendingContent?: ReactNode;
  onProduceLotDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onProduceLotDragStart?: (produceLot: ExperimentProduceLot, event: DragEvent<HTMLElement>) => void;
  onRemoveLiquid: (liquidId: string) => void;
  onSampleLabelTextChange?: (sampleLabelText: string) => void;
  onToggleSeal?: () => void;
  onSampleLabelDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onSampleLabelDragStart?: (event: DragEvent<HTMLElement>) => void;
  tool: BenchToolInstance;
};

const neutralToneClass = "from-slate-300 to-slate-100";
function formatVolume(volumeMl: number) {
  return Number.parseFloat(volumeMl.toFixed(3)).toString();
}

function formatMass(totalMassG: number) {
  if (totalMassG >= 1000) {
    return `${(totalMassG / 1000).toFixed(2)} kg`;
  }

  return `${Number.parseFloat(totalMassG.toFixed(0)).toString()} g`;
}

function formatLotMetadata(unitCount: number | null, totalMassG: number) {
  const unitLabel = unitCount === null ? null : `${unitCount} unit${unitCount === 1 ? "" : "s"}`;
  const massLabel = formatMass(totalMassG);

  return unitLabel ? `${unitLabel} • ${massLabel}` : massLabel;
}

export function BenchToolCard({
  draggable = false,
  onDragEnd,
  onProduceLotClick,
  onDragStart,
  pendingContent,
  onProduceLotDragEnd,
  onProduceLotDragStart,
  onRemoveLiquid,
  onSampleLabelTextChange,
  onToggleSeal,
  onSampleLabelDragEnd,
  onSampleLabelDragStart,
  tool,
}: BenchToolCardProps) {
  const produceLots = tool.produceLots ?? [];
  const currentVolume = Number.parseFloat(
    tool.liquids.reduce((total, liquid) => total + liquid.volume_ml, 0).toFixed(3),
  );
  const totalProduceMassG = produceLots.reduce((total, lot) => total + lot.totalMassG, 0);
  const fillRatio = tool.capacity_ml > 0 ? Math.min(currentVolume / tool.capacity_ml, 1) : 0;
  const liquidVisualState = getContainerLiquidVisualState(tool.liquids, tool.accent);
  const isFilled = liquidVisualState.hasVisibleLiquid;
  const fillPercentage = (fillRatio * 100).toFixed(2);
  const liquidSegments = liquidVisualState.segments;
  const fillBorderStyle = isFilled
    ? { backgroundImage: buildCssLinearGradient(liquidSegments) }
    : undefined;
  const isSampleBag = tool.toolType === "sample_bag";
  const isProduceSurface = canToolAcceptProduce(tool.toolType);
  const isSealable = canToolBeSealed(tool.toolType);
  const isSealed = tool.isSealed ?? false;
  const canDragContainedProduce = !isSealed;
  const hasSampleLabel = isSampleBag && tool.sampleLabelText !== null && tool.sampleLabelText !== undefined;
  const hasFieldLabel = isSampleBag && tool.fieldLabelText !== null && tool.fieldLabelText !== undefined;
  const sealStateLabel =
    tool.closureFault === "pressure_pop" ? "Popped" : isSealed ? "Sealed" : "Open";
  const sealStateToneClass =
    tool.closureFault === "pressure_pop"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : isSealed
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <article
      className="rounded-[1.45rem] border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <div
          className={draggable ? dragAffordanceClassName : ""}
          data-testid={`bench-tool-card-${tool.id}`}
          draggable={draggable}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-5 text-slate-950">{tool.label}</h3>
            {isSealable ? (
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${sealStateToneClass}`.trim()}
                >
                  {sealStateLabel}
                </span>
                <button
                  aria-label={`${isSealed ? "Open" : "Close"} ${tool.label}`}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  draggable={false}
                  onClick={() => {
                    onToggleSeal?.();
                  }}
                  type="button"
                >
                  {isSealed ? "Open" : "Close"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="mt-1.5 flex min-w-0 items-start gap-2.5">
            <LabAssetIcon
              accent={tool.accent}
              className="h-22 w-16 shrink-0"
              closureFault={tool.closureFault}
              fillRatio={fillRatio}
              fillSegments={liquidSegments}
              isSealed={tool.isSealed}
              kind={tool.toolType}
              produceLots={produceLots}
              sampleLabelText={tool.sampleLabelText}
              tone="neutral"
            />
            <div className="min-w-0">
              <p className="text-xs text-slate-600">{tool.subtitle}</p>
              <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                {isSampleBag
                  ? produceLots.length > 0
                    ? `${produceLots.length} produce lot${produceLots.length === 1 ? "" : "s"} loaded`
                    : "Ready for produce lot intake"
                  : isProduceSurface
                    ? produceLots.length > 0
                      ? `${produceLots.length} produce lot${produceLots.length === 1 ? "" : "s"} staged`
                      : "Ready for produce staging"
                  : tool.liquids.length > 0
                    ? `${tool.liquids.length} liquid loaded`
                    : "Ready for liquid additions"}
              </p>
            </div>
          </div>
        </div>

        {isSampleBag ? (
          <div className="space-y-2">
            {hasFieldLabel ? (
              <div className="rounded-[0.95rem] border border-emerald-200 bg-emerald-50/70 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Field label
                </p>
                <p className="mt-1 text-xs font-medium text-slate-900">{tool.fieldLabelText}</p>
              </div>
            ) : null}
            <div className="rounded-[1rem] bg-gradient-to-r from-emerald-200/70 to-emerald-50 p-[1px]">
              <div className="flex min-h-12 items-center rounded-[0.95rem] bg-white/90 px-2.5 py-1">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Produce load
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-slate-950">
                    {produceLots.length} lot{produceLots.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {produceLots.length > 0 ? formatMass(totalProduceMassG) : "Sealed sample intake"}
                  </p>
                </div>
              </div>
            </div>
            {hasSampleLabel ? (
              <div
                className={`rounded-[0.95rem] border border-sky-200 bg-sky-50/70 px-2.5 py-2 ${
                  onSampleLabelDragStart ? dragAffordanceClassName : ""
                }`}
                data-testid={`sample-label-card-${tool.id}`}
                draggable={Boolean(onSampleLabelDragStart)}
                onDragEnd={onSampleLabelDragEnd}
                onDragStart={onSampleLabelDragStart}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lab label
                </p>
                {hasFieldLabel ? (
                  <p className="mt-1 text-sm font-medium text-slate-900">{tool.sampleLabelText}</p>
                ) : (
                  <input
                    aria-label="Sample label text"
                    className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-2 py-1 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400"
                    data-testid={`sample-label-input-${tool.id}`}
                    defaultValue={tool.sampleLabelText ?? ""}
                    draggable={false}
                    onBlur={(event) => {
                      onSampleLabelTextChange?.(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    placeholder="Enter lot number"
                    type="text"
                  />
                )}
              </div>
            ) : (
              <span className="rounded-full border border-dashed border-slate-300 px-3 py-0.5 text-xs font-medium text-slate-500">
                {hasFieldLabel ? "Drop LIMS ticket here" : "Drop sample label here"}
              </span>
            )}
          </div>
        ) : isProduceSurface ? (
          produceLots.length === 0 ? (
            <div className="rounded-[1rem] bg-gradient-to-r from-amber-200/70 to-amber-50 p-[1px]">
              <div className="flex min-h-12 items-center rounded-[0.95rem] bg-white/90 px-2.5 py-1">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Produce surface
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-slate-950">
                    Ready
                  </p>
                  <p className="text-[11px] text-slate-500">Ready for cutting prep</p>
                </div>
              </div>
            </div>
          ) : null
        ) : (
          <div
            className={`rounded-[1rem] bg-gradient-to-r p-[1px] ${isFilled ? "" : neutralToneClass}`}
            style={fillBorderStyle}
          >
            <div className="flex min-h-12 items-center rounded-[0.95rem] bg-white/90 px-2.5 py-1">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Current fill
                </p>
                <p className="mt-0.5 text-base font-semibold text-slate-950">{fillPercentage}%</p>
                <p className="text-[11px] text-slate-500">
                  {formatVolume(currentVolume)} / {formatVolume(tool.capacity_ml)} mL
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {pendingContent ? (
            pendingContent
          ) : isSampleBag ? (
            produceLots.length > 0 ? (
              produceLots.map((produceLot) => (
                <ProduceLotCard
                  className={canDragContainedProduce ? "bg-slate-50" : "cursor-not-allowed bg-slate-100/90 opacity-75"}
                  dataTestId={`bench-produce-lot-${produceLot.id}`}
                  draggable={canDragContainedProduce && Boolean(onProduceLotDragStart)}
                  footerBadge={<ProduceLotStatusBadge produceLot={produceLot} />}
                  key={produceLot.id}
                  metadata={formatLotMetadata(produceLot.unitCount, produceLot.totalMassG)}
                  onClick={() => {
                    onProduceLotClick?.(produceLot);
                  }}
                  onDragEnd={canDragContainedProduce ? onProduceLotDragEnd : undefined}
                  onDragStart={(event) => {
                    if (!canDragContainedProduce) {
                      return;
                    }
                    onProduceLotDragStart?.(produceLot, event);
                  }}
                  produceLot={produceLot}
                  variant="compact"
                />
              ))
            ) : (
              <span className="rounded-full border border-dashed border-slate-300 px-3 py-0.5 text-xs font-medium text-slate-500">
                Drop produce lot here
              </span>
            )
          ) : isProduceSurface ? (
            produceLots.length > 0 ? (
              produceLots.map((produceLot) => (
                <ProduceLotCard
                  className={canDragContainedProduce ? undefined : "cursor-not-allowed opacity-75"}
                  dataTestId={`bench-produce-lot-${produceLot.id}`}
                  draggable={canDragContainedProduce && Boolean(onProduceLotDragStart)}
                  footerBadge={<ProduceLotStatusBadge produceLot={produceLot} />}
                  key={produceLot.id}
                  metadata={formatLotMetadata(produceLot.unitCount, produceLot.totalMassG)}
                  onClick={() => {
                    onProduceLotClick?.(produceLot);
                  }}
                  onDragEnd={canDragContainedProduce ? onProduceLotDragEnd : undefined}
                  onDragStart={(event) => {
                    if (!canDragContainedProduce) {
                      return;
                    }
                    onProduceLotDragStart?.(produceLot, event);
                  }}
                  produceLot={produceLot}
                  variant="compact"
                />
              ))
            ) : (
              <span className="rounded-full border border-dashed border-slate-300 px-3 py-0.5 text-xs font-medium text-slate-500">
                Drop produce lot here
              </span>
            )
          ) : tool.liquids.length > 0 ? (
            tool.liquids.map((liquid) => (
              <div
                key={liquid.id}
                className={`rounded-[0.9rem] border px-2.5 py-1 text-xs font-medium ${
                  isSealed
                    ? "cursor-not-allowed border-slate-200 bg-slate-100/90 text-slate-500 opacity-75"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getLiquidAccentPalette(liquid.accent).liquid }}
                    />
                    <span className="truncate">{liquid.name}</span>
                  </div>

                  <button
                    aria-label={`Remove ${liquid.name}`}
                    className="row-span-2 inline-flex h-8 w-8 items-center justify-center self-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                    disabled={isSealed}
                    draggable={false}
                    onClick={() => {
                      if (isSealed) {
                        return;
                      }
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

                  <span className="text-[11px] font-semibold text-slate-600">
                    {formatVolume(liquid.volume_ml)} mL
                  </span>
                </div>
              </div>
            ))
          ) : (
            <span className="rounded-full border border-dashed border-slate-300 px-3 py-0.5 text-xs font-medium text-slate-500">
              Drop liquid here
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
