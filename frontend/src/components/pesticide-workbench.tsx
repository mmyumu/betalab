"use client";

import { useState } from "react";

import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import { ToolbarPanel } from "@/components/toolbar-panel";
import {
  initialWorkbenchSlots,
  pesticideLiquidCatalog,
  pesticideToolCatalog,
  pesticideWorkflowCategories,
} from "@/lib/pesticide-workflow-catalog";
import type { BenchLiquidPortion, BenchSlot, BenchToolInstance, ToolbarDragPayload } from "@/types/workbench";

function createToolInstance(toolId: string): BenchToolInstance {
  const tool = pesticideToolCatalog[toolId];

  return {
    id: `${tool.id}_${crypto.randomUUID()}`,
    toolId: tool.id,
    label: tool.name,
    subtitle: tool.subtitle,
    accent: tool.accent,
    toolType: tool.toolType,
    capacity_ml: tool.capacity_ml,
    accepts_liquids: tool.accepts_liquids,
    liquids: [],
  };
}

function createLiquidPortion(liquidId: string): BenchLiquidPortion {
  const liquid = pesticideLiquidCatalog[liquidId];

  return {
    id: `${liquid.id}_${crypto.randomUUID()}`,
    liquidId: liquid.id,
    name: liquid.name,
    volume_ml: liquid.transfer_volume_ml,
    accent: liquid.accent,
  };
}

export function PesticideWorkbench() {
  const [slots, setSlots] = useState<BenchSlot[]>(initialWorkbenchSlots);
  const [statusMessage, setStatusMessage] = useState(
    "Start by dragging an extraction tool onto the bench.",
  );

  const handleToolbarItemDrop = (slotId: string, payload: ToolbarDragPayload) => {
    setSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (slot.id !== slotId) {
          return slot;
        }

        if (payload.itemType === "tool") {
          if (slot.tool) {
            setStatusMessage(`${slot.label} already contains a tool.`);
            return slot;
          }

          const nextTool = createToolInstance(payload.itemId);
          setStatusMessage(`${nextTool.label} placed on ${slot.label}.`);
          return { ...slot, tool: nextTool };
        }

        if (!slot.tool) {
          setStatusMessage(`Place a tool on ${slot.label} before adding liquids.`);
          return slot;
        }

        if (!slot.tool.accepts_liquids) {
          setStatusMessage(`${slot.tool.label} does not accept liquids.`);
          return slot;
        }

        const liquid = pesticideLiquidCatalog[payload.itemId];
        const currentVolume = slot.tool.liquids.reduce((total, portion) => total + portion.volume_ml, 0);

        if (currentVolume + liquid.transfer_volume_ml > slot.tool.capacity_ml) {
          setStatusMessage(`${liquid.name} would exceed the capacity of ${slot.tool.label}.`);
          return slot;
        }

        setStatusMessage(`${liquid.name} added to ${slot.tool.label}.`);
        return {
          ...slot,
          tool: {
            ...slot.tool,
            liquids: [...slot.tool.liquids, createLiquidPortion(payload.itemId)],
          },
        };
      }),
    );
  };

  const placedTools = slots.filter((slot) => slot.tool).length;
  const liquidTransfers = slots.reduce((total, slot) => total + (slot.tool?.liquids.length ?? 0), 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Pesticide prep workbench</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Start from an empty bench, place QuEChERS prep tools, and add the first liquids of
                the pesticide extraction workflow before moving toward cleanup and LC-MS/MS.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-wide text-slate-300">Placed tools</p>
                <p className="mt-1 text-lg font-semibold">{placedTools}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Liquid drops</p>
                <p className="mt-1 text-lg font-semibold">{liquidTransfers}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ToolbarPanel categories={pesticideWorkflowCategories} />

          <section className="space-y-6">
            <PesticideWorkbenchPanel
              slots={slots}
              statusMessage={statusMessage}
              onToolbarItemDrop={handleToolbarItemDrop}
            />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Workflow anchor
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">First simulation scope</h2>
              <p className="mt-3 text-sm text-slate-600">
                This first slice covers only the bench setup phase: place a tube, add acetonitrile
                and sample matrix, then prepare the path toward cleanup and final injection.
              </p>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
