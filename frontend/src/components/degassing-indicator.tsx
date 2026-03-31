"use client";

type DegassingIndicatorProps = {
  progress: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DegassingIndicator({ progress }: DegassingIndicatorProps) {
  const normalizedProgress = clamp(progress, 0, 1);

  return (
    <div
      aria-label="Degassing indicator"
      className="group relative inline-flex items-center rounded-[0.75rem] border border-slate-200 bg-slate-100/85 px-1 py-1"
      data-testid="degassing-indicator"
      tabIndex={0}
    >
      <div className="relative flex h-8 w-3 items-end rounded-full border border-slate-300 bg-white p-[2px]">
        <div
          className="w-full rounded-full bg-[linear-gradient(180deg,#e5e7eb_0%,#9ca3af_55%,#6b7280_100%)] transition-[height] duration-700"
          data-testid="degassing-indicator-fill"
          style={{ height: `${Math.max(normalizedProgress * 100, normalizedProgress > 0 ? 10 : 0)}%` }}
        />
      </div>
      <span
        className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 z-10 -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 text-[10px] font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        role="tooltip"
      >
        Degassing
      </span>
    </div>
  );
}
