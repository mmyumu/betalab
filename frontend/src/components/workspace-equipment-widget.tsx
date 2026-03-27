"use client";

import type { DragEvent, ReactNode } from "react";

import { dragAffordanceClassName } from "@/lib/drag-affordance";

type WorkspaceEquipmentWidgetProps = {
  badge?: string;
  children: ReactNode;
  dataDropHighlighted?: "true" | "false";
  description?: string;
  dropZoneTestId?: string;
  eyebrow: string;
  footer?: string;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  title?: string;
};

export function WorkspaceEquipmentWidget({
  badge,
  children,
  dataDropHighlighted = "false",
  description,
  dropZoneTestId,
  eyebrow,
  footer,
  onDragOver,
  onDrop,
  title,
}: WorkspaceEquipmentWidgetProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.95))] shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
      <div
        className={`${dragAffordanceClassName} border-b border-slate-200/80 bg-white/85 px-5 py-5 backdrop-blur xl:px-6 xl:py-6`}
        data-widget-drag-handle="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              {eyebrow}
            </p>
            {title ? (
              <h2 className="mt-1 text-xl font-semibold text-slate-950 xl:text-2xl">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-2 max-w-lg text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          {badge ? (
            <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-5 xl:px-6 xl:py-6">
        <div
          className={`rounded-[1.8rem] border bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),rgba(241,245,249,0.95))] p-4 shadow-inner transition-colors ${
            dataDropHighlighted === "true"
              ? "border-sky-300 ring-2 ring-sky-200/80"
              : "border-slate-200/80"
          }`}
          data-drop-highlighted={dataDropHighlighted}
          data-testid={dropZoneTestId}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {children}
        </div>
        {footer ? <p className="mt-4 text-sm text-slate-600">{footer}</p> : null}
      </div>
    </section>
  );
}
