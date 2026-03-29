"use client";

import type { DragEvent, ReactNode } from "react";

import { AppleIllustration } from "@/components/illustrations/apple-illustration";
import { TemperatureIndicator } from "@/components/temperature-indicator";
import { dragAffordanceClassName } from "@/lib/drag-affordance";
import { getProduceLotDisplayName } from "@/lib/produce-lot-display";
import type { ExperimentProduceLot } from "@/types/workbench";

type ProduceLotCardProps = {
  className?: string;
  dataTestId: string;
  draggable?: boolean;
  footerBadge?: ReactNode;
  metadata: string;
  onClick?: () => void;
  onDragEnd?: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  produceLot: ExperimentProduceLot;
  variant: "compact" | "expanded";
};

const ambientTemperatureC = 20;

export function ProduceLotCard({
  className = "",
  dataTestId,
  draggable = false,
  footerBadge,
  metadata,
  onClick,
  onDragEnd,
  onDragStart,
  produceLot,
  variant,
}: ProduceLotCardProps) {
  const displayName = getProduceLotDisplayName(produceLot);
  const cardClassName =
    variant === "compact"
      ? "rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
      : "flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2";

  return (
    <div
      className={`${draggable ? dragAffordanceClassName : ""} ${cardClassName} ${className}`.trim()}
      data-testid={dataTestId}
      draggable={draggable}
      onClick={onClick}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      {variant === "compact" ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold leading-4 text-slate-900" title={displayName}>
            {displayName}
          </p>
          <div className="flex items-start gap-2">
            <AppleIllustration
              className="h-10 w-10 shrink-0"
              variant={produceLot.cutState === "whole" ? "whole" : "cut"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-[1.05rem] text-slate-500" title={metadata}>
                {metadata}
              </p>
            </div>
            <div className="shrink-0">
              <TemperatureIndicator
                temperatureC={produceLot.temperatureC ?? ambientTemperatureC}
              />
            </div>
          </div>
          {footerBadge ?? null}
        </div>
      ) : (
        <>
          <div className="min-w-0 flex flex-1 items-center gap-3">
            <div className="h-10 w-10 shrink-0">
              <AppleIllustration
                className="h-10 w-10"
                variant={produceLot.cutState === "whole" ? "whole" : "cut"}
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900" title={displayName}>
                {displayName}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500" title={metadata}>
                {metadata}
              </span>
            </div>
          </div>
          <div className="self-stretch flex items-center">
            <TemperatureIndicator
              temperatureC={produceLot.temperatureC ?? ambientTemperatureC}
            />
          </div>
        </>
      )}
    </div>
  );
}
