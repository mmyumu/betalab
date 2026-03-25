"use client";

import type { DragEvent } from "react";

import { BenchToolCard } from "@/components/bench-tool-card";
import { dragAffordanceClassName } from "@/lib/drag-affordance";
import {
  hasCompatibleDropTarget,
  readDragDescriptor,
  readBenchToolDragPayload,
  readProduceDragPayload,
  readRackToolDragPayload,
  readTrashToolDragPayload,
  readToolbarDragPayload,
} from "@/lib/workbench-dnd";
import type {
  BenchSlot,
  BenchToolDragPayload,
  BenchToolInstance,
  ProduceDragPayload,
  RackToolDragPayload,
  TrashToolDragPayload,
  ToolbarDragPayload,
} from "@/types/workbench";

type ToolDropPayload = BenchToolDragPayload | RackToolDragPayload | TrashToolDragPayload;

type PesticideWorkbenchPanelProps = {
  onAddWorkbenchSlot?: () => void;
  canDragBenchTool?: (slotId: string, tool: BenchToolInstance) => boolean;
  onBenchToolDragStart?: (
    slotId: string,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => void;
  onBenchToolDragEnd?: () => void;
  onBenchToolDrop?: (targetSlotId: string, payload: ToolDropPayload) => void;
  onProduceDrop?: (targetSlotId: string, payload: ProduceDragPayload) => void;
  isBenchSlotHighlighted?: (slot: BenchSlot) => boolean;
  onRemoveLiquid: (slotId: string, liquidId: string) => void;
  onRemoveWorkbenchSlot?: (slotId: string) => void;
  onLiquidVolumeChange: (slotId: string, liquidId: string, volumeMl: number) => void;
  slots: BenchSlot[];
  statusMessage: string;
  onToolbarItemDrop: (slotId: string, payload: ToolbarDragPayload) => void;
};

export function PesticideWorkbenchPanel({
  onAddWorkbenchSlot,
  canDragBenchTool,
  isBenchSlotHighlighted,
  onBenchToolDragEnd,
  onBenchToolDragStart,
  onBenchToolDrop,
  onProduceDrop,
  onRemoveLiquid,
  onRemoveWorkbenchSlot,
  onLiquidVolumeChange,
  slots,
  statusMessage,
  onToolbarItemDrop,
}: PesticideWorkbenchPanelProps) {
  const canAcceptWorkbenchDrop = (event: DragEvent<HTMLElement>, slot: BenchSlot) => {
    if (!hasCompatibleDropTarget(event.dataTransfer, "workbench_slot")) {
      return false;
    }

    const descriptor = readDragDescriptor(event.dataTransfer);
    if (!descriptor) {
      return false;
    }

    if (descriptor.entityKind === "tool") {
      if (descriptor.sourceKind === "workbench") {
        return slot.tool === null && descriptor.sourceId !== slot.id;
      }

      if (
        descriptor.sourceKind === "palette" ||
        descriptor.sourceKind === "rack" ||
        descriptor.sourceKind === "trash"
      ) {
        return slot.tool === null;
      }
    }

    if (descriptor.entityKind === "liquid") {
      return slot.tool !== null && slot.tool.accepts_liquids;
    }

    if (descriptor.entityKind === "produce") {
      return slot.tool?.toolType === "sample_bag";
    }

    return false;
  };

  const handleDrop = (event: DragEvent<HTMLElement>, slot: BenchSlot) => {
    if (!canAcceptWorkbenchDrop(event, slot)) {
      return;
    }

    event.preventDefault();

    const benchToolPayload = readBenchToolDragPayload(event.dataTransfer);
    if (benchToolPayload) {
      onBenchToolDrop?.(slot.id, benchToolPayload);
      return;
    }

    const rackToolPayload = readRackToolDragPayload(event.dataTransfer);
    if (rackToolPayload) {
      onBenchToolDrop?.(slot.id, rackToolPayload);
      return;
    }

    const trashToolPayload = readTrashToolDragPayload(event.dataTransfer);
    if (trashToolPayload) {
      onBenchToolDrop?.(slot.id, trashToolPayload);
      return;
    }

    const producePayload = readProduceDragPayload(event.dataTransfer);
    if (producePayload) {
      onProduceDrop?.(slot.id, producePayload);
      return;
    }

    const payload = readToolbarDragPayload(event.dataTransfer);
    if (!payload) {
      return;
    }

    onToolbarItemDrop(slot.id, payload);
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff4dc_100%)] shadow-sm">
      <div
        className={`${dragAffordanceClassName} border-b border-amber-200/80 bg-white/70 px-5 py-5 backdrop-blur xl:px-6 xl:py-6`}
        data-widget-drag-handle="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Workbench
            </p>
          </div>

          <button
            aria-label="Add workbench station"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white/85 text-lg font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-white"
            data-testid="add-workbench-slot-button"
            onClick={() => {
              onAddWorkbenchSlot?.();
            }}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div className="relative p-5 xl:p-6">
        <div className="absolute inset-x-5 bottom-5 top-16 rounded-[2rem] bg-[linear-gradient(180deg,rgba(120,53,15,0)_0%,rgba(146,64,14,0.08)_30%,rgba(120,53,15,0.16)_100%)]" />
        <div className="absolute inset-x-8 bottom-7 h-4 rounded-full bg-amber-900/10 blur-md" />

        <div className="relative grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {slots.map((slot) => {
            const tool = slot.tool;
            const highlightsWorkbenchDrop = isBenchSlotHighlighted?.(slot) ?? false;
            const canAcceptWorkbenchDragOver = (event: DragEvent<HTMLElement>) => {
              if (isBenchSlotHighlighted) {
                return highlightsWorkbenchDrop;
              }

              return canAcceptWorkbenchDrop(event, slot);
            };

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
                  <button
                    aria-label={`Remove ${slot.label}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    data-testid={`remove-workbench-slot-button-${slot.id}`}
                    disabled={tool !== null}
                    onClick={() => {
                      if (tool !== null) {
                        return;
                      }
                      onRemoveWorkbenchSlot?.(slot.id);
                    }}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 8H12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </button>
                </div>

                <div
                  className={`rounded-[1.6rem] border border-dashed bg-white/90 p-3 transition-colors ${
                    highlightsWorkbenchDrop
                      ? "border-sky-300 bg-sky-50/70 ring-2 ring-sky-200/80"
                      : "border-slate-300"
                  }`}
                  data-drop-highlighted={highlightsWorkbenchDrop ? "true" : "false"}
                  data-testid={`bench-slot-${slot.id}`}
                  onDragOver={(event) => {
                    if (!canAcceptWorkbenchDragOver(event)) {
                      return;
                    }
                    event.preventDefault();
                  }}
                  onDrop={(event) => handleDrop(event, slot)}
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
                      onDragEnd={() => {
                        onBenchToolDragEnd?.();
                      }}
                      onRemoveLiquid={(liquidId) => {
                        onRemoveLiquid(slot.id, liquidId);
                      }}
                      onLiquidVolumeChange={(liquidId, volumeMl) => {
                        onLiquidVolumeChange(slot.id, liquidId, volumeMl);
                      }}
                      tool={tool}
                    />
                  ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center 2xl:min-h-[20rem]">
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
