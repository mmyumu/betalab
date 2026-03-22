"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { FloatingWidget } from "@/components/floating-widget";
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
const widgetIds = ["toolbar", "workbench"] as const;

type WidgetId = (typeof widgetIds)[number];

type WidgetLayout = {
  fallbackHeight: number;
  width: number;
  x: number;
  y: number;
};

const initialWidgetLayout: Record<WidgetId, WidgetLayout> = {
  toolbar: { x: 0, y: 0, width: 202, fallbackHeight: 720 },
  workbench: { x: 234, y: 0, width: 1228, fallbackHeight: 860 },
};

function getLatestStatusMessage(experiment: Experiment) {
  return experiment.audit_log.at(-1) ?? defaultStatusMessage;
}

function isWidgetId(value: string): value is WidgetId {
  return widgetIds.includes(value as WidgetId);
}

export function PesticideWorkbench() {
  const [state, setState] = useState<WorkbenchState>({ status: "loading" });
  const [statusMessage, setStatusMessage] = useState(defaultStatusMessage);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState<WidgetId | null>(null);
  const [widgetLayout, setWidgetLayout] =
    useState<Record<WidgetId, WidgetLayout>>(initialWidgetLayout);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([...widgetIds]);
  const [widgetHeights, setWidgetHeights] = useState<Record<WidgetId, number>>({
    toolbar: initialWidgetLayout.toolbar.fallbackHeight,
    workbench: initialWidgetLayout.workbench.fallbackHeight,
  });
  const hasLoadedInitialExperiment = useRef(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const widgetLayoutRef = useRef(widgetLayout);
  const widgetHeightsRef = useRef(widgetHeights);
  const dragStateRef = useRef<{
    pointerOffsetX: number;
    pointerOffsetY: number;
    widgetId: WidgetId;
  } | null>(null);

  useEffect(() => {
    widgetLayoutRef.current = widgetLayout;
  }, [widgetLayout]);

  useEffect(() => {
    widgetHeightsRef.current = widgetHeights;
  }, [widgetHeights]);

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

  const handleWidgetHeightChange = (widgetId: string, height: number) => {
    if (!isWidgetId(widgetId)) {
      return;
    }
    if (height <= 0) {
      return;
    }

    setWidgetHeights((current) => {
      if (current[widgetId] === height) {
        return current;
      }

      return {
        ...current,
        [widgetId]: height,
      };
    });
  };

  const handleWidgetDragStart = (
    widgetId: string,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!isWidgetId(widgetId)) {
      return;
    }
    if (typeof event.button === "number" && event.button > 0) {
      return;
    }

    event.preventDefault();

    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const workspaceLeft = workspaceRect?.left ?? 0;
    const workspaceTop = workspaceRect?.top ?? 0;
    const currentPosition = widgetLayoutRef.current[widgetId];

    dragStateRef.current = {
      widgetId,
      pointerOffsetX: event.clientX - workspaceLeft - currentPosition.x,
      pointerOffsetY: event.clientY - workspaceTop - currentPosition.y,
    };
    setActiveWidgetId(widgetId);
    setWidgetOrder((current) => [...current.filter((id) => id !== widgetId), widgetId]);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dragState = dragStateRef.current;
      const workspaceNode = workspaceRef.current;
      if (!dragState || !workspaceNode) {
        return;
      }
      if (!Number.isFinite(moveEvent.clientX) || !Number.isFinite(moveEvent.clientY)) {
        return;
      }

      const nextWorkspaceRect = workspaceNode.getBoundingClientRect();
      const nextLayout = widgetLayoutRef.current[dragState.widgetId];
      const widgetHeight =
        widgetHeightsRef.current[dragState.widgetId] ?? nextLayout.fallbackHeight;

      const unclampedX = moveEvent.clientX - nextWorkspaceRect.left - dragState.pointerOffsetX;
      const unclampedY = moveEvent.clientY - nextWorkspaceRect.top - dragState.pointerOffsetY;

      const maxX =
        nextWorkspaceRect.width > 0
          ? Math.max(nextWorkspaceRect.width - nextLayout.width, 0)
          : Number.POSITIVE_INFINITY;
      const maxY =
        nextWorkspaceRect.height > 0
          ? Math.max(nextWorkspaceRect.height - widgetHeight, 0)
          : Number.POSITIVE_INFINITY;

      setWidgetLayout((current) => ({
        ...current,
        [dragState.widgetId]: {
          ...current[dragState.widgetId],
          x: Math.min(Math.max(unclampedX, 0), maxX),
          y: Math.min(Math.max(unclampedY, 0), maxY),
        },
      }));
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      setActiveWidgetId(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
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
  const workspaceHeight = Math.max(
    ...widgetIds.map((widgetId) => {
      const layout = widgetLayout[widgetId];
      const measuredHeight = widgetHeights[widgetId] ?? layout.fallbackHeight;
      return layout.y + measuredHeight + 48;
    }),
    1100,
  );

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

        <section className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,0.55))] p-4 shadow-[0_28px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-6">
          <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/70 bg-white/65 px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Custom layout
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Drag the widget handles to compose your own workspace.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              3 widgets live
            </div>
          </div>

          <div
            className="relative mt-4 overflow-hidden rounded-[2rem] border border-dashed border-slate-300/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),rgba(248,250,252,0.7)_40%,rgba(226,232,240,0.55)_100%)]"
            data-testid="widget-workspace"
            ref={workspaceRef}
            style={{ minHeight: workspaceHeight }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_26%)]" />

            <FloatingWidget
              id="toolbar"
              isActive={activeWidgetId === "toolbar"}
              label="Toolbar Widget"
              onDragStart={handleWidgetDragStart}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.toolbar}
              zIndex={10 + widgetOrder.indexOf("toolbar")}
            >
              <ToolbarPanel categories={pesticideWorkflowCategories} />
            </FloatingWidget>

            <FloatingWidget
              id="workbench"
              isActive={activeWidgetId === "workbench"}
              label="Workbench Widget"
              onDragStart={handleWidgetDragStart}
              onHeightChange={handleWidgetHeightChange}
              position={widgetLayout.workbench}
              zIndex={10 + widgetOrder.indexOf("workbench")}
            >
              <PesticideWorkbenchPanel
                onLiquidVolumeChange={handleLiquidVolumeChange}
                slots={slots}
                statusMessage={isCommandPending ? `${statusMessage} Syncing...` : statusMessage}
                onToolbarItemDrop={handleToolbarItemDrop}
              />
            </FloatingWidget>
          </div>
        </section>
      </div>
    </main>
  );
}
