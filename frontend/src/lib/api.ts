import type { Experiment, ExperimentListEntry } from "@/types/experiment";
import type {
  AnalyticalBalanceState,
  BenchLabel,
  BenchLiquidPortion,
  BenchSlot,
  BenchToolInstance,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  LimsReception,
  PowderFraction,
  PrintedLabelTicket,
  RackSlot,
  SpatulaState,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
  WidgetAnchor,
} from "@/types/workbench";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const experimentCache = new Map<string, Experiment>();

type ApiRequest = {
  body?: Record<string, unknown>;
  method: "DELETE" | "PATCH" | "POST";
  path: string;
};

type MutationPayload = Record<string, unknown> | undefined;
type StreamHandlers = {
  onError?: (error: Error) => void;
  onMessage: (experiment: Experiment) => void;
};

async function buildApiError(response: Response, fallbackMessage: string): Promise<Error> {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (typeof payload.detail === "string" && payload.detail.length > 0) {
      return new Error(payload.detail);
    }
  } catch {
    // Ignore non-JSON error payloads and fall back to the default message.
  }

  return new Error(fallbackMessage);
}

async function sendMutationRequest(
  experimentId: string,
  request: ApiRequest,
): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}${request.path}`, {
    method: request.method,
    ...(request.body
      ? {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request.body),
        }
      : {}),
  });

  if (!response.ok) {
    throw await buildApiError(response, "Failed to send experiment mutation");
  }

  const experiment = normalizeExperiment((await response.json()) as Experiment);
  experimentCache.set(experimentId, experiment);
  return experiment;
}

export async function createExperiment(): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}/experiments`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await buildApiError(response, "Failed to create experiment");
  }

  const experiment = normalizeExperiment((await response.json()) as Experiment);
  experimentCache.set(experiment.id, experiment);
  return experiment;
}

export async function getExperiment(experimentId: string): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}`);

  if (!response.ok) {
    throw await buildApiError(response, "Failed to fetch experiment");
  }

  const experiment = normalizeExperiment((await response.json()) as Experiment);
  experimentCache.set(experiment.id, experiment);
  return experiment;
}

export async function listExperiments(): Promise<ExperimentListEntry[]> {
  const response = await fetch(`${API_BASE_URL}/experiments`);

  if (!response.ok) {
    throw await buildApiError(response, "Failed to fetch experiments");
  }

  const payload = (await response.json()) as ExperimentListEntry[];
  return payload.map((entry) => ({
    ...entry,
    last_simulation_at: String(entry.last_simulation_at),
    updated_at: String(entry.updated_at),
    last_audit_entry:
      entry.last_audit_entry === null || entry.last_audit_entry === undefined
        ? null
        : String(entry.last_audit_entry),
  }));
}

export async function deleteExperiment(experimentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await buildApiError(response, "Failed to delete experiment");
  }

  experimentCache.delete(experimentId);
}

export function subscribeToExperimentStream(
  experimentId: string,
  handlers: StreamHandlers,
): () => void {
  const streamUrl = new URL(`${API_BASE_URL}/experiments/${experimentId}/stream`);
  streamUrl.protocol = streamUrl.protocol === "https:" ? "wss:" : "ws:";

  let activeSocket: WebSocket | null = null;
  let reconnectTimeoutId: number | null = null;
  let isDisposed = false;

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutId !== null) {
      window.clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
  };

  const scheduleReconnect = () => {
    if (isDisposed || reconnectTimeoutId !== null) {
      return;
    }

    reconnectTimeoutId = window.setTimeout(() => {
      reconnectTimeoutId = null;
      connect();
    }, 1000);
  };

  const connect = () => {
    if (isDisposed) {
      return;
    }

    if (activeSocket && activeSocket.readyState !== WebSocket.CLOSED) {
      return;
    }

    const socket = new WebSocket(streamUrl.toString());
    activeSocket = socket;

    socket.onopen = () => {
      clearReconnectTimeout();
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Experiment;
        const experiment = normalizeExperiment(payload);
        experimentCache.set(experiment.id, experiment);
        handlers.onMessage(experiment);
      } catch {
        handlers.onError?.(new Error("Failed to parse experiment stream payload"));
      }
    };

    socket.onerror = () => {
      // Browser WebSocket errors are intentionally opaque; rely on close + reconnect.
    };

    socket.onclose = () => {
      if (activeSocket === socket) {
        activeSocket = null;
      }
      scheduleReconnect();
    };
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      clearReconnectTimeout();
      connect();
    }
  };

  const handleOnline = () => {
    clearReconnectTimeout();
    connect();
  };

  connect();
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", handleOnline);

  return () => {
    isDisposed = true;
    clearReconnectTimeout();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("online", handleOnline);
    activeSocket?.close();
  };
}

function getCachedExperiment(experimentId: string): Experiment | undefined {
  return experimentCache.get(experimentId);
}

function findWorkbenchToolId(experimentId: string, slotId: string): string {
  const toolId = getCachedExperiment(experimentId)?.workbench.slots.find((slot) => slot.id === slotId)?.tool?.id;
  if (toolId) {
    return toolId;
  }

  throw new Error("Unknown workbench tool");
}

function findWorkbenchToolIdIfPresent(experimentId: string, slotId: string): string | null {
  return getCachedExperiment(experimentId)?.workbench.slots.find((slot) => slot.id === slotId)?.tool?.id ?? null;
}

function findRackToolId(experimentId: string, rackSlotId: string): string {
  const toolId = getCachedExperiment(experimentId)?.rack.slots.find((slot) => slot.id === rackSlotId)?.tool?.id;
  if (toolId) {
    return toolId;
  }

  throw new Error("Unknown rack tool");
}

function requirePayload(payload: MutationPayload): Record<string, unknown> {
  return payload ?? {};
}

function requireString(payload: Record<string, unknown>, fieldName: string): string {
  const value = payload[fieldName];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new Error(`Missing ${fieldName}`);
}

function requireNumber(payload: Record<string, unknown>, fieldName: string): number {
  const value = payload[fieldName];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new Error(`Missing ${fieldName}`);
}

function optionalNumberBody(payload: Record<string, unknown>, fieldName: string): Record<string, number> {
  const value = payload[fieldName];
  if (value === undefined) {
    return {};
  }

  return { [fieldName]: requireNumber(payload, fieldName) };
}

export async function addWorkbenchSlot(experimentId: string, payload?: MutationPayload): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/slots`,
  });
}

