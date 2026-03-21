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
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Lab toolbar
      </p>
      <h2 className="mt-1 text-xl font-semibold text-slate-950">Bench inventory</h2>
      <p className="mt-3 text-sm text-slate-600">
        A first catalog of common labware and prep liquids you can surface in the GUI.
      </p>

      <div className="mt-6 space-y-5">
        {categories.map((category) => (
          <article
            key={category.id}
            className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{category.label}</h3>
                <p className="mt-1 text-sm text-slate-600">{category.description}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {category.items.length} items
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-[1.4rem] bg-gradient-to-br p-4 ring-1 ${accentClasses[item.accent]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="h-3 w-3 rounded-full bg-current opacity-70" />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
