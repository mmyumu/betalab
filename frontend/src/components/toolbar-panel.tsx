"use client";

import { useState } from "react";

import { LabAssetIcon } from "@/components/icons/lab-asset-icon";
import { writeToolbarDragPayload } from "@/lib/workbench-dnd";
import type { ToolbarAccent, ToolbarCategory } from "@/types/workbench";

type ToolbarPanelProps = {
  categories: ToolbarCategory[];
};

const accentClasses: Record<ToolbarAccent, string> = {
  amber: "from-amber-500/20 via-amber-100 to-white text-amber-900 ring-amber-200",
  emerald:
    "from-emerald-500/20 via-emerald-100 to-white text-emerald-900 ring-emerald-200",
  rose: "from-rose-500/20 via-rose-100 to-white text-rose-900 ring-rose-200",
  sky: "from-sky-500/20 via-sky-100 to-white text-sky-900 ring-sky-200",
};

export function ToolbarPanel({ categories }: ToolbarPanelProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  return (
    <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Palette</p>
      <h2 className="mt-1 text-base font-semibold text-slate-950">Inventory rail</h2>

      <div className="mt-3 space-y-3">
        {categories.map((category) => (
          <article
            key={category.id}
            className="rounded-[1.1rem] border border-slate-200 bg-slate-50/80 p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <button
                  aria-expanded={!collapsedCategories[category.id]}
                  className="flex items-center gap-1.5 text-left"
                  onClick={() => {
                    setCollapsedCategories((current) => ({
                      ...current,
                      [category.id]: !current[category.id],
                    }));
                  }}
                  type="button"
                >
                  <span className="w-2.5 text-xs font-semibold leading-none text-slate-400">
                    {collapsedCategories[category.id] ? "+" : "-"}
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-900">
                    {category.label}
                  </h3>
                </button>
              </div>
            </div>

            {!collapsedCategories[category.id] ? (
              <div className="mt-2.5 space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[0.95rem] bg-gradient-to-br p-2 ring-1 transition-transform hover:-translate-y-0.5 ${accentClasses[item.accent]}`}
                    data-testid={`toolbar-item-${item.id}`}
                    draggable
                    onDragStart={(event) => {
                      writeToolbarDragPayload(event.dataTransfer, {
                        itemId: item.id,
                        itemType: item.itemType,
                      });
                    }}
                    title={item.description}
                  >
                    <div className="flex items-center gap-2">
                      <LabAssetIcon
                        accent={item.accent}
                        className="h-8 w-7 shrink-0"
                        kind={item.itemType === "tool" ? item.toolType : item.liquidType}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-4">{item.name}</p>
                        <p className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
