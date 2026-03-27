"use client";

import { InlineQuantityInput } from "@/components/inline-quantity-input";

type QuantitySelectionCardProps = {
  ariaLabel: string;
  confirmLabel?: string;
  inputStep?: number;
  onCancel: () => void;
  onChange: (value: number) => void;
  onConfirm: () => void;
  stepAmount: number;
  title: string;
  unitLabel: string;
  value: number;
  wheelStep?: number;
};

export function QuantitySelectionCard({
  ariaLabel,
  confirmLabel = "Add",
  inputStep = 0.1,
  onCancel,
  onChange,
  onConfirm,
  stepAmount,
  title,
  unitLabel,
  value,
  wheelStep,
}: QuantitySelectionCardProps) {
  return (
    <div className="rounded-[1rem] border border-sky-200 bg-sky-50/80 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
        </div>
        <button
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            aria-label={`Decrease ${ariaLabel}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            onClick={() => {
              onChange(Math.max(value - stepAmount, 0));
            }}
            type="button"
          >
            -
          </button>
          <InlineQuantityInput
            ariaLabel={ariaLabel}
            inputStep={inputStep}
            onChange={(nextValue) => {
              onChange(Math.max(nextValue, 0));
            }}
            unitLabel={unitLabel}
            value={value}
            wheelStep={wheelStep ?? stepAmount}
          />
          <button
            aria-label={`Increase ${ariaLabel}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            onClick={() => {
              onChange(value + stepAmount);
            }}
            type="button"
          >
            +
          </button>
        </div>
        <button
          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          onClick={onConfirm}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
