"use client";

import { dragAffordanceClassName } from "@/lib/drag-affordance";

type ActionDefinition = {
  id: string;
  label: string;
};

type ActionBarPanelProps = {
  activeActionId: string | null;
  helperText?: string | null;
  onToggleAction: (actionId: string) => void;
  spatulaLoaded?: boolean;
};

const actions: ActionDefinition[] = [
  {
    id: "knife",
    label: "Stainless steel knife",
  },
  {
    id: "spatula",
    label: "Powder spatula",
  },
];

function KnifeIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={active ? "text-sky-700" : "text-slate-700"}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-142 12 12)">
        <rect
          fill="currentColor"
          height="4.2"
          opacity="0.9"
          rx="1.2"
          width="8.6"
          x="4.1"
          y="9.9"
        />
        <rect
          height="4.2"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.15"
          width="8.6"
          x="4.1"
          y="9.9"
        />
        <path
          d="M12.7 9.9H15.9L19.8 12L15.9 14.1H12.7V9.9Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M12.7 9.9H15.9L19.8 12L15.9 14.1H12.7V9.9Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.15"
        />
        <path d="M6 10.9V13.1" stroke={active ? "#e0f2fe" : "#f8fafc"} strokeLinecap="round" strokeWidth="0.8" />
        <path d="M8.1 10.9V13.1" stroke={active ? "#e0f2fe" : "#f8fafc"} strokeLinecap="round" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

function SpatulaIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={active ? "text-sky-700" : "text-slate-700"}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-30 12 12)">
        <path
          d="M6.5 13.2H15.4C17.4 13.2 19 11.6 19 9.6C19 8.8 18.4 8.2 17.6 8.2H6.5V13.2Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path d="M4.8 12.7H14.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M4.8 10.2H14.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M14.4 10.2C17 10.2 18.9 11.7 19.2 13.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <rect fill="currentColor" height="2.6" rx="1.1" width="8.4" x="4.1" y="12.2" />
        <path d="M8.3 8.9C9.7 7.6 11.9 7.3 13.8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

export function ActionBarPanel({
  activeActionId,
  helperText = null,
  onToggleAction,
  spatulaLoaded = false,
}: ActionBarPanelProps) {
  const spatulaActive = activeActionId === "spatula";

  return (
    <section className="rounded-[1.2rem] border border-slate-200 bg-white p-2 shadow-sm">
      <p
        className={`${dragAffordanceClassName} text-xs font-semibold uppercase tracking-[0.24em] text-slate-500`}
        data-widget-drag-handle="true"
      >
        Actions
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {actions.map((action) => {
          const isActive = action.id === activeActionId;

          return (
            <button
              aria-pressed={isActive}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                isActive
                  ? "border-sky-300 bg-sky-50 ring-2 ring-sky-200/70"
                  : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
              }`}
              key={action.id}
              onClick={() => onToggleAction(action.id)}
              title={action.label}
              type="button"
            >
              <span className="sr-only">{action.label}</span>
              {action.id === "spatula" && spatulaLoaded ? (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-white" />
              ) : null}
              <div
                className={`absolute inset-0 rounded-xl ${
                  isActive ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" : ""
                }`}
              />
              <div className="h-[2.65rem] w-[2.65rem]">
                {action.id === "knife" ? <KnifeIcon active={isActive} /> : <SpatulaIcon active={isActive} />}
              </div>
            </button>
          );
        })}
      </div>
      {spatulaActive ? (
        <div
          className={`mt-2 rounded-xl border px-2.5 py-2 ${
            spatulaLoaded
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Spatula
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              spatulaLoaded ? "text-amber-800" : "text-slate-700"
            }`}
          >
            {spatulaLoaded ? "Loaded" : "Empty"}
          </p>
        </div>
      ) : null}
      {helperText ? (
        <p className="mt-2 max-w-[11rem] text-[11px] leading-4 text-slate-500">{helperText}</p>
      ) : null}
    </section>
  );
}
