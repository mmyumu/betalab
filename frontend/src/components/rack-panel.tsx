import type { Rack } from "@/types/experiment";

type RackPanelProps = {
  rack: Rack;
};

export function RackPanel({ rack }: RackPanelProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Autosampler
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Rack sequence</h2>
        </div>
        <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
          Run sequence
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {Object.entries(rack.positions).map(([position, vialId]) => (
          <div
            key={position}
            className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {position}
            </p>
            <div className="mt-3 flex h-20 items-center justify-center rounded-2xl bg-white">
              <span className="text-sm font-medium text-slate-700">{vialId ?? "Empty"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
