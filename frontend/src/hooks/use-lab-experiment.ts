"use client";

import { useEffect, useRef, useState } from "react";

import {
  addLiquidToWorkbenchTool,
  addLiquidToWorkspaceWidget,
  addProduceLotToWorkbenchTool,
  addWorkbenchSlot,
  addWorkspaceProduceLotToWidget,
  addWorkspaceWidget,
  applyPrintedLimsLabelToGrossBalanceBag,
  applyPrintedLimsLabel,
  applyPrintedLimsLabelToBasketBag,
  applySampleLabelToWorkbenchTool,
  closeGrossBalanceTool,
  closeWorkbenchTool,
  completeGrinderCycle,
  createLimsReception,
  createExperiment,
  getExperiment,
  createDebugProduceLotOnWorkbench,
  createDebugProduceLotToWidget,
  createProduceLot,
  cutWorkbenchProduceLot,
  discardBasketTool,
  discardGrossBalanceProduceLot,
  discardGrossBalanceTool,
  discardProduceLotFromWorkbenchTool,
  discardPrintedLimsLabel,
  discardRackTool,
  discardSampleLabelFromPalette,
  discardSampleLabelFromWorkbenchTool,
  discardToolFromPalette,
  discardWidgetProduceLot,
  discardWorkbenchTool,
  discardWorkspaceProduceLot,
  discardWorkspaceWidget,
  moveBasketToolToGrossBalance,
  placeToolOnGrossBalance,
  moveGrossBalanceProduceLotToWidget,
  moveGrossBalanceProduceLotToWorkbench,
  moveGrossBalanceToolToRack,
  moveGrossBalanceToolToWorkbench,
  moveProduceLotBetweenWorkbenchTools,
  moveRackToolBetweenSlots,
  moveRackToolToGrossBalance,
  moveWorkbenchProduceLotToGrossBalance,
  moveWorkbenchToolToGrossBalance,
  moveWidgetProduceLotToGrossBalance,
  moveWorkspaceProduceLotToGrossBalance,
  openGrossBalanceTool,
  moveSampleLabelBetweenWorkbenchTools,
  moveToolBetweenWorkbenchSlots,
  moveWidgetProduceLotToWorkbenchTool,
  moveWorkbenchProduceLotToWidget,
  moveWorkspaceWidget,
  loadSpatulaFromWorkbenchTool,
  openWorkbenchTool,
  placeToolInRackSlot,
  placeReceivedBagOnWorkbench,
  placeToolOnWorkbench,
  placeWorkbenchToolInRackSlot,
  printLimsLabel,
  pourSpatulaIntoWorkbenchTool,
  recordGrossWeight,
  setGrossBalanceContainerOffset,
  removeLiquidFromWorkbenchTool,
  removeLiquidFromWorkspaceWidget,
  removeRackToolToWorkbenchSlot,
  removeWorkbenchSlot,
  restoreTrashedProduceLotToWorkbenchTool,
  restoreTrashedProduceLotToGrossBalance,
  restoreTrashedProduceLotToWidget,
  restoreTrashedSampleLabelToWorkbenchTool,
  restoreTrashedToolToGrossBalance,
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
  experimentId?: string;
};

type MutationFn = (experimentId: string, payload?: Record<string, unknown>) => Promise<Experiment>;

