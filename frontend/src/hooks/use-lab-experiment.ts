"use client";

import { useEffect, useRef, useState } from "react";

import {
  addLiquidToWorkbenchTool,
  addLiquidToWorkspaceWidget,
  addProduceLotToWorkbenchTool,
  addWorkbenchSlot,
  addWorkspaceProduceLotToWidget,
  addWorkspaceWidget,
  applySampleLabelToWorkbenchTool,
  completeGrinderCycle,
  createExperiment,
  createDebugProduceLotOnWorkbench,
  createDebugProduceLotToWidget,
  createProduceLot,
  cutWorkbenchProduceLot,
  discardProduceLotFromWorkbenchTool,
  discardRackTool,
  discardSampleLabelFromPalette,
  discardSampleLabelFromWorkbenchTool,
  discardToolFromPalette,
  discardWidgetProduceLot,
  discardWorkbenchTool,
  discardWorkspaceProduceLot,
  discardWorkspaceWidget,
  moveProduceLotBetweenWorkbenchTools,
  moveRackToolBetweenSlots,
  moveSampleLabelBetweenWorkbenchTools,
  moveToolBetweenWorkbenchSlots,
  moveWidgetProduceLotToWorkbenchTool,
  moveWorkbenchProduceLotToWidget,
  moveWorkspaceWidget,
  placeToolInRackSlot,
  placeToolOnWorkbench,
  placeWorkbenchToolInRackSlot,
  removeLiquidFromWorkbenchTool,
  removeLiquidFromWorkspaceWidget,
  removeRackToolToWorkbenchSlot,
  removeWorkbenchSlot,
  restoreTrashedProduceLotToWorkbenchTool,
  restoreTrashedProduceLotToWidget,
  restoreTrashedSampleLabelToWorkbenchTool,
  restoreTrashedToolToRackSlot,
  restoreTrashedToolToWorkbenchSlot,
  subscribeToExperimentStream,
  startGrinderCycle,
  updateWorkbenchToolSampleLabelText,
} from "@/lib/api";
import type { Experiment } from "@/types/experiment";

type LabExperimentState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { experiment: Experiment; status: "ready" };

type UseLabExperimentOptions = {
  defaultErrorMessage: string;
  defaultStatusMessage: string;
};

type MutationFn = (experimentId: string, payload?: Record<string, unknown>) => Promise<Experiment>;

const mutationFns = {
  addLiquidToWorkbenchTool,
  addLiquidToWorkspaceWidget,
  addProduceLotToWorkbenchTool,
  addWorkbenchSlot,
  addWorkspaceProduceLotToWidget,
  addWorkspaceWidget,
  applySampleLabelToWorkbenchTool,
  completeGrinderCycle,
  createProduceLot,
  createDebugProduceLotOnWorkbench,
  createDebugProduceLotToWidget,
  cutWorkbenchProduceLot,
  discardProduceLotFromWorkbenchTool,
  discardRackTool,
  discardSampleLabelFromPalette,
  discardSampleLabelFromWorkbenchTool,
  discardToolFromPalette,
  discardWidgetProduceLot,
  discardWorkbenchTool,
  discardWorkspaceProduceLot,
  discardWorkspaceWidget,
  moveProduceLotBetweenWorkbenchTools,
  moveRackToolBetweenSlots,
  moveSampleLabelBetweenWorkbenchTools,
  moveToolBetweenWorkbenchSlots,
  moveWidgetProduceLotToWorkbenchTool,
  moveWorkbenchProduceLotToWidget,
  moveWorkspaceWidget,
  placeToolInRackSlot,
  placeToolOnWorkbench,
  placeWorkbenchToolInRackSlot,
  removeLiquidFromWorkbenchTool,
  removeLiquidFromWorkspaceWidget,
  removeRackToolToWorkbenchSlot,
  removeWorkbenchSlot,
  restoreTrashedProduceLotToWorkbenchTool,
  restoreTrashedProduceLotToWidget,
  restoreTrashedSampleLabelToWorkbenchTool,
  restoreTrashedToolToRackSlot,
  restoreTrashedToolToWorkbenchSlot,
  startGrinderCycle,
  updateWorkbenchToolSampleLabelText,
} satisfies Record<string, MutationFn>;

