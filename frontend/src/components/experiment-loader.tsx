"use client";

import { useEffect, useRef, useState } from "react";

import { LabShell } from "@/components/lab-shell";
import { createExperiment, getExperiment } from "@/lib/api";
import type { Experiment } from "@/types/experiment";

type ExperimentLoaderState =
  | { status: "loading" }
  | { status: "ready"; experiment: Experiment }
  | { status: "error"; message: string };

const defaultErrorMessage = "Unable to load experiment";

export function ExperimentLoader() {
  const [state, setState] = useState<ExperimentLoaderState>({ status: "loading" });
  const hasLoadedInitialExperiment = useRef(false);

  const loadExperiment = async () => {
    setState({ status: "loading" });

    try {
      const createdExperiment = await createExperiment();
      const experiment = await getExperiment(createdExperiment.id);

      setState({ status: "ready", experiment });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : defaultErrorMessage,
      });
    }
  };

  useEffect(() => {
    if (hasLoadedInitialExperiment.current) {
      return;
    }

    hasLoadedInitialExperiment.current = true;
    void loadExperiment();
  }, []);

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">LC-MS/MS workbench</h1>
          <p className="mt-4 text-sm text-slate-600">Creating experiment from backend...</p>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-rose-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
            Backend connection error
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">LC-MS/MS workbench</h1>
          <p className="mt-4 text-sm text-slate-600">{state.message}</p>
          <button
            className="mt-6 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              void loadExperiment();
            }}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return <LabShell experiment={state.experiment} />;
}