const mutationFns = {
  addLiquidToWorkbenchTool,
  addLiquidToWorkspaceWidget,
  addProduceLotToWorkbenchTool,
  addWorkbenchSlot,
  addWorkspaceProduceLotToWidget,
  addWorkspaceWidget,
  applyPrintedLimsLabelToGrossBalanceBag,
  applyPrintedLimsLabel,
  applyPrintedLimsLabelToBasketBag,
  applySampleLabelToWorkbenchTool,
  closeGrossBalanceTool,
  closeWorkbenchTool,
  completeGrinderCycle,
  createLimsReception,
  createProduceLot,
  createDebugProduceLotOnWorkbench,
  createDebugProduceLotToWidget,
  cutWorkbenchProduceLot,
  discardBasketTool,
  discardGrossBalanceProduceLot,
  discardGrossBalanceTool,
  discardProduceLotFromWorkbenchTool,
  discardPrintedLimsLabel,
  discardRackTool,
  discardSampleLabelFromPalette,
  discardSampleLabelFromWorkbenchTool,
  discardToolFromPalette,
  discardWidgetProduceLot,
  discardWorkbenchTool,
  discardWorkspaceProduceLot,
  discardWorkspaceWidget,
  moveBasketToolToGrossBalance,
  placeToolOnGrossBalance,
  moveGrossBalanceProduceLotToWidget,
  moveGrossBalanceProduceLotToWorkbench,
  moveGrossBalanceToolToRack,
  moveGrossBalanceToolToWorkbench,
  moveProduceLotBetweenWorkbenchTools,
  moveRackToolBetweenSlots,
  moveRackToolToGrossBalance,
  moveWorkbenchProduceLotToGrossBalance,
  moveWorkbenchToolToGrossBalance,
  moveWidgetProduceLotToGrossBalance,
  moveWorkspaceProduceLotToGrossBalance,
  openGrossBalanceTool,
  moveSampleLabelBetweenWorkbenchTools,
  moveToolBetweenWorkbenchSlots,
  moveWidgetProduceLotToWorkbenchTool,
  moveWorkbenchProduceLotToWidget,
  moveWorkspaceWidget,
  loadSpatulaFromWorkbenchTool,
  openWorkbenchTool,
  placeToolInRackSlot,
  placeReceivedBagOnWorkbench,
  placeToolOnWorkbench,
  placeWorkbenchToolInRackSlot,
  printLimsLabel,
  pourSpatulaIntoWorkbenchTool,
  recordGrossWeight,
  setGrossBalanceContainerOffset,
  removeLiquidFromWorkbenchTool,
  removeLiquidFromWorkspaceWidget,
  removeRackToolToWorkbenchSlot,
  removeWorkbenchSlot,
  restoreTrashedProduceLotToWorkbenchTool,
  restoreTrashedProduceLotToGrossBalance,
  restoreTrashedProduceLotToWidget,
  restoreTrashedSampleLabelToWorkbenchTool,
  restoreTrashedToolToGrossBalance,
  restoreTrashedToolToRackSlot,
  restoreTrashedToolToWorkbenchSlot,
  startGrinderCycle,
  updateWorkbenchToolSampleLabelText,
} satisfies Record<string, MutationFn>;

