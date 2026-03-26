"use client";

import { useEffect, useRef, useState } from "react";

import { createExperiment, sendExperimentCommand } from "@/lib/api";
import type { Experiment } from "@/types/experiment";

type LabExperimentState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { experiment: Experiment; status: "ready" };

type UseLabExperimentOptions = {
  defaultErrorMessage: string;
  defaultStatusMessage: string;
};

export function useLabExperiment({
  defaultErrorMessage,
  defaultStatusMessage,
}: UseLabExperimentOptions) {
  const [state, setState] = useState<LabExperimentState>({ status: "loading" });
  const [statusMessage, setStatusMessage] = useState(defaultStatusMessage);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const hasLoadedInitialExperiment = useRef(false);

  const getLatestStatusMessage = (experiment: Experiment) => {
    return experiment.audit_log.at(-1) ?? defaultStatusMessage;
  };

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

  const sendWorkbenchCommand = async (
    type: string,
    payload: Record<string, unknown>,
    options?: { onSuccess?: (updatedExperiment: Experiment) => void },
  ) => {
    if (state.status !== "ready" || isCommandPending) {
      return;
    }

    setIsCommandPending(true);

    try {
      let updatedExperiment: Experiment;

      try {
        updatedExperiment = await sendExperimentCommand(state.experiment.id, type, payload);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "Experiment not found") {
          throw error;
        }

        const recreatedExperiment = await createExperiment();
        updatedExperiment = await sendExperimentCommand(recreatedExperiment.id, type, payload);
      }

      setState({ status: "ready", experiment: updatedExperiment });
      setStatusMessage(getLatestStatusMessage(updatedExperiment));
      options?.onSuccess?.(updatedExperiment);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Workbench command failed");
    } finally {
      setIsCommandPending(false);
    }
  };

  return {
    isCommandPending,
    loadExperiment,
    sendWorkbenchCommand,
    state,
    statusMessage,
  };
}
