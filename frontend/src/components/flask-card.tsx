import type { Container } from "@/types/experiment";

type FlaskCardProps = {
  container: Container;
};

export function FlaskCard({ container }: FlaskCardProps) {
  const fillRatio = Math.min(container.current_volume_ml / container.capacity_ml, 1);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {container.kind.replace("_", " ")}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{container.label}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {container.current_volume_ml} / {container.capacity_ml} mL
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-100 p-3">
        <div className="flex h-32 items-end justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
          <div
            className="w-16 rounded-b-2xl bg-gradient-to-t from-cyan-500 to-sky-200 transition-all"
            style={{ height: `${Math.max(fillRatio * 100, 8)}%` }}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Conc.</dt>
          <dd className="mt-1 font-semibold">{container.analyte_concentration_ng_ml} ng/mL</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Matrix</dt>
          <dd className="mt-1 font-semibold">{container.matrix_effect_factor}</dd>
        </div>
      </dl>
    </article>
  );
}