export async function removeWorkbenchSlot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "DELETE",
    path: `/experiments/${experimentId}/workbench/slots/${requireString(body, "slot_id")}`,
  });
}

export async function placeToolOnWorkbench(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/slots/${requireString(body, "slot_id")}/place-tool`,
    body: { tool_id: requireString(body, "tool_id") },
  });
}

export async function moveToolBetweenWorkbenchSlots(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "source_slot_id"))}/move-to-slot`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function discardWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/discard`,
  });
}

export async function discardToolFromPalette(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/palette/tools/discard`,
    body: { tool_id: requireString(body, "tool_id") },
  });
}

export async function discardSampleLabelFromPalette(experimentId: string, payload?: MutationPayload): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/palette/sample-labels/discard`,
  });
}

export async function restoreTrashedToolToWorkbenchSlot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/trash/tools/${requireString(body, "trash_tool_id")}/restore-to-workbench`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function addWorkspaceWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets`,
    body: {
      widget_id: requireString(body, "widget_id"),
      anchor: requireString(body, "anchor"),
      offset_x: requireNumber(body, "offset_x"),
      offset_y: requireNumber(body, "offset_y"),
    },
  });
}

export async function moveWorkspaceWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/move`,
    body: {
      anchor: requireString(body, "anchor"),
      offset_x: requireNumber(body, "offset_x"),
      offset_y: requireNumber(body, "offset_y"),
    },
  });
}

export async function storeWorkspaceWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/store`,
  });
}

export async function addLiquidToWorkspaceWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/liquids`,
    body: {
      liquid_id: requireString(body, "liquid_id"),
      ...optionalNumberBody(body, "volume_ml"),
    },
  });
}

export async function removeLiquidFromWorkspaceWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "DELETE",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/liquids/${requireString(body, "liquid_entry_id")}`,
  });
}

export async function completeGrinderCycle(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/complete-grinder-cycle`,
  });
}

export async function startGrinderCycle(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/start-grinder-cycle`,
  });
}

export async function addWorkspaceProduceLotToWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/add-produce-lot`,
    body: { produce_lot_id: requireString(body, "produce_lot_id") },
  });
}

export async function moveWorkbenchProduceLotToWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/move-workbench-produce-lot`,
    body: {
      source_slot_id: requireString(body, "source_slot_id"),
      produce_lot_id: requireString(body, "produce_lot_id"),
    },
  });
}

export async function restoreTrashedProduceLotToWidget(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/trash/produce-lots/${requireString(body, "trash_produce_lot_id")}/restore-to-widget`,
    body: { widget_id: requireString(body, "widget_id") },
  });
}

export async function createProduceLot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/produce-lots`,
    body: { produce_type: requireString(body, "produce_type") },
  });
}

export async function placeReceivedBagOnWorkbench(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/reception/bag/place-on-workbench`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function discardBasketTool(experimentId: string, payload?: MutationPayload): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/reception/bag/discard`,
  });
}

export async function moveWorkbenchToolToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-workbench-tool`,
    body: { slot_id: requireString(body, "source_slot_id") },
  });
}

export async function moveWorkbenchToolToAnalyticalBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/place-workbench-tool`,
    body: { slot_id: requireString(body, "source_slot_id") },
  });
}

export async function moveBasketToolToGrossBalance(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-basket-tool`,
  });
}

