import { LabAssetIcon } from "@/components/icons/lab-asset-icon";
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
        <div className="flex items-start gap-4">
          <LabAssetIcon
            accent={fillAccent}
            className="h-28 w-20 shrink-0"
            fillRatio={fillRatio}
            kind={tool.toolType}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {tool.toolType.replace("_", " ")}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{tool.label}</h3>
            <p className="mt-1 text-sm text-slate-600">{tool.subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
          {currentVolume} / {tool.capacity_ml} mL
        </span>
      </div>

      <div className="mt-4 rounded-[1.6rem] bg-slate-100 p-3">
        <div className="flex h-28 items-center justify-center rounded-[1.4rem] border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),rgba(241,245,249,0.85))]">
          <div
            className={`h-20 w-full max-w-[14rem] rounded-[1.2rem] bg-gradient-to-r p-[1px] ${liquidToneClasses[fillAccent]}`}
          >
            <div className="flex h-full items-center justify-between rounded-[1.1rem] bg-white/90 px-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current fill
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {Math.round(fillRatio * 100)}%
                </p>
              </div>
              <LabAssetIcon
                accent={fillAccent}
                className="h-16 w-12"
                fillRatio={fillRatio}
                kind={tool.toolType}
              />
            </div>
          </div>
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
