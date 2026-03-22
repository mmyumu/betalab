import type { Experiment } from "@/types/experiment";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function createExperiment(scenarioId = "lcmsms_single_analyte"): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}/experiments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scenario_id: scenarioId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create experiment");
  }

  return (await response.json()) as Experiment;
}

export async function getExperiment(experimentId: string): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch experiment");
  }

  return (await response.json()) as Experiment;
}

export async function sendExperimentCommand(
  experimentId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, payload }),
  });

  if (!response.ok) {
    throw new Error("Failed to send experiment command");
  }

  return (await response.json()) as Experiment;
}