export async function moveAnalyticalBalanceToolToGrossBalance(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-analytical-balance-tool`,
  });
}

export async function placeToolOnGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-tool`,
    body: { tool_id: requireString(body, "tool_id") },
  });
}

export async function placeToolOnAnalyticalBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/place-tool`,
    body: { tool_id: requireString(body, "tool_id") },
  });
}

export async function moveRackToolToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-rack-tool`,
    body: { rack_slot_id: requireString(body, "rack_slot_id") },
  });
}

export async function moveRackToolToAnalyticalBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/place-rack-tool`,
    body: { rack_slot_id: requireString(body, "rack_slot_id") },
  });
}

export async function moveGrossBalanceToolToAnalyticalBalance(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/place-gross-balance-tool`,
  });
}

export async function restoreTrashedToolToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/restore-trash-tool/${requireString(body, "trash_tool_id")}`,
  });
}

export async function restoreTrashedToolToAnalyticalBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/restore-trash-tool/${requireString(body, "trash_tool_id")}`,
  });
}

export async function moveGrossBalanceToolToWorkbench(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/move-tool-to-workbench`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function moveAnalyticalBalanceToolToWorkbench(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/move-tool-to-workbench`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function moveGrossBalanceToolToRack(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/move-tool-to-rack`,
    body: { rack_slot_id: requireString(body, "rack_slot_id") },
  });
}

export async function moveAnalyticalBalanceToolToRack(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/move-tool-to-rack`,
    body: { rack_slot_id: requireString(body, "rack_slot_id") },
  });
}

export async function discardGrossBalanceTool(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/discard-tool`,
  });
}

export async function discardAnalyticalBalanceTool(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/discard-tool`,
  });
}

export async function tareAnalyticalBalance(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/tare`,
  });
}

export async function openAnalyticalBalanceTool(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/open-tool`,
  });
}

export async function closeAnalyticalBalanceTool(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/close-tool`,
  });
}

export async function recordAnalyticalSampleMass(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/record-sample-mass`,
  });
}

export async function openGrossBalanceTool(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/open-tool`,
  });
}

export async function closeGrossBalanceTool(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/close-tool`,
  });
}

export async function recordGrossWeight(experimentId: string, payload?: MutationPayload): Promise<Experiment> {
  const body = payload && "measured_gross_mass_g" in payload ? payload : undefined;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/reception/gross-weight/record`,
    ...(body
      ? {
          body: {
            measured_gross_mass_g: requireNumber(body, "measured_gross_mass_g"),
          },
        }
      : {}),
  });
}

export async function setGrossBalanceContainerOffset(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/container-offset`,
    body: {
      gross_mass_offset_g: requireNumber(body, "gross_mass_offset_g"),
    },
  });
}

export async function moveWorkspaceProduceLotToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-workspace-produce-lot/${requireString(body, "produce_lot_id")}`,
  });
}

export async function moveWorkbenchProduceLotToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-workbench-produce-lot`,
    body: {
      source_slot_id: requireString(body, "source_slot_id"),
      produce_lot_id: requireString(body, "produce_lot_id"),
    },
  });
}

export async function moveWidgetProduceLotToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/place-widget-produce-lot`,
    body: { produce_lot_id: requireString(body, "produce_lot_id") },
  });
}

export async function restoreTrashedProduceLotToGrossBalance(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/restore-trash-produce-lot/${requireString(body, "trash_produce_lot_id")}`,
  });
}

export async function moveGrossBalanceProduceLotToWorkbench(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/move-produce-lot-to-workbench`,
    body: {
      target_slot_id: requireString(body, "target_slot_id"),
      produce_lot_id: requireString(body, "produce_lot_id"),
    },
  });
}

export async function moveGrossBalanceProduceLotToWidget(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/move-produce-lot-to-widget`,
    body: { produce_lot_id: requireString(body, "produce_lot_id") },
  });
}

export async function discardGrossBalanceProduceLot(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/gross-balance/discard-produce-lot`,
    body: { produce_lot_id: requireString(body, "produce_lot_id") },
  });
}

export async function createLimsReception(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/lims/reception`,
    body: {
      entry_id:
        body.entry_id === undefined || body.entry_id === null
          ? null
          : requireString(body, "entry_id"),
      orchard_name: requireString(body, "orchard_name"),
      harvest_date: requireString(body, "harvest_date"),
      indicative_mass_g: requireNumber(body, "indicative_mass_g"),
      measured_gross_mass_g:
        body.measured_gross_mass_g === undefined || body.measured_gross_mass_g === null
          ? null
          : requireNumber(body, "measured_gross_mass_g"),
      measured_sample_mass_g:
        body.measured_sample_mass_g === undefined || body.measured_sample_mass_g === null
          ? null
          : requireNumber(body, "measured_sample_mass_g"),
    },
  });
}

