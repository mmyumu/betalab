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

function getToolCurrentVolume(tool: BenchToolInstance) {
  return tool.liquids.reduce((total, portion) => total + portion.volume_ml, 0);
}

function formatVolume(volumeMl: number) {
  return Number.isInteger(volumeMl) ? volumeMl.toString() : volumeMl.toFixed(1);
}

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

function createLiquidPortion(liquidId: string, volumeMl: number): BenchLiquidPortion {
  const liquid = pesticideLiquidCatalog[liquidId];

  return {
    id: `${liquid.id}_${crypto.randomUUID()}`,
    liquidId: liquid.id,
    name: liquid.name,
    volume_ml: volumeMl,
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
        const currentVolume = getToolCurrentVolume(slot.tool);
        const remainingCapacity = Math.max(slot.tool.capacity_ml - currentVolume, 0);

        if (remainingCapacity <= 0) {
          setStatusMessage(`${slot.tool.label} is already full.`);
          return slot;
        }

        const initialVolume = Math.min(liquid.transfer_volume_ml, remainingCapacity);
        const usedRemainingCapacity = initialVolume < liquid.transfer_volume_ml;

        setStatusMessage(
          usedRemainingCapacity
            ? `${liquid.name} added to ${slot.tool.label} at ${formatVolume(initialVolume)} mL (remaining capacity).`
            : `${liquid.name} added to ${slot.tool.label}.`,
        );
        return {
          ...slot,
          tool: {
            ...slot.tool,
            liquids: [...slot.tool.liquids, createLiquidPortion(payload.itemId, initialVolume)],
          },
        };
      }),
    );
  };

  const handleLiquidVolumeChange = (slotId: string, liquidId: string, volumeMl: number) => {
    setSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (slot.id !== slotId || !slot.tool) {
          return slot;
        }

        const targetLiquid = slot.tool.liquids.find((liquid) => liquid.id === liquidId);
        if (!targetLiquid) {
          return slot;
        }

        const occupiedByOtherLiquids = slot.tool.liquids.reduce(
          (total, liquid) => total + (liquid.id === liquidId ? 0 : liquid.volume_ml),
          0,
        );
        const maxAllowedVolume = Math.max(slot.tool.capacity_ml - occupiedByOtherLiquids, 0);
        const nextVolume = Math.min(Math.max(volumeMl, 0), maxAllowedVolume);

        setStatusMessage(
          `${targetLiquid.name} adjusted to ${formatVolume(nextVolume)} mL in ${slot.tool.label}.`,
        );

        return {
          ...slot,
          tool: {
            ...slot.tool,
            liquids: slot.tool.liquids.map((liquid) =>
              liquid.id === liquidId ? { ...liquid, volume_ml: nextVolume } : liquid,
            ),
          },
        };
      }),
    );
  };

  const placedTools = slots.filter((slot) => slot.tool).length;
  const liquidTransfers = slots.reduce((total, slot) => total + (slot.tool?.liquids.length ?? 0), 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto max-w-[1800px]">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight xl:text-[3.25rem]">
                Pesticide prep workbench
              </h1>
              <p className="mt-2 max-w-5xl text-sm text-slate-600 xl:text-base">
                Start from an empty bench, place QuEChERS prep tools, and add the first liquids of
                the pesticide extraction workflow before moving toward cleanup and LC-MS/MS.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 xl:min-w-[18rem]">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white xl:px-5 xl:py-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Placed tools</p>
                <p className="mt-1 text-lg font-semibold xl:text-2xl">{placedTools}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:px-5 xl:py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Liquid drops</p>
                <p className="mt-1 text-lg font-semibold xl:text-2xl">{liquidTransfers}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)] 2xl:grid-cols-[310px_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-6 xl:self-start">
            <ToolbarPanel categories={pesticideWorkflowCategories} />
          </div>

          <section className="space-y-6">
            <PesticideWorkbenchPanel
              onLiquidVolumeChange={handleLiquidVolumeChange}
              slots={slots}
              statusMessage={statusMessage}
              onToolbarItemDrop={handleToolbarItemDrop}
            />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm xl:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Workflow anchor
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">First simulation scope</h2>
              <p className="mt-3 max-w-5xl text-sm text-slate-600 xl:text-base">
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
