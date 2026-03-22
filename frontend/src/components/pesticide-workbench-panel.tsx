"use client";

import type { DragEvent } from "react";

import { BenchToolCard } from "@/components/bench-tool-card";
import {
  hasCompatibleDropTarget,
  readBenchToolDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
} from "@/lib/workbench-dnd";
import type {
  BenchSlot,
  BenchToolDragPayload,
  BenchToolInstance,
  RackToolDragPayload,
  ToolbarDragPayload,
} from "@/types/workbench";

type ToolDropPayload = BenchToolDragPayload | RackToolDragPayload;

type PesticideWorkbenchPanelProps = {
  canDragBenchTool?: (slotId: string, tool: BenchToolInstance) => boolean;
  onBenchToolDragStart?: (
    slotId: string,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => void;
  onBenchToolDrop?: (targetSlotId: string, payload: ToolDropPayload) => void;
  onLiquidVolumeChange: (slotId: string, liquidId: string, volumeMl: number) => void;
  slots: BenchSlot[];
  statusMessage: string;
  onToolbarItemDrop: (slotId: string, payload: ToolbarDragPayload) => void;
};

export function PesticideWorkbenchPanel({
  canDragBenchTool,
  onBenchToolDragStart,
  onBenchToolDrop,
  onLiquidVolumeChange,
  slots,
  statusMessage,
  onToolbarItemDrop,
}: PesticideWorkbenchPanelProps) {
  const acceptsWorkbenchDrop = (event: DragEvent<HTMLElement>) => {
    return hasCompatibleDropTarget(event.dataTransfer, "workbench_slot");
  };

  const handleDrop = (event: DragEvent<HTMLElement>, slotId: string) => {
    if (!acceptsWorkbenchDrop(event)) {
      return;
    }

    event.preventDefault();

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload) {
      onBenchToolDrop?.(slotId, benchToolPayload);
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload) {
      onBenchToolDrop?.(slotId, rackToolPayload);
      return;
    }

    const payload = readToolbarDragPayload(event.dataTransfer);
    if (!payload) {
      return;
    }

    onToolbarItemDrop(slotId, payload);
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff4dc_100%)] shadow-sm">
      <div className="border-b border-amber-200/80 bg-white/70 px-5 py-5 backdrop-blur xl:px-6 xl:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Workbench
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 xl:text-2xl">Empty prep bench</h2>
            <p className="mt-2 max-w-4xl text-sm text-slate-600 xl:text-base">
              Drag a tool from the palette onto a station, then drop compatible liquids into the
              placed tool.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 xl:min-w-[20rem]">
            {statusMessage}
          </div>
        </div>
      </div>

      <div className="relative p-5 xl:p-6">
        <div className="absolute inset-x-5 bottom-5 top-16 rounded-[2rem] bg-[linear-gradient(180deg,rgba(120,53,15,0)_0%,rgba(146,64,14,0.08)_30%,rgba(120,53,15,0.16)_100%)]" />
        <div className="absolute inset-x-8 bottom-7 h-4 rounded-full bg-amber-900/10 blur-md" />

        <div className="relative grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {slots.map((slot) => {
            const tool = slot.tool;

            return (
              <article
                key={slot.id}
                className="rounded-[1.8rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_40px_rgba(148,95,33,0.08)] xl:p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {tool ? "Ready for liquid additions." : "Waiting for a first tool."}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white/90 p-3"
                  data-testid={`bench-slot-${slot.id}`}
                  onDragOver={(event) => {
                    if (!acceptsWorkbenchDrop(event)) {
                      return;
                    }
                    event.preventDefault();
                  }}
                  onDrop={(event) => handleDrop(event, slot.id)}
                >
                  {tool ? (
                    <BenchToolCard
                      draggable={
                        canDragBenchTool ? canDragBenchTool(slot.id, tool) : false
                      }
                      onDragStart={(event) => {
                        if (!onBenchToolDragStart) {
                          return;
                        }
                        onBenchToolDragStart(slot.id, tool, event.dataTransfer);
                      }}
                      onLiquidVolumeChange={(liquidId, volumeMl) => {
                        onLiquidVolumeChange(slot.id, liquidId, volumeMl);
                      }}
                      tool={tool}
                    />
                  ) : (
                    <div className="flex min-h-72 flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center 2xl:min-h-[26rem]">
                      <p className="text-sm font-semibold text-slate-900">Empty station</p>
                      <p className="mt-2 max-w-xs text-sm text-slate-600">
                        Drop a workflow tool here to start building the bench.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
