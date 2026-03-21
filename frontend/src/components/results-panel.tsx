"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Run } from "@/types/experiment";

type ResultsPanelProps = {
  run: Run | undefined;
};

export function ResultsPanel({ run }: ResultsPanelProps) {
  const result = run?.result;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Results</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-950">Transition preview</h2>

      {!result ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
          Aucun run simule pour le moment.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Sample type</p>
              <p className="mt-1 font-semibold">{run?.sample_type}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">RT observe</p>
              <p className="mt-1 font-semibold">{result.observed_retention_time} min</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimate</p>
              <p className="mt-1 font-semibold">{result.estimated_concentration_ng_ml} ng/mL</p>
            </div>
          </div>

          {result.transition_results.map((transition) => (
            <div key={transition.transition_id} className="rounded-3xl bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{transition.transition_id}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Area {transition.area} | Height {transition.height}
                  </p>
                </div>
              </div>
              <div className="h-52 rounded-2xl bg-white p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transition.chromatogram_points}>
                    <XAxis dataKey="time_min" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="intensity"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