export function useLabExperiment({
  defaultErrorMessage,
  defaultStatusMessage,
}: UseLabExperimentOptions) {
  const [state, setState] = useState<LabExperimentState>({ status: "loading" });
  const [statusMessage, setStatusMessage] = useState(defaultStatusMessage);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const hasLoadedInitialExperiment = useRef(false);
  const latestSnapshotVersionRef = useRef(0);

  const getLatestStatusMessage = (experiment: Experiment) => {
    return experiment.audit_log.at(-1) ?? defaultStatusMessage;
  };

  const applyExperimentSnapshot = (experiment: Experiment) => {
    if (experiment.snapshot_version < latestSnapshotVersionRef.current) {
      return;
    }

    latestSnapshotVersionRef.current = experiment.snapshot_version;
    setState({ status: "ready", experiment });
    setStatusMessage(getLatestStatusMessage(experiment));
  };

  const loadExperiment = async () => {
    setState({ status: "loading" });

    try {
      const experiment = await createExperiment();
      applyExperimentSnapshot(experiment);
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

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const experimentId = state.experiment.id;

    return subscribeToExperimentStream(experimentId, {
      onError: (error) => {
        setStatusMessage(error.message);
      },
      onMessage: (experiment) => {
        applyExperimentSnapshot(experiment);
      },
    });
  }, [state.status, state.status === "ready" ? state.experiment.id : null]);

  const executeMutation = async (
    mutation: MutationFn,
    payload?: Record<string, unknown>,
    options?: { onSuccess?: (updatedExperiment: Experiment) => void },
  ) => {
    if (state.status !== "ready" || isCommandPending) {
      return;
    }

    setIsCommandPending(true);

    try {
      let updatedExperiment: Experiment;

      try {
        updatedExperiment = await mutation(state.experiment.id, payload);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "Experiment not found") {
          throw error;
        }

        const recreatedExperiment = await createExperiment();
        updatedExperiment = await mutation(recreatedExperiment.id, payload);
      }

      applyExperimentSnapshot(updatedExperiment);
      options?.onSuccess?.(updatedExperiment);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Experiment mutation failed");
    } finally {
      setIsCommandPending(false);
    }
  };

  return {
    isCommandPending,
    loadExperiment,
    state,
    statusMessage,
    addLiquidToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.addLiquidToWorkbenchTool, payload),
    addLiquidToWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.addLiquidToWorkspaceWidget, payload),
    addProduceLotToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.addProduceLotToWorkbenchTool, payload),
    addWorkbenchSlot: () => executeMutation(mutationFns.addWorkbenchSlot),
    addWorkspaceProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.addWorkspaceProduceLotToWidget, payload),
    addWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.addWorkspaceWidget, payload),
    applySampleLabelToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.applySampleLabelToWorkbenchTool, payload),
    completeGrinderCycle: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.completeGrinderCycle, payload),
    startGrinderCycle: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.startGrinderCycle, payload),
    createProduceLot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.createProduceLot, payload),
    createDebugProduceLotOnWorkbench: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.createDebugProduceLotOnWorkbench, payload),
    createDebugProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.createDebugProduceLotToWidget, payload),
    cutWorkbenchProduceLot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.cutWorkbenchProduceLot, payload),
    discardProduceLotFromWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardProduceLotFromWorkbenchTool, payload),
    discardRackTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardRackTool, payload),
    discardSampleLabelFromPalette: (payload?: Record<string, unknown>) =>
      executeMutation(mutationFns.discardSampleLabelFromPalette, payload),
    discardSampleLabelFromWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardSampleLabelFromWorkbenchTool, payload),
    discardToolFromPalette: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardToolFromPalette, payload),
    discardWidgetProduceLot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardWidgetProduceLot, payload),
    discardWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardWorkbenchTool, payload),
    discardWorkspaceProduceLot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardWorkspaceProduceLot, payload),
    discardWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardWorkspaceWidget, payload),
    moveProduceLotBetweenWorkbenchTools: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveProduceLotBetweenWorkbenchTools, payload),
    moveRackToolBetweenSlots: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveRackToolBetweenSlots, payload),
    moveSampleLabelBetweenWorkbenchTools: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveSampleLabelBetweenWorkbenchTools, payload),
    moveToolBetweenWorkbenchSlots: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveToolBetweenWorkbenchSlots, payload),
    moveWidgetProduceLotToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWidgetProduceLotToWorkbenchTool, payload),
    moveWorkbenchProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkbenchProduceLotToWidget, payload),
    moveWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkspaceWidget, payload),
    placeToolInRackSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeToolInRackSlot, payload),
    placeToolOnWorkbench: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeToolOnWorkbench, payload),
    placeWorkbenchToolInRackSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeWorkbenchToolInRackSlot, payload),
    removeLiquidFromWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeLiquidFromWorkbenchTool, payload),
    removeLiquidFromWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeLiquidFromWorkspaceWidget, payload),
    removeRackToolToWorkbenchSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeRackToolToWorkbenchSlot, payload),
    removeWorkbenchSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeWorkbenchSlot, payload),
    restoreTrashedProduceLotToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedProduceLotToWorkbenchTool, payload),
    restoreTrashedProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedProduceLotToWidget, payload),
    restoreTrashedSampleLabelToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedSampleLabelToWorkbenchTool, payload),
    restoreTrashedToolToRackSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedToolToRackSlot, payload),
    restoreTrashedToolToWorkbenchSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedToolToWorkbenchSlot, payload),
    updateWorkbenchToolSampleLabelText: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.updateWorkbenchToolSampleLabelText, payload),
  };
}
