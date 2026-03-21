import { FlaskCard } from "@/components/flask-card";
import type { Container } from "@/types/experiment";

type WorkbenchPanelProps = {
  flasks: Container[];
};

const laneTemplates = [
  {
    title: "Calibration lane",
    note: "Prepare traceable standards and lock in the target concentration.",
    accent: "from-sky-500/20 via-cyan-100 to-white",
  },
  {
    title: "Dilution lane",
    note: "Stage the next dilution or transfer without breaking the prep flow.",
    accent: "from-amber-500/20 via-orange-100 to-white",
  },
  {
    title: "Sample lane",
    note: "Keep the matrix sample visible before vial transfer to the rack.",
    accent: "from-emerald-500/20 via-emerald-100 to-white",
  },
];

export function WorkbenchPanel({ flasks }: WorkbenchPanelProps) {
  const laneCount = Math.max(flasks.length, 3);
  const lanes = Array.from({ length: laneCount }, (_, index) => ({
    ...laneTemplates[index % laneTemplates.length],
    container: flasks[index],
    key: `${laneTemplates[index % laneTemplates.length].title}-${index}`,
  }));

  return (
    <section className="overflow-hidden rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff4dc_100%)] shadow-sm">
      <div className="border-b border-amber-200/80 bg-white/70 px-5 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Workbench
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Preparation bench</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              A physical prep surface for standards, sample dilutions, and the next transfer into
              autosampler vials.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Standards staged</p>
              <p className="mt-1 text-lg font-semibold">{flasks.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Bench lanes</p>
              <p className="mt-1 text-lg font-semibold">{laneCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative p-5">
        <div className="absolute inset-x-5 bottom-5 top-16 rounded-[2rem] bg-[linear-gradient(180deg,rgba(120,53,15,0)_0%,rgba(146,64,14,0.08)_30%,rgba(120,53,15,0.16)_100%)]" />
        <div className="absolute inset-x-8 bottom-7 h-4 rounded-full bg-amber-900/10 blur-md" />

        <div className="relative grid gap-4 xl:grid-cols-3">
          {lanes.map((lane) => (
            <article
              key={lane.key}
              className={`rounded-[1.8rem] border border-white/70 bg-gradient-to-br p-4 shadow-[0_18px_40px_rgba(148,95,33,0.08)] ${lane.accent}`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{lane.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{lane.note}</p>
                </div>
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-white/80">
                  Zone
                </span>
              </div>

              {lane.container ? (
                <FlaskCard container={lane.container} />
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-900">Reserve slot</p>
                  <p className="mt-2 text-sm text-slate-600">Ready for the next prep</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
