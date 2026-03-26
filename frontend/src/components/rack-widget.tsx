"use client";

import type { DragEvent } from "react";

import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";
import { dragAffordanceClassName } from "@/lib/drag-affordance";
import type { BenchToolInstance, RackSlot } from "@/types/workbench";

type RackWidgetProps = {
  dndDisabled?: boolean;
  getSlotPosition: (slotIndex: number) => { left: string; top: string };
  isSlotHighlighted: boolean;
  loadedCount: number;
  occupiedSlotLiquids: Record<number, BenchToolInstance["liquids"]>;
  occupiedSlots: number[];
  onItemDragEnd: () => void;
  onRackSlotDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onRackSlotDrop: (event: DragEvent<HTMLDivElement>, slotIndex: number) => void;
  onRackToolDragStart: (
    rackSlot: RackSlot,
    tool: BenchToolInstance,
    dataTransfer: DataTransfer,
  ) => void;
  rackSlots: RackSlot[];
  slotCount: number;
};

export function RackWidget({
  dndDisabled = false,
  getSlotPosition,
  isSlotHighlighted,
  loadedCount,
  occupiedSlotLiquids,
  occupiedSlots,
  onItemDragEnd,
  onRackSlotDragOver,
  onRackSlotDrop,
  onRackToolDragStart,
  rackSlots,
  slotCount,
}: RackWidgetProps) {
  return (
    <WorkspaceEquipmentWidget eyebrow="Autosampler rack">
      <div className="space-y-4">
        <div className="relative mx-auto max-w-[30rem]">
          <AutosamplerRackIllustration
            className="w-full"
            occupiedSlotLiquids={occupiedSlotLiquids}
            occupiedSlots={occupiedSlots}
            slotCount={slotCount}
            testId="autosampler-rack-illustration"
            tone={loadedCount > 0 ? "active" : "neutral"}
          />
          {rackSlots.map((rackSlot, slotIndex) => {
            const position = getSlotPosition(slotIndex);
            const tool = rackSlot.tool;

            return (
              <div
                className={`absolute h-14 w-12 -translate-x-1/2 -translate-y-[70%] rounded-full transition-colors ${
                  isSlotHighlighted ? "bg-sky-200/45 ring-2 ring-sky-300/90" : ""
                } ${tool && !dndDisabled ? dragAffordanceClassName : ""}`}
                data-drop-highlighted={isSlotHighlighted ? "true" : "false"}
                data-testid={`rack-illustration-slot-${slotIndex + 1}`}
                draggable={Boolean(tool) && !dndDisabled}
                key={rackSlot.id}
                onDragEnd={onItemDragEnd}
                onDragOver={dndDisabled ? undefined : onRackSlotDragOver}
                onDragStart={(event) => {
                  if (!tool || dndDisabled) {
                    return;
                  }
                  onRackToolDragStart(rackSlot, tool, event.dataTransfer);
                }}
                onDrop={dndDisabled ? undefined : (event) => onRackSlotDrop(event, slotIndex)}
                style={position}
              />
            );
          })}
        </div>
        <div
          className="rounded-[1.2rem] border border-slate-200/80 bg-white/90 px-3 py-3"
          data-testid="rack-summary"
        >
          {loadedCount > 0 ? (
            <div className="space-y-1.5">
              {rackSlots.map((rackSlot, slotIndex) => {
                const tool = rackSlot.tool;
                if (!tool) {
                  return null;
                }

                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-1.5"
                    data-testid={`rack-slot-summary-${slotIndex + 1}`}
                    key={rackSlot.id}
                  >
                    <div className="min-w-0 flex-1 text-sm text-slate-700">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        P{slotIndex + 1}
                      </span>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="truncate font-semibold text-slate-900">
                        {tool.label}
                      </span>
                    </div>
                    <div
                      className={`${dndDisabled ? "" : dragAffordanceClassName} shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600`}
                      data-testid={`rack-slot-tool-${slotIndex + 1}`}
                      draggable={!dndDisabled}
                      onDragEnd={onItemDragEnd}
                      onDragStart={(event) =>
                        dndDisabled ? undefined : onRackToolDragStart(rackSlot, tool, event.dataTransfer)
                      }
                    >
                      {tool.liquids.reduce((total, liquid) => total + liquid.volume_ml, 0)} mL
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No vial staged yet.</p>
          )}
        </div>
      </div>
    </WorkspaceEquipmentWidget>
  );
}