export function useLabExperiment({
  defaultErrorMessage,
  defaultStatusMessage,
  experimentId,
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
      const experiment = experimentId
        ? await getExperiment(experimentId)
        : await createExperiment();
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

        if (experimentId) {
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
    applyPrintedLimsLabel: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.applyPrintedLimsLabel, payload),
    applyPrintedLimsLabelToGrossBalanceBag: () =>
      executeMutation(mutationFns.applyPrintedLimsLabelToGrossBalanceBag),
    applyPrintedLimsLabelToBasketBag: () =>
      executeMutation(mutationFns.applyPrintedLimsLabelToBasketBag),
    applySampleLabelToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.applySampleLabelToWorkbenchTool, payload),
    closeGrossBalanceTool: () =>
      executeMutation(mutationFns.closeGrossBalanceTool),
    closeWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.closeWorkbenchTool, payload),
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
    createLimsReception: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.createLimsReception, payload),
    cutWorkbenchProduceLot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.cutWorkbenchProduceLot, payload),
    discardBasketTool: () =>
      executeMutation(mutationFns.discardBasketTool),
    discardGrossBalanceProduceLot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardGrossBalanceProduceLot, payload),
    discardGrossBalanceTool: () =>
      executeMutation(mutationFns.discardGrossBalanceTool),
    discardProduceLotFromWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.discardProduceLotFromWorkbenchTool, payload),
    discardPrintedLimsLabel: () =>
      executeMutation(mutationFns.discardPrintedLimsLabel),
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
    moveBasketToolToGrossBalance: () =>
      executeMutation(mutationFns.moveBasketToolToGrossBalance),
    placeToolOnGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeToolOnGrossBalance, payload),
    moveGrossBalanceProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveGrossBalanceProduceLotToWidget, payload),
    moveGrossBalanceProduceLotToWorkbench: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveGrossBalanceProduceLotToWorkbench, payload),
    moveGrossBalanceToolToRack: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveGrossBalanceToolToRack, payload),
    moveGrossBalanceToolToWorkbench: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveGrossBalanceToolToWorkbench, payload),
    moveProduceLotBetweenWorkbenchTools: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveProduceLotBetweenWorkbenchTools, payload),
    moveRackToolBetweenSlots: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveRackToolBetweenSlots, payload),
    moveRackToolToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveRackToolToGrossBalance, payload),
    moveSampleLabelBetweenWorkbenchTools: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveSampleLabelBetweenWorkbenchTools, payload),
    moveToolBetweenWorkbenchSlots: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveToolBetweenWorkbenchSlots, payload),
    moveWorkbenchProduceLotToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkbenchProduceLotToGrossBalance, payload),
    moveWorkbenchToolToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkbenchToolToGrossBalance, payload),
    moveWidgetProduceLotToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWidgetProduceLotToWorkbenchTool, payload),
    moveWidgetProduceLotToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWidgetProduceLotToGrossBalance, payload),
    moveWorkbenchProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkbenchProduceLotToWidget, payload),
    moveWorkspaceProduceLotToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkspaceProduceLotToGrossBalance, payload),
    moveWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.moveWorkspaceWidget, payload),
    loadSpatulaFromWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.loadSpatulaFromWorkbenchTool, payload),
    openGrossBalanceTool: () =>
      executeMutation(mutationFns.openGrossBalanceTool),
    openWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.openWorkbenchTool, payload),
    placeToolInRackSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeToolInRackSlot, payload),
    placeReceivedBagOnWorkbench: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeReceivedBagOnWorkbench, payload),
    placeToolOnWorkbench: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeToolOnWorkbench, payload),
    placeWorkbenchToolInRackSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.placeWorkbenchToolInRackSlot, payload),
    printLimsLabel: (payload?: Record<string, unknown>) =>
      executeMutation(mutationFns.printLimsLabel, payload),
    pourSpatulaIntoWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.pourSpatulaIntoWorkbenchTool, payload),
    recordGrossWeight: (payload?: Record<string, unknown>) =>
      executeMutation(mutationFns.recordGrossWeight, payload),
    setGrossBalanceContainerOffset: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.setGrossBalanceContainerOffset, payload),
    removeLiquidFromWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeLiquidFromWorkbenchTool, payload),
    removeLiquidFromWorkspaceWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeLiquidFromWorkspaceWidget, payload),
    removeRackToolToWorkbenchSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeRackToolToWorkbenchSlot, payload),
    removeWorkbenchSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.removeWorkbenchSlot, payload),
    restoreTrashedProduceLotToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedProduceLotToGrossBalance, payload),
    restoreTrashedProduceLotToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedProduceLotToWorkbenchTool, payload),
    restoreTrashedProduceLotToWidget: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedProduceLotToWidget, payload),
    restoreTrashedSampleLabelToWorkbenchTool: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedSampleLabelToWorkbenchTool, payload),
    restoreTrashedToolToGrossBalance: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedToolToGrossBalance, payload),
    restoreTrashedToolToRackSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedToolToRackSlot, payload),
    restoreTrashedToolToWorkbenchSlot: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.restoreTrashedToolToWorkbenchSlot, payload),
    updateWorkbenchToolSampleLabelText: (payload: Record<string, unknown>) =>
      executeMutation(mutationFns.updateWorkbenchToolSampleLabelText, payload),
  };
}