export async function printLimsLabel(experimentId: string, payload?: MutationPayload): Promise<Experiment> {
  const entryId =
    payload && payload.entry_id !== undefined && payload.entry_id !== null
      ? requireString(payload, "entry_id")
      : null;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/lims/print-label`,
    body: entryId === null ? undefined : { entry_id: entryId },
  });
}

export async function discardPrintedLimsLabel(experimentId: string, payload?: MutationPayload): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "DELETE",
    path: `/experiments/${experimentId}/lims/printed-label`,
  });
}

export async function applyPrintedLimsLabel(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/lims/apply-label-to-workbench-bag`,
    body: { slot_id: requireString(body, "slot_id") },
  });
}

export async function applyPrintedLimsLabelToBasketBag(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/lims/apply-label-to-basket-bag`,
  });
}

export async function applyPrintedLimsLabelToGrossBalanceBag(
  experimentId: string,
  payload?: MutationPayload,
): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/lims/apply-label-to-gross-balance-bag`,
  });
}

export async function createDebugProduceLotOnWorkbench(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/debug/produce-presets/${requireString(body, "preset_id")}/spawn-on-workbench`,
    body: {
      target_slot_id: requireString(body, "target_slot_id"),
      ...optionalNumberBody(body, "total_mass_g"),
      ...optionalNumberBody(body, "temperature_c"),
      ...optionalNumberBody(body, "residual_co2_mass_g"),
    },
  });
}

export async function createDebugProduceLotToWidget(
  experimentId: string,
  payload: MutationPayload,
): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/debug/produce-presets/${requireString(body, "preset_id")}/spawn-on-widget`,
    body: {
      widget_id: requireString(body, "widget_id"),
      ...optionalNumberBody(body, "total_mass_g"),
      ...optionalNumberBody(body, "temperature_c"),
      ...optionalNumberBody(body, "residual_co2_mass_g"),
    },
  });
}

export async function discardWorkspaceProduceLot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/produce-lots/${requireString(body, "produce_lot_id")}/discard`,
  });
}

export async function moveWidgetProduceLotToWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/produce-lots/${requireString(body, "produce_lot_id")}/move-to-workbench-tool`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function discardWidgetProduceLot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workspace/widgets/${requireString(body, "widget_id")}/produce-lots/${requireString(body, "produce_lot_id")}/discard`,
  });
}

export async function placeToolInRackSlot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/rack/slots/${requireString(body, "rack_slot_id")}/place-tool-from-palette`,
    body: { tool_id: requireString(body, "tool_id") },
  });
}

export async function placeWorkbenchToolInRackSlot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/rack/slots/${requireString(body, "rack_slot_id")}/place-tool-from-workbench`,
    body: { source_slot_id: requireString(body, "source_slot_id") },
  });
}

export async function moveRackToolBetweenSlots(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/rack/tools/${findRackToolId(experimentId, requireString(body, "source_rack_slot_id"))}/move-to-slot`,
    body: { target_rack_slot_id: requireString(body, "target_rack_slot_id") },
  });
}

export async function removeRackToolToWorkbenchSlot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/rack/tools/${findRackToolId(experimentId, requireString(body, "rack_slot_id"))}/move-to-workbench-slot`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function discardRackTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/rack/tools/${findRackToolId(experimentId, requireString(body, "rack_slot_id"))}/discard`,
  });
}

export async function restoreTrashedToolToRackSlot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/trash/tools/${requireString(body, "trash_tool_id")}/restore-to-rack`,
    body: { rack_slot_id: requireString(body, "rack_slot_id") },
  });
}

export async function addLiquidToWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/liquids`,
    body: {
      liquid_id: requireString(body, "liquid_id"),
      ...optionalNumberBody(body, "volume_ml"),
    },
  });
}

export async function addProduceLotToWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  const slotId = requireString(body, "slot_id");
  const toolId = findWorkbenchToolIdIfPresent(experimentId, slotId);

  return sendMutationRequest(experimentId, toolId
    ? {
        method: "POST",
        path: `/experiments/${experimentId}/workbench/tools/${toolId}/add-produce-lot`,
        body: { produce_lot_id: requireString(body, "produce_lot_id") },
      }
    : {
        method: "POST",
        path: `/experiments/${experimentId}/workbench/slots/${slotId}/add-produce-lot`,
        body: { produce_lot_id: requireString(body, "produce_lot_id") },
      });
}

export async function discardProduceLotFromWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/produce-lots/${requireString(body, "produce_lot_id")}/discard`,
    body: { slot_id: requireString(body, "slot_id") },
  });
}

export async function cutWorkbenchProduceLot(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/produce-lots/${requireString(body, "produce_lot_id")}/cut`,
    body: { slot_id: requireString(body, "slot_id") },
  });
}

export async function moveProduceLotBetweenWorkbenchTools(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/produce-lots/${requireString(body, "produce_lot_id")}/move-to-tool`,
    body: {
      source_slot_id: requireString(body, "source_slot_id"),
      target_slot_id: requireString(body, "target_slot_id"),
    },
  });
}

export async function restoreTrashedProduceLotToWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/trash/produce-lots/${requireString(body, "trash_produce_lot_id")}/restore-to-workbench-tool`,
    body: { target_slot_id: requireString(body, "target_slot_id") },
  });
}

