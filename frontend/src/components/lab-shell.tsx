import { RackPanel } from "@/components/rack-panel";
import { ResultsPanel } from "@/components/results-panel";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { WorkbenchPanel } from "@/components/workbench-panel";
import { toolbarCategories } from "@/lib/toolbar-catalog";
import type { Experiment } from "@/types/experiment";

type LabShellProps = {
  experiment: Experiment;
};

export function LabShell({ experiment }: LabShellProps) {
  const flasks = Object.values(experiment.containers).filter((container) => container.kind === "flask");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">LC-MS/MS workbench</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Prepare standards and sample flasks, route vials into the autosampler rack, then
                inspect the two simulated transitions of a single-analyte method.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
              Experiment {experiment.id} | {experiment.status}
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,0.9fr)]">
          <ToolbarPanel categories={toolbarCategories} />

          <section className="space-y-6">
            <WorkbenchPanel flasks={flasks} />
            <RackPanel rack={experiment.rack} />
          </section>

          <div className="xl:col-span-2 2xl:col-span-1">
            <ResultsPanel run={experiment.runs[0]} />
          </div>
        </div>
      </div>
    </main>
  );
}
