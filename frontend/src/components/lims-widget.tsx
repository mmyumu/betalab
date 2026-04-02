"use client";

import { useEffect, useState } from "react";

import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";
import type { LimsReception, PrintedLabelTicket } from "@/types/workbench";

type LimsWidgetProps = {
  onCreateReception: (payload: {
    harvest_date: string;
    indicative_mass_g: number;
    orchard_name: string;
  }) => void;
  onPrintLabel: () => void;
  onTicketDragEnd?: () => void;
  onTicketDragStart?: (ticket: PrintedLabelTicket, dataTransfer: DataTransfer) => void;
  reception: LimsReception;
};

export function LimsWidget({
  onCreateReception,
  onPrintLabel,
  onTicketDragEnd,
  onTicketDragStart,
  reception,
}: LimsWidgetProps) {
  const [orchardName, setOrchardName] = useState(reception.orchardName);
  const [harvestDate, setHarvestDate] = useState(reception.harvestDate);
  const [indicativeMassText, setIndicativeMassText] = useState(
    reception.indicativeMassG > 0 ? reception.indicativeMassG.toFixed(0) : "",
  );

  useEffect(() => {
    if (reception.status !== "awaiting_reception") {
      setOrchardName(reception.orchardName);
      setHarvestDate(reception.harvestDate);
      setIndicativeMassText(
        reception.indicativeMassG > 0 ? reception.indicativeMassG.toFixed(0) : "",
      );
    }
  }, [reception.harvestDate, reception.indicativeMassG, reception.orchardName, reception.status]);

  const indicativeMassValue = Number.parseFloat(indicativeMassText);
  const hasIndicativeMass =
    Number.isFinite(indicativeMassValue) && indicativeMassValue > 0;
  const formatIndicativeMass = (massG: number) =>
    Number.isInteger(massG) ? `${massG.toFixed(0)} g` : `${massG.toFixed(1)} g`;
  const canCreateReception =
    orchardName.trim().length > 0 &&
    harvestDate.trim().length > 0 &&
    hasIndicativeMass;
  const canPrintLabel =
    reception.labSampleCode !== null && reception.printedLabelTicket === null;
  const isEmptyState =
    reception.labSampleCode === null &&
    reception.orchardName.trim().length === 0 &&
    reception.harvestDate.trim().length === 0 &&
    reception.indicativeMassG <= 0;

  return (
    <WorkspaceEquipmentWidget
      bodyClassName="px-4 py-4"
      eyebrow="LIMS"
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-[1.4rem] border border-slate-300 bg-[linear-gradient(180deg,#d8dee5,#c2ccd6)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <div className="rounded-t-[1.4rem] border-b border-slate-300 bg-[linear-gradient(180deg,#f8fafc,#e2e8f0)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                LIMS terminal
              </p>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              </div>
            </div>
          </div>
          <div className="bg-[linear-gradient(180deg,#0f172a,#16233a)] px-4 py-4">
            <svg
              aria-label="LIMS terminal screen"
              className="h-[15.5rem] w-full rounded-[1rem] border border-sky-400/25 bg-[#07111f] shadow-[inset_0_0_0_1px_rgba(125,211,252,0.06)]"
              viewBox="0 0 360 248"
            >
              <rect x="0" y="0" width="360" height="248" rx="18" fill="#07111f" />
              <rect x="18" y="18" width="324" height="28" rx="8" fill="#0d1b2d" />
              <circle cx="34" cy="32" r="4" fill="#22c55e" />
              <text x="52" y="36" fill="#7dd3fc" fontSize="13" fontFamily="monospace">
                sample_login.exe
              </text>
              {isEmptyState ? (
                <>
                  <text x="28" y="78" fill="#e2e8f0" fontSize="15" fontFamily="monospace">
                    Awaiting accession
                  </text>
                  <text x="28" y="104" fill="#7dd3fc" fontSize="12" fontFamily="monospace">
                    Enter sample details and record gross weight.
                  </text>
                  <text x="28" y="136" fill="#94a3b8" fontSize="12" fontFamily="monospace">
                    Orchard: --
                  </text>
                  <text x="28" y="156" fill="#94a3b8" fontSize="12" fontFamily="monospace">
                    Harvest date: --
                  </text>
                  <text x="28" y="176" fill="#94a3b8" fontSize="12" fontFamily="monospace">
                    Indicative mass: --
                  </text>
                  <text x="28" y="196" fill="#94a3b8" fontSize="12" fontFamily="monospace">
                    Gross lab mass: --
                  </text>
                  <text x="28" y="224" fill="#38bdf8" fontSize="12" fontFamily="monospace">
                    Status: waiting for user entry
                  </text>
                </>
              ) : (
                <>
                  <text x="28" y="78" fill="#e2e8f0" fontSize="15" fontFamily="monospace">
                    Reception record
                  </text>
                  <text x="28" y="106" fill="#7dd3fc" fontSize="12" fontFamily="monospace">
                    Orchard: {reception.orchardName || orchardName || "--"}
                  </text>
                  <text x="28" y="126" fill="#7dd3fc" fontSize="12" fontFamily="monospace">
                    Harvest date: {reception.harvestDate || harvestDate || "--"}
                  </text>
                  <text x="28" y="146" fill="#7dd3fc" fontSize="12" fontFamily="monospace">
                    Indicative mass: {reception.indicativeMassG > 0 ? formatIndicativeMass(reception.indicativeMassG) : hasIndicativeMass ? formatIndicativeMass(indicativeMassValue) : "--"}
                  </text>
                  <text x="28" y="166" fill="#7dd3fc" fontSize="12" fontFamily="monospace">
                    Gross lab mass: {reception.measuredGrossMassG === null ? "--" : `${reception.measuredGrossMassG.toFixed(1)} g`}
                  </text>
                  <text x="28" y="186" fill="#7dd3fc" fontSize="12" fontFamily="monospace">
                    Sample code: {reception.labSampleCode ?? "--"}
                  </text>
                  <text x="28" y="214" fill="#22c55e" fontSize="12" fontFamily="monospace">
                    Status: {reception.status}
                  </text>
                </>
              )}
            </svg>
          </div>
          <div className="border-t border-slate-300 bg-[linear-gradient(180deg,#c9d2dc,#b6c2cd)] px-4 py-3">
            <div className="flex items-end justify-between gap-4">
              <div className="h-5 w-20 rounded-t-[0.7rem] border border-slate-400/80 border-b-0 bg-[linear-gradient(180deg,#e2e8f0,#cbd5e1)] px-2 pt-1">
                {reception.printedLabelTicket ? (
                  <div
                    className="h-6 w-14 rounded-[0.35rem] border border-slate-300 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.12)]"
                    data-testid="lims-printer-ticket"
                  />
                ) : null}
              </div>
              <div className="h-3.5 w-28 rounded-full border border-slate-400/80 bg-[linear-gradient(180deg,#94a3b8,#64748b)]" />
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600">Orchard / producer</span>
            <input
              className="rounded-[0.9rem] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400"
              onChange={(event) => setOrchardName(event.target.value)}
              placeholder="Enter orchard or producer"
              type="text"
              value={orchardName}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600">Harvest date</span>
            <input
              className="rounded-[0.9rem] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-sky-400"
              onChange={(event) => setHarvestDate(event.target.value)}
              type="date"
              value={harvestDate}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600">Indicative field mass (g)</span>
            <input
              className="rounded-[0.9rem] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400"
              inputMode="decimal"
              min="0"
              onChange={(event) => setIndicativeMassText(event.target.value)}
              placeholder="2500"
              step="0.1"
              type="number"
              value={indicativeMassText}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            disabled={!canCreateReception}
            onClick={() =>
              onCreateReception({
                harvest_date: harvestDate,
                indicative_mass_g: indicativeMassValue,
                orchard_name: orchardName,
              })
            }
            type="button"
          >
            Create LIMS record
          </button>
          <button
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-40"
            disabled={!canPrintLabel}
            onClick={onPrintLabel}
            type="button"
          >
            Print label
          </button>
        </div>
        {reception.printedLabelTicket ? (
          <div
            className="cursor-grab rounded-[1rem] border border-dashed border-sky-300 bg-sky-50 px-3 py-2"
            data-testid="lims-printed-ticket"
            draggable
            onDragEnd={onTicketDragEnd}
            onDragStart={(event) => {
              onTicketDragStart?.(reception.printedLabelTicket!, event.dataTransfer);
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Printed ticket
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {reception.printedLabelTicket.sampleCode}
            </p>
            <p className="text-xs text-slate-600">{reception.printedLabelTicket.labelText}</p>
          </div>
        ) : null}
      </div>
    </WorkspaceEquipmentWidget>
  );
}