export async function removeLiquidFromWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "DELETE",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/liquids/${requireString(body, "liquid_entry_id")}`,
  });
}

export async function applySampleLabelToWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/sample-label`,
  });
}

export async function closeWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/close`,
  });
}

export async function openWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/open`,
  });
}

export async function discardSpatula(experimentId: string): Promise<Experiment> {
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/spatula/discard`,
  });
}

export async function loadSpatulaFromWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/spatula/load`,
  });
}

export async function pourSpatulaIntoWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/spatula/pour`,
    body: { delta_mass_g: requireNumber(body, "delta_mass_g") },
  });
}

export async function loadSpatulaFromAnalyticalBalanceTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  void payload;
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/spatula/load`,
  });
}

export async function pourSpatulaIntoAnalyticalBalanceTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/analytical-balance/spatula/pour`,
    body: { delta_mass_g: requireNumber(body, "delta_mass_g") },
  });
}

export async function updateWorkbenchToolSampleLabelText(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "PATCH",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/sample-labels/${requireString(body, "label_id")}`,
    body: { sample_label_text: requireString(body, "sample_label_text") },
  });
}

export async function moveSampleLabelBetweenWorkbenchTools(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "source_slot_id"))}/sample-labels/${requireString(body, "label_id")}/move-to-tool`,
    body: { target_tool_id: findWorkbenchToolId(experimentId, requireString(body, "target_slot_id")) },
  });
}

export async function discardSampleLabelFromWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "DELETE",
    path: `/experiments/${experimentId}/workbench/tools/${findWorkbenchToolId(experimentId, requireString(body, "slot_id"))}/sample-labels/${requireString(body, "label_id")}`,
  });
}

export async function restoreTrashedSampleLabelToWorkbenchTool(experimentId: string, payload: MutationPayload): Promise<Experiment> {
  const body = requirePayload(payload);
  return sendMutationRequest(experimentId, {
    method: "POST",
    path: `/experiments/${experimentId}/trash/sample-labels/${requireString(body, "trash_sample_label_id")}/restore-to-workbench-tool`,
    body: { target_tool_id: findWorkbenchToolId(experimentId, requireString(body, "target_slot_id")) },
  });
}

function normalizeExperiment(experiment: Experiment): Experiment {
  const rawTrash = experiment.trash as Experiment["trash"] & Record<string, unknown>;
  const rawWorkspace = experiment.workspace as Experiment["workspace"] & Record<string, unknown>;

  return {
    ...experiment,
    last_simulation_at: String(
      (experiment as Experiment & Record<string, unknown>).last_simulation_at ??
      (experiment as Experiment & Record<string, unknown>).lastSimulationAt ??
      "",
    ),
    snapshot_version: Number(
      (experiment as Experiment & Record<string, unknown>).snapshot_version ??
      (experiment as Experiment & Record<string, unknown>).snapshotVersion ??
      0,
    ),
    workbench: {
      slots: experiment.workbench.slots.map(normalizeBenchSlot),
    },
    rack: {
      slots: experiment.rack.slots.map(normalizeRackSlot),
    },
    trash: {
      produceLots: (
        experiment.trash.produceLots ??
        rawTrash.produce_lots ??
        []
      ).map(
          normalizeTrashProduceLot,
        ),
      sampleLabels: (
        experiment.trash.sampleLabels ??
        rawTrash.sample_labels ??
        []
      ).map(
          normalizeTrashSampleLabel,
        ),
      tools: experiment.trash.tools.map(normalizeTrashTool),
    },
    workspace: {
      produceBasketLots: (
        experiment.workspace.produceBasketLots ??
        rawWorkspace.produce_basket_lots ??
        []
      ).map(
          normalizeProduceLot,
        ),
      widgets: experiment.workspace.widgets.map(normalizeWorkspaceWidget),
    },
    limsReception: normalizeLimsReception(
      (
        (experiment as Experiment & Record<string, unknown>).limsReception ??
        (experiment as Experiment & Record<string, unknown>).lims_reception
      ) as LimsReception & Record<string, unknown>,
    ),
    limsEntries: (
      (experiment as Experiment & Record<string, unknown>).limsEntries ??
      (experiment as Experiment & Record<string, unknown>).lims_entries ??
      []
    ).map((entry) =>
      normalizeLimsReception(entry as LimsReception & Record<string, unknown>),
    ),
    basketTool: (() => {
      const rawBasketTool =
        (experiment as Experiment & Record<string, unknown>).basketTool ??
        (experiment as Experiment & Record<string, unknown>).basket_tool;
      return rawBasketTool ? normalizeBenchTool(rawBasketTool as BenchToolInstance & Record<string, unknown>) : null;
    })(),
    spatula: normalizeSpatulaState(
      ((experiment as Experiment & Record<string, unknown>).spatula ?? {}) as
        SpatulaState &
        Record<string, unknown>,
    ),
    analyticalBalance: normalizeAnalyticalBalanceState(
      (
        (experiment as Experiment & Record<string, unknown>).analyticalBalance ??
        (experiment as Experiment & Record<string, unknown>).analytical_balance ??
        {}
      ) as AnalyticalBalanceState & Record<string, unknown>,
    ),
  };
}

function normalizeBenchSlot(slot: BenchSlot): BenchSlot {
  const rawSlot = slot as BenchSlot & Record<string, unknown>;
  const rawSurfaceProduceLots = (
    slot.surfaceProduceLots ??
    rawSlot.surface_produce_lots ??
    []
  ) as unknown[];

  return {
    id: slot.id,
    label: slot.label,
    surfaceProduceLots: rawSurfaceProduceLots.map((lot) =>
      normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
    ),
    tool: slot.tool ? normalizeBenchTool(slot.tool as BenchToolInstance & Record<string, unknown>) : null,
  };
}

function normalizeBenchTool(tool: BenchToolInstance & Record<string, unknown>): BenchToolInstance {
  const rawProduceLots = (tool.produceLots ?? tool.produce_lots ?? []) as unknown[];

  return {
    id: tool.id,
    toolId: String(tool.toolId ?? tool.tool_id),
    label: tool.label,
    subtitle: tool.subtitle,
    accent: tool.accent,
    toolType: String(tool.toolType ?? tool.tool_type) as BenchToolInstance["toolType"],
    capacity_ml: Number(tool.capacity_ml),
    contactImpurityMgPerG: Number(tool.contactImpurityMgPerG ?? tool.contact_impurity_mg_per_g ?? 0),
    isSealed: Boolean(tool.isSealed ?? tool.is_sealed ?? false),
    closureFault:
      tool.closureFault !== undefined
        ? tool.closureFault === null
          ? null
          : String(tool.closureFault)
        : tool.closure_fault !== undefined && tool.closure_fault !== null
          ? String(tool.closure_fault)
          : null,
    fieldLabelText:
      tool.fieldLabelText !== undefined
        ? (tool.fieldLabelText as string | null)
        : tool.field_label_text !== undefined
          ? (tool.field_label_text as string | null)
          : null,
    labels:
      tool.labels !== undefined
        ? (tool.labels as Array<BenchLabel & Record<string, unknown>>).map((label) =>
            normalizeBenchLabel(label),
          )
        : tool.sampleLabelText !== undefined || tool.sample_label_text !== undefined
          ? [
              {
                id: `${String(tool.id)}-legacy-label`,
                labelKind:
                  tool.sampleLabelReceivedDate !== undefined ||
                  tool.sample_label_received_date !== undefined
                    ? "lims"
                    : "manual",
                text: String(tool.sampleLabelText ?? tool.sample_label_text ?? ""),
                receivedDate:
                  tool.sampleLabelReceivedDate !== undefined
                    ? (tool.sampleLabelReceivedDate as string | null)
                    : tool.sample_label_received_date !== undefined
                      ? (tool.sample_label_received_date as string | null)
                      : null,
                sampleCode:
                  tool.sampleLabelReceivedDate !== undefined ||
                  tool.sample_label_received_date !== undefined
                    ? String(tool.sampleLabelText ?? tool.sample_label_text ?? "")
                    : null,
              },
            ]
          : [],
    produceLots: rawProduceLots.map((lot) =>
      normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
    ),
    liquids:
      (tool.liquids as BenchLiquidPortion[] | undefined)?.map((liquid) =>
        normalizeBenchLiquid(liquid as BenchLiquidPortion & Record<string, unknown>),
      ) ?? [],
    powderFractions: normalizePowderFractions(tool.powderFractions ?? tool.powder_fractions),
  };
}

function normalizePowderFractions(raw: unknown): PowderFraction[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: Record<string, unknown>) => {
    const exposureIdsRaw = f.exposureContainerIds ?? f.exposure_container_ids;
    return {
      id: String(f.id ?? ""),
      sourceLotId: String(f.sourceLotId ?? f.source_lot_id ?? ""),
      massG: Number(f.massG ?? f.mass_g ?? 0),
      impurityMassMg: Number(f.impurityMassMg ?? f.impurity_mass_mg ?? 0),
      exposureContainerIds: Array.isArray(exposureIdsRaw)
        ? exposureIdsRaw.map((id: unknown) => String(id))
        : [],
    };
  });
}

function normalizeSpatulaState(spatula: SpatulaState & Record<string, unknown>): SpatulaState {
  return {
    isLoaded: Boolean(spatula.isLoaded ?? spatula.is_loaded ?? false),
    loadedFractions: normalizePowderFractions(spatula.loadedFractions ?? spatula.loaded_fractions),
    sourceToolId:
      spatula.sourceToolId !== undefined
        ? (spatula.sourceToolId as string | null)
        : spatula.source_tool_id !== undefined
          ? (spatula.source_tool_id as string | null)
          : null,
  };
}

function normalizeAnalyticalBalanceState(
  analyticalBalance: AnalyticalBalanceState & Record<string, unknown>,
): AnalyticalBalanceState {
  return {
    tareMassG:
      analyticalBalance.tareMassG !== undefined && analyticalBalance.tareMassG !== null
        ? Number(analyticalBalance.tareMassG)
        : analyticalBalance.tare_mass_g !== undefined && analyticalBalance.tare_mass_g !== null
          ? Number(analyticalBalance.tare_mass_g)
          : null,
    taredToolId:
      analyticalBalance.taredToolId !== undefined
        ? (analyticalBalance.taredToolId as string | null)
        : analyticalBalance.tared_tool_id !== undefined
          ? (analyticalBalance.tared_tool_id as string | null)
          : null,
  };
}

function normalizeBenchLabel(label: BenchLabel & Record<string, unknown>): BenchLabel {
  return {
    id: String(label.id),
    labelKind: String(label.labelKind ?? label.label_kind ?? "manual") as BenchLabel["labelKind"],
    text: String(label.text ?? ""),
    receivedDate:
      label.receivedDate !== undefined
        ? (label.receivedDate as string | null)
        : label.received_date !== undefined
          ? (label.received_date as string | null)
          : null,
    sampleCode:
      label.sampleCode !== undefined
        ? (label.sampleCode as string | null)
        : label.sample_code !== undefined
          ? (label.sample_code as string | null)
          : null,
  };
}

function normalizePrintedLabelTicket(
  ticket: PrintedLabelTicket & Record<string, unknown>,
): PrintedLabelTicket {
  return {
    id: String(ticket.id),
    sampleCode: String(ticket.sampleCode ?? ticket.sample_code),
    labelText: String(ticket.labelText ?? ticket.label_text),
    receivedDate: String(ticket.receivedDate ?? ticket.received_date ?? ""),
  };
}

function normalizeLimsReception(
  reception: (LimsReception & Record<string, unknown>) | null | undefined,
): LimsReception {
  return {
    id:
      reception?.id !== undefined && reception.id !== null
        ? String(reception.id)
        : null,
    orchardName: String(reception?.orchardName ?? reception?.orchard_name ?? ""),
    harvestDate: String(reception?.harvestDate ?? reception?.harvest_date ?? ""),
    indicativeMassG: Number(reception?.indicativeMassG ?? reception?.indicative_mass_g ?? 0),
    measuredGrossMassG:
      reception?.measuredGrossMassG !== undefined && reception.measuredGrossMassG !== null
        ? Number(reception.measuredGrossMassG)
      : reception?.measured_gross_mass_g !== undefined && reception.measured_gross_mass_g !== null
          ? Number(reception.measured_gross_mass_g)
          : null,
    grossMassOffsetG:
      reception?.grossMassOffsetG !== undefined && reception.grossMassOffsetG !== null
        ? Number(reception.grossMassOffsetG)
        : reception?.gross_mass_offset_g !== undefined && reception.gross_mass_offset_g !== null
          ? Number(reception.gross_mass_offset_g)
          : 0,
    measuredSampleMassG:
      reception?.measuredSampleMassG !== undefined && reception.measuredSampleMassG !== null
        ? Number(reception.measuredSampleMassG)
      : reception?.measured_sample_mass_g !== undefined && reception.measured_sample_mass_g !== null
          ? Number(reception.measured_sample_mass_g)
          : null,
    labSampleCode:
      reception?.labSampleCode !== undefined
        ? (reception.labSampleCode as string | null)
        : reception?.lab_sample_code !== undefined
          ? (reception.lab_sample_code as string | null)
          : null,
    status: String(reception?.status ?? "awaiting_reception") as LimsReception["status"],
    printedLabelTicket:
      reception?.printedLabelTicket !== undefined && reception.printedLabelTicket !== null
        ? normalizePrintedLabelTicket(
            reception.printedLabelTicket as PrintedLabelTicket & Record<string, unknown>,
          )
        : reception?.printed_label_ticket !== undefined && reception.printed_label_ticket !== null
          ? normalizePrintedLabelTicket(
              reception.printed_label_ticket as PrintedLabelTicket & Record<string, unknown>,
            )
          : null,
  };
}

function normalizeRackSlot(slot: RackSlot): RackSlot {
  return {
    id: slot.id,
    label: slot.label,
    tool: slot.tool ? normalizeBenchTool(slot.tool as BenchToolInstance & Record<string, unknown>) : null,
  };
}

function normalizeBenchLiquid(liquid: BenchLiquidPortion & Record<string, unknown>): BenchLiquidPortion {
  return {
    id: liquid.id,
    liquidId: String(liquid.liquidId ?? liquid.liquid_id),
    name: liquid.name,
    volume_ml: Number(liquid.volume_ml),
    accent: liquid.accent,
  };
}

function normalizeTrashTool(entry: TrashToolEntry & Record<string, unknown>): TrashToolEntry {
  return {
    id: entry.id,
    originLabel: String(entry.originLabel ?? entry.origin_label),
    tool: normalizeBenchTool(entry.tool as BenchToolInstance & Record<string, unknown>),
  };
}

function normalizeTrashProduceLot(entry: TrashProduceLotEntry & Record<string, unknown>): TrashProduceLotEntry {
  return {
    id: String(entry.id),
    originLabel: String(entry.originLabel ?? entry.origin_label),
    produceLot: normalizeProduceLot(
      (entry.produceLot ?? entry.produce_lot) as ExperimentProduceLot & Record<string, unknown>,
    ),
  };
}

function normalizeTrashSampleLabel(entry: TrashSampleLabelEntry & Record<string, unknown>): TrashSampleLabelEntry {
  return {
    id: String(entry.id),
    originLabel: String(entry.originLabel ?? entry.origin_label),
    label:
      entry.label !== undefined
        ? normalizeBenchLabel((entry.label ?? {}) as BenchLabel & Record<string, unknown>)
        : {
            id: `${String(entry.id)}-legacy-label`,
            labelKind: "manual",
            text: String(entry.sampleLabelText ?? entry.sample_label_text ?? ""),
            receivedDate: null,
            sampleCode: null,
          },
  };
}

function normalizeWorkspaceWidget(
  widget: ExperimentWorkspaceWidget & Record<string, unknown>,
): ExperimentWorkspaceWidget {
  const legacyX = Number(widget.x ?? 0);
  const legacyY = Number(widget.y ?? 0);
  const rawProduceLots = (widget.produceLots ?? widget.produce_lots ?? []) as unknown[];
  const rawTool = (widget.tool ?? (widget as Record<string, unknown>).tool) as
    | (BenchToolInstance & Record<string, unknown>)
    | null
    | undefined;

  return {
    id: String(widget.id) as ExperimentWorkspaceWidget["id"],
    widgetType: String(widget.widgetType ?? widget.widget_type) as ExperimentWorkspaceWidget["widgetType"],
    label: String(widget.label),
    anchor: String(widget.anchor ?? "top-left") as WidgetAnchor,
    grinderRunDurationMs: Number(widget.grinderRunDurationMs ?? widget.grinder_run_duration_ms ?? 0),
    grinderRunRemainingMs: Number(widget.grinderRunRemainingMs ?? widget.grinder_run_remaining_ms ?? 0),
    grinderFault:
      widget.grinderFault !== undefined
        ? String(widget.grinderFault)
        : widget.grinder_fault !== undefined && widget.grinder_fault !== null
          ? String(widget.grinder_fault)
          : null,
    offsetX: Number(widget.offsetX ?? widget.offset_x ?? legacyX),
    offsetY: Number(widget.offsetY ?? widget.offset_y ?? legacyY),
    x: legacyX,
    y: legacyY,
    isPresent: Boolean(widget.isPresent ?? widget.is_present),
    isTrashed: Boolean(widget.isTrashed ?? widget.is_trashed),
    tool: rawTool === undefined ? undefined : rawTool === null ? null : normalizeBenchTool(rawTool),
    produceLots: rawProduceLots.map((lot) =>
      normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
    ),
    liquids:
      (widget.liquids as BenchLiquidPortion[] | undefined)?.map((liquid) =>
        normalizeBenchLiquid(liquid as BenchLiquidPortion & Record<string, unknown>),
      ) ?? [],
  };
}

function normalizeProduceLot(lot: ExperimentProduceLot & Record<string, unknown>): ExperimentProduceLot {
  const unitCountValue = lot.unitCount ?? lot.unit_count;

  return {
    cutState: String(lot.cutState ?? lot.cut_state ?? "whole") as ExperimentProduceLot["cutState"],
    grindQualityLabel:
      lot.grindQualityLabel !== undefined
        ? String(lot.grindQualityLabel)
        : lot.grind_quality_label !== undefined && lot.grind_quality_label !== null
          ? String(lot.grind_quality_label)
          : null,
    homogeneityScore:
      lot.homogeneityScore !== undefined
        ? Number(lot.homogeneityScore)
        : lot.homogeneity_score !== undefined && lot.homogeneity_score !== null
          ? Number(lot.homogeneity_score)
          : null,
    id: String(lot.id),
    isContaminated: Boolean(lot.isContaminated ?? lot.is_contaminated),
    label: String(lot.label),
    produceType: String(lot.produceType ?? lot.produce_type) as ExperimentProduceLot["produceType"],
    residualCo2MassG: Number(lot.residualCo2MassG ?? lot.residual_co2_mass_g ?? 0),
    temperatureC: Number(lot.temperatureC ?? lot.temperature_c ?? 20),
    totalMassG: Number(lot.totalMassG ?? lot.total_mass_g),
    unitCount:
      unitCountValue === undefined || unitCountValue === null ? null : Number(unitCountValue),
  };
}
