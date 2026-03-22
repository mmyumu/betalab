"use client";

import { useEffect, useRef, useState } from "react";

import { PesticideWorkbenchPanel } from "@/components/pesticide-workbench-panel";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { createExperiment, sendExperimentCommand } from "@/lib/api";
import {
  pesticideWorkflowCategories,
} from "@/lib/pesticide-workflow-catalog";
import type { Experiment } from "@/types/experiment";
import type { ToolbarDragPayload } from "@/types/workbench";

type WorkbenchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { experiment: Experiment; status: "ready" };

const defaultStatusMessage = "Start by dragging an extraction tool onto the bench.";
const defaultErrorMessage = "Unable to load pesticide workbench";

function getLatestStatusMessage(experiment: Experiment) {
  return experiment.audit_log.at(-1) ?? defaultStatusMessage;
}

export function PesticideWorkbench() {
  const [state, setState] = useState<WorkbenchState>({ status: "loading" });
  const [statusMessage, setStatusMessage] = useState(defaultStatusMessage);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const hasLoadedInitialExperiment = useRef(false);

  const loadExperiment = async () => {
    setState({ status: "loading" });

    try {
      const experiment = await createExperiment();
      setState({ status: "ready", experiment });
      setStatusMessage(getLatestStatusMessage(experiment));
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

  const sendWorkbenchCommand = async (type: string, payload: Record<string, unknown>) => {
    if (state.status !== "ready" || isCommandPending) {
      return;
    }

    setIsCommandPending(true);

    try {
      const updatedExperiment = await sendExperimentCommand(state.experiment.id, type, payload);
      setState({ status: "ready", experiment: updatedExperiment });
      setStatusMessage(getLatestStatusMessage(updatedExperiment));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Workbench command failed");
    } finally {
      setIsCommandPending(false);
    }
  };

  const handleToolbarItemDrop = (slotId: string, payload: ToolbarDragPayload) => {
    if (payload.itemType === "tool") {
      void sendWorkbenchCommand("place_tool_on_workbench", {
        slot_id: slotId,
        tool_id: payload.itemId,
      });
      return;
    }

    void sendWorkbenchCommand("add_liquid_to_workbench_tool", {
      slot_id: slotId,
      liquid_id: payload.itemId,
    });
  };

  const handleLiquidVolumeChange = (slotId: string, liquidId: string, volumeMl: number) => {
    void sendWorkbenchCommand("update_workbench_liquid_volume", {
      slot_id: slotId,
      liquid_entry_id: liquidId,
      volume_ml: volumeMl,
    });
  };

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mx-auto max-w-[1800px] rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pesticide prep workbench</h1>
          <p className="mt-4 text-sm text-slate-600">Creating pesticide workbench from backend...</p>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mx-auto max-w-[1800px] rounded-[2rem] border border-rose-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
            Backend connection error
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pesticide prep workbench</h1>
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

  const workbench = state.experiment.workbench;
  const slots = workbench.slots;
  const placedTools = slots.filter((slot) => slot.tool).length;
  const liquidTransfers = slots.reduce((total, slot) => total + (slot.tool?.liquids.length ?? 0), 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto max-w-[1800px]">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Betalab prototype
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight xl:text-[3.25rem]">
                Pesticide prep workbench
              </h1>
              <p className="mt-2 max-w-5xl text-sm text-slate-600 xl:text-base">
                Start from an empty bench, place QuEChERS prep tools, and add the first liquids of
                the pesticide extraction workflow before moving toward cleanup and LC-MS/MS.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 xl:min-w-[18rem]">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white xl:px-5 xl:py-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Placed tools</p>
                <p className="mt-1 text-lg font-semibold xl:text-2xl">{placedTools}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:px-5 xl:py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Liquid drops</p>
                <p className="mt-1 text-lg font-semibold xl:text-2xl">{liquidTransfers}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)] 2xl:grid-cols-[310px_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-6 xl:self-start">
            <ToolbarPanel categories={pesticideWorkflowCategories} />
          </div>

          <section className="space-y-6">
            <PesticideWorkbenchPanel
              onLiquidVolumeChange={handleLiquidVolumeChange}
              slots={slots}
              statusMessage={isCommandPending ? `${statusMessage} Syncing...` : statusMessage}
              onToolbarItemDrop={handleToolbarItemDrop}
            />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm xl:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Workflow anchor
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">First simulation scope</h2>
              <p className="mt-3 max-w-5xl text-sm text-slate-600 xl:text-base">
                This first slice covers only the bench setup phase: place a tube, add acetonitrile
                and sample matrix, then prepare the path toward cleanup and final injection.
              </p>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
