import type { BenchToolInstance, ToolbarAccent } from "@/types/workbench";

type BenchToolCardProps = {
  tool: BenchToolInstance;
};

const liquidToneClasses: Record<ToolbarAccent, string> = {
  amber: "from-amber-500 to-amber-200",
  emerald: "from-emerald-500 to-emerald-200",
  rose: "from-rose-500 to-rose-200",
  sky: "from-sky-500 to-sky-200",
};

export function BenchToolCard({ tool }: BenchToolCardProps) {
  const currentVolume = tool.liquids.reduce((total, liquid) => total + liquid.volume_ml, 0);
  const fillRatio = Math.min(currentVolume / tool.capacity_ml, 1);
  const fillAccent = tool.liquids.at(-1)?.accent ?? tool.accent;

  return (
    <article className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {tool.toolType.replace("_", " ")}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{tool.label}</h3>
          <p className="mt-1 text-sm text-slate-600">{tool.subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
          {currentVolume} / {tool.capacity_ml} mL
        </span>
      </div>

      <div className="mt-4 rounded-[1.6rem] bg-slate-100 p-3">
        <div className="flex h-32 items-end justify-center rounded-[1.4rem] border border-dashed border-slate-300 bg-white">
          <div
            className={`w-20 rounded-b-[1rem] bg-gradient-to-t transition-all ${liquidToneClasses[fillAccent]}`}
            style={{ height: `${Math.max(fillRatio * 100, 8)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tool.liquids.length > 0 ? (
          tool.liquids.map((liquid) => (
            <span
              key={liquid.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {liquid.name} {liquid.volume_ml} mL
            </span>
          ))
        ) : (
          <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500">
            Drop liquid here
          </span>
        )}
      </div>
    </article>
  );
}
