"use client";

import type { DragEvent } from "react";

import { BenchToolCard } from "@/components/bench-tool-card";
import { readToolbarDragPayload } from "@/lib/workbench-dnd";
import type { BenchSlot, ToolbarDragPayload } from "@/types/workbench";

type PesticideWorkbenchPanelProps = {
  slots: BenchSlot[];
  statusMessage: string;
  onToolbarItemDrop: (slotId: string, payload: ToolbarDragPayload) => void;
};

export function PesticideWorkbenchPanel({
  slots,
  statusMessage,
  onToolbarItemDrop,
}: PesticideWorkbenchPanelProps) {
  const handleDrop = (event: DragEvent<HTMLElement>, slotId: string) => {
    event.preventDefault();

    const payload = readToolbarDragPayload(event.dataTransfer);
    if (!payload) {
      return;
    }

    onToolbarItemDrop(slotId, payload);
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff4dc_100%)] shadow-sm">
      <div className="border-b border-amber-200/80 bg-white/70 px-5 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Workbench
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Empty prep bench</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Drag a tool from the palette onto a station, then drop compatible liquids into the
              placed tool.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700">
            {statusMessage}
          </div>
        </div>
      </div>

      <div className="relative p-5">
        <div className="absolute inset-x-5 bottom-5 top-16 rounded-[2rem] bg-[linear-gradient(180deg,rgba(120,53,15,0)_0%,rgba(146,64,14,0.08)_30%,rgba(120,53,15,0.16)_100%)]" />
        <div className="absolute inset-x-8 bottom-7 h-4 rounded-full bg-amber-900/10 blur-md" />

        <div className="relative grid gap-4 xl:grid-cols-2">
          {slots.map((slot) => (
            <article
              key={slot.id}
              className="rounded-[1.8rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_40px_rgba(148,95,33,0.08)]"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {slot.tool ? "Ready for liquid additions." : "Waiting for a first tool."}
                  </p>
                </div>
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-white/80">
                  Drop zone
                </span>
              </div>

              <div
                className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white/90 p-3"
                data-testid={`bench-slot-${slot.id}`}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => handleDrop(event, slot.id)}
              >
                {slot.tool ? (
                  <BenchToolCard tool={slot.tool} />
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                    <p className="text-sm font-semibold text-slate-900">Empty station</p>
                    <p className="mt-2 max-w-xs text-sm text-slate-600">
                      Drop a workflow tool here to start building the pesticide preparation bench.
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
