"use client";

type TemperatureIndicatorProps = {
  temperatureC: number;
};

const ambientTemperatureC = 20;
const cryogenicTemperatureC = -78.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCryogenicStatus(temperatureC: number) {
  if (temperatureC <= -45) {
    return { label: "Cryogenic", toneClassName: "text-sky-700" };
  }

  if (temperatureC <= -5) {
    return { label: "Cooling fast", toneClassName: "text-cyan-700" };
  }

  return { label: "Cooling", toneClassName: "text-amber-700" };
}

export function TemperatureIndicator({ temperatureC }: TemperatureIndicatorProps) {
  const normalizedFill = clamp(
    (ambientTemperatureC - temperatureC) / (ambientTemperatureC - cryogenicTemperatureC),
    0,
    1,
  );
  const { label, toneClassName } = getCryogenicStatus(temperatureC);

  return (
    <div className="flex items-center gap-2 rounded-[0.9rem] border border-sky-100 bg-sky-50/80 px-2 py-1.5">
      <div className="relative flex h-10 w-4 items-end rounded-full border border-slate-300 bg-white p-[2px]">
        <div
          className="w-full rounded-full bg-[linear-gradient(180deg,#f59e0b_0%,#22d3ee_45%,#0284c7_100%)] transition-[height] duration-700"
          style={{ height: `${Math.max(normalizedFill * 100, 10)}%` }}
        />
        <span className="absolute -bottom-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-slate-300 bg-sky-500" />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClassName}`}>
          {label}
        </p>
        <p className="text-xs font-semibold text-slate-900">{temperatureC.toFixed(1)} C</p>
      </div>
    </div>
  );
}
