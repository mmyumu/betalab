import type { Experiment } from "@/types/experiment";
import type {
  BenchLiquidPortion,
  BenchSlot,
  BenchToolInstance,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  RackSlot,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
  WidgetAnchor,
} from "@/types/workbench";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const experimentCache = new Map<string, Experiment>();

type ApiRequest = {
  body?: Record<string, unknown>;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
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

export async function sendExperimentCommand(
  experimentId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<Experiment> {
  const request = buildExperimentCommandRequest(
    experimentId,
    type,
    payload,
    experimentCache.get(experimentId),
  );
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
    throw await buildApiError(response, "Failed to send experiment command");
  }

  const experiment = normalizeExperiment((await response.json()) as Experiment);
  experimentCache.set(experiment.id, experiment);
  return experiment;
}

function buildExperimentCommandRequest(
  experimentId: string,
  type: string,
  payload: Record<string, unknown>,
  experiment?: Experiment,
): ApiRequest {
  const rootPath = `/experiments/${experimentId}`;

  switch (type) {
    case "add_workbench_slot":
      return { method: "POST", path: `${rootPath}/workbench/slots` };
    case "remove_workbench_slot":
      return {
        method: "DELETE",
        path: `${rootPath}/workbench/slots/${requireString(payload.slot_id, "slot_id")}`,
      };
    case "place_tool_on_workbench":
      return {
        method: "POST",
        path: `${rootPath}/workbench/slots/${requireString(payload.slot_id, "slot_id")}/place-tool`,
        body: { tool_id: requireString(payload.tool_id, "tool_id") },
      };
    case "move_tool_between_workbench_slots":
      return {
        method: "POST",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.source_slot_id, "source_slot_id"),
        )}/move-to-slot`,
        body: { target_slot_id: requireString(payload.target_slot_id, "target_slot_id") },
      };
    case "discard_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/discard`,
      };
    case "discard_tool_from_palette":
      return {
        method: "POST",
        path: `${rootPath}/palette/tools/discard`,
        body: { tool_id: requireString(payload.tool_id, "tool_id") },
      };
    case "discard_sample_label_from_palette":
      return {
        method: "POST",
        path: `${rootPath}/palette/sample-labels/discard`,
      };
    case "restore_trashed_tool_to_workbench_slot":
      return {
        method: "POST",
        path: `${rootPath}/trash/tools/${requireString(payload.trash_tool_id, "trash_tool_id")}/restore-to-workbench`,
        body: { target_slot_id: requireString(payload.target_slot_id, "target_slot_id") },
      };
    case "add_workspace_widget":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets`,
        body: {
          widget_id: requireString(payload.widget_id, "widget_id"),
          anchor: requireString(payload.anchor, "anchor"),
          offset_x: requireNumber(payload.offset_x, "offset_x"),
          offset_y: requireNumber(payload.offset_y, "offset_y"),
        },
      };
    case "move_workspace_widget":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/move`,
        body: {
          anchor: requireString(payload.anchor, "anchor"),
          offset_x: requireNumber(payload.offset_x, "offset_x"),
          offset_y: requireNumber(payload.offset_y, "offset_y"),
        },
      };
    case "discard_workspace_widget":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/discard`,
      };
    case "add_liquid_to_workspace_widget":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/liquids`,
        body: {
          liquid_id: requireString(payload.liquid_id, "liquid_id"),
          ...optionalNumberBody("volume_ml", payload.volume_ml),
        },
      };
    case "update_workspace_widget_liquid_volume":
      return {
        method: "PATCH",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/liquids/${requireString(payload.liquid_entry_id, "liquid_entry_id")}`,
        body: { volume_ml: requireNumber(payload.volume_ml, "volume_ml") },
      };
    case "remove_liquid_from_workspace_widget":
      return {
        method: "DELETE",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/liquids/${requireString(payload.liquid_entry_id, "liquid_entry_id")}`,
      };
    case "complete_grinder_cycle":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/complete-grinder-cycle`,
      };
    case "advance_workspace_cryogenics":
      return {
        method: "POST",
        path: `${rootPath}/workspace/advance-cryogenics`,
        body: { elapsed_ms: requireNumber(payload.elapsed_ms, "elapsed_ms") },
      };
    case "add_workspace_produce_lot_to_widget":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/add-produce-lot`,
        body: { produce_lot_id: requireString(payload.produce_lot_id, "produce_lot_id") },
      };
    case "move_workbench_produce_lot_to_widget":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/move-workbench-produce-lot`,
        body: {
          source_slot_id: requireString(payload.source_slot_id, "source_slot_id"),
          produce_lot_id: requireString(payload.produce_lot_id, "produce_lot_id"),
        },
      };
    case "restore_trashed_produce_lot_to_widget":
      return {
        method: "POST",
        path: `${rootPath}/trash/produce-lots/${requireString(payload.trash_produce_lot_id, "trash_produce_lot_id")}/restore-to-widget`,
        body: { widget_id: requireString(payload.widget_id, "widget_id") },
      };
    case "create_produce_lot":
      return {
        method: "POST",
        path: `${rootPath}/workspace/produce-lots`,
        body: { produce_type: requireString(payload.produce_type, "produce_type") },
      };
    case "discard_workspace_produce_lot":
      return {
        method: "POST",
        path: `${rootPath}/workspace/produce-lots/${requireString(payload.produce_lot_id, "produce_lot_id")}/discard`,
      };
    case "move_widget_produce_lot_to_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/produce-lots/${requireString(payload.produce_lot_id, "produce_lot_id")}/move-to-workbench-tool`,
        body: { target_slot_id: requireString(payload.target_slot_id, "target_slot_id") },
      };
    case "discard_widget_produce_lot":
      return {
        method: "POST",
        path: `${rootPath}/workspace/widgets/${requireString(payload.widget_id, "widget_id")}/produce-lots/${requireString(payload.produce_lot_id, "produce_lot_id")}/discard`,
      };
    case "place_tool_in_rack_slot":
      return {
        method: "POST",
        path: `${rootPath}/rack/slots/${requireString(payload.rack_slot_id, "rack_slot_id")}/place-tool-from-palette`,
        body: { tool_id: requireString(payload.tool_id, "tool_id") },
      };
    case "place_workbench_tool_in_rack_slot":
      return {
        method: "POST",
        path: `${rootPath}/rack/slots/${requireString(payload.rack_slot_id, "rack_slot_id")}/place-tool-from-workbench`,
        body: { source_slot_id: requireString(payload.source_slot_id, "source_slot_id") },
      };
    case "move_rack_tool_between_slots":
      return {
        method: "POST",
        path: `${rootPath}/rack/tools/${findRackToolId(
          experiment,
          requireString(payload.source_rack_slot_id, "source_rack_slot_id"),
        )}/move-to-slot`,
        body: { target_rack_slot_id: requireString(payload.target_rack_slot_id, "target_rack_slot_id") },
      };
    case "remove_rack_tool_to_workbench_slot":
      return {
        method: "POST",
        path: `${rootPath}/rack/tools/${findRackToolId(
          experiment,
          requireString(payload.rack_slot_id, "rack_slot_id"),
        )}/move-to-workbench-slot`,
        body: { target_slot_id: requireString(payload.target_slot_id, "target_slot_id") },
      };
    case "discard_rack_tool":
      return {
        method: "POST",
        path: `${rootPath}/rack/tools/${findRackToolId(
          experiment,
          requireString(payload.rack_slot_id, "rack_slot_id"),
        )}/discard`,
      };
    case "restore_trashed_tool_to_rack_slot":
      return {
        method: "POST",
        path: `${rootPath}/trash/tools/${requireString(payload.trash_tool_id, "trash_tool_id")}/restore-to-rack`,
        body: { rack_slot_id: requireString(payload.rack_slot_id, "rack_slot_id") },
      };
    case "add_liquid_to_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/liquids`,
        body: {
          liquid_id: requireString(payload.liquid_id, "liquid_id"),
          ...optionalNumberBody("volume_ml", payload.volume_ml),
        },
      };
    case "add_produce_lot_to_workbench_tool": {
      const slotId = requireString(payload.slot_id, "slot_id");
      const toolId = findWorkbenchToolIdIfPresent(experiment, slotId);

      return toolId
        ? {
            method: "POST",
            path: `${rootPath}/workbench/tools/${toolId}/add-produce-lot`,
            body: { produce_lot_id: requireString(payload.produce_lot_id, "produce_lot_id") },
          }
        : {
            method: "POST",
            path: `${rootPath}/workbench/slots/${slotId}/add-produce-lot`,
            body: { produce_lot_id: requireString(payload.produce_lot_id, "produce_lot_id") },
          };
    }
    case "discard_produce_lot_from_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/workbench/produce-lots/${requireString(payload.produce_lot_id, "produce_lot_id")}/discard`,
        body: { slot_id: requireString(payload.slot_id, "slot_id") },
      };
    case "cut_workbench_produce_lot":
      return {
        method: "POST",
        path: `${rootPath}/workbench/produce-lots/${requireString(payload.produce_lot_id, "produce_lot_id")}/cut`,
        body: { slot_id: requireString(payload.slot_id, "slot_id") },
      };
    case "move_produce_lot_between_workbench_tools":
      return {
        method: "POST",
        path: `${rootPath}/workbench/produce-lots/${requireString(payload.produce_lot_id, "produce_lot_id")}/move-to-tool`,
        body: {
          source_slot_id: requireString(payload.source_slot_id, "source_slot_id"),
          target_slot_id: requireString(payload.target_slot_id, "target_slot_id"),
        },
      };
    case "restore_trashed_produce_lot_to_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/trash/produce-lots/${requireString(payload.trash_produce_lot_id, "trash_produce_lot_id")}/restore-to-workbench-tool`,
        body: { target_slot_id: requireString(payload.target_slot_id, "target_slot_id") },
      };
    case "remove_liquid_from_workbench_tool":
      return {
        method: "DELETE",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/liquids/${requireString(payload.liquid_entry_id, "liquid_entry_id")}`,
      };
    case "update_workbench_liquid_volume":
      return {
        method: "PATCH",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/liquids/${requireString(payload.liquid_entry_id, "liquid_entry_id")}`,
        body: { volume_ml: requireNumber(payload.volume_ml, "volume_ml") },
      };
    case "apply_sample_label_to_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/sample-label`,
      };
    case "update_workbench_tool_sample_label_text":
      return {
        method: "PATCH",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/sample-label`,
        body: { sample_label_text: requireString(payload.sample_label_text, "sample_label_text") },
      };
    case "move_sample_label_between_workbench_tools":
      return {
        method: "POST",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.source_slot_id, "source_slot_id"),
        )}/sample-label/move-to-tool`,
        body: {
          target_tool_id: findWorkbenchToolId(
            experiment,
            requireString(payload.target_slot_id, "target_slot_id"),
          ),
        },
      };
    case "discard_sample_label_from_workbench_tool":
      return {
        method: "DELETE",
        path: `${rootPath}/workbench/tools/${findWorkbenchToolId(
          experiment,
          requireString(payload.slot_id, "slot_id"),
        )}/sample-label`,
      };
    case "restore_trashed_sample_label_to_workbench_tool":
      return {
        method: "POST",
        path: `${rootPath}/trash/sample-labels/${requireString(payload.trash_sample_label_id, "trash_sample_label_id")}/restore-to-workbench-tool`,
        body: {
          target_tool_id: findWorkbenchToolId(
            experiment,
            requireString(payload.target_slot_id, "target_slot_id"),
          ),
        },
      };
    default:
      throw new Error(`Unsupported experiment command: ${type}`);
  }
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new Error(`Missing ${fieldName}`);
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new Error(`Missing ${fieldName}`);
}

function optionalNumberBody(fieldName: string, value: unknown): Record<string, number> {
  if (value === undefined) {
    return {};
  }

  return { [fieldName]: requireNumber(value, fieldName) };
}

function findWorkbenchToolId(experiment: Experiment | undefined, slotId: string): string {
  const toolId = findWorkbenchToolIdIfPresent(experiment, slotId);
  if (toolId) {
    return toolId;
  }

  throw new Error("Unknown workbench tool");
}

function findWorkbenchToolIdIfPresent(experiment: Experiment | undefined, slotId: string): string | null {
  return (
    experiment?.workbench.slots.find((slot) => slot.id === slotId)?.tool?.id ?? null
  );
}

function findRackToolId(experiment: Experiment | undefined, rackSlotId: string): string {
  const toolId = experiment?.rack.slots.find((slot) => slot.id === rackSlotId)?.tool?.id;
  if (toolId) {
    return toolId;
  }

  throw new Error("Unknown rack tool");
}

function normalizeExperiment(experiment: Experiment): Experiment {
  return {
    ...experiment,
    workbench: {
      slots: experiment.workbench.slots.map(normalizeBenchSlot),
    },
    rack: {
      slots: experiment.rack.slots.map(normalizeRackSlot),
    },
    trash: {
      produceLots:
        (experiment.trash.produceLots ?? experiment.trash.produce_lots ?? []).map(
          normalizeTrashProduceLot,
        ),
      sampleLabels:
        (experiment.trash.sampleLabels ?? experiment.trash.sample_labels ?? []).map(
          normalizeTrashSampleLabel,
        ),
      tools: experiment.trash.tools.map(normalizeTrashTool),
    },
    workspace: {
      produceLots:
        (experiment.workspace.produceLots ?? experiment.workspace.produce_lots ?? []).map(
          normalizeProduceLot,
        ),
      widgets: experiment.workspace.widgets.map(normalizeWorkspaceWidget),
    },
  };
}

function normalizeBenchSlot(slot: BenchSlot): BenchSlot {
  return {
    id: slot.id,
    label: slot.label,
    surfaceProduceLots: (slot.surfaceProduceLots ?? slot.surface_produce_lots ?? []).map((lot) =>
      normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
    ),
    tool: slot.tool ? normalizeBenchTool(slot.tool as BenchToolInstance & Record<string, unknown>) : null,
  };
}

function normalizeBenchTool(tool: BenchToolInstance & Record<string, unknown>): BenchToolInstance {
  return {
    id: tool.id,
    toolId: String(tool.toolId ?? tool.tool_id),
    label: tool.label,
    subtitle: tool.subtitle,
    accent: tool.accent,
    toolType: String(tool.toolType ?? tool.tool_type) as BenchToolInstance["toolType"],
    capacity_ml: Number(tool.capacity_ml),
    sampleLabelText:
      tool.sampleLabelText !== undefined
        ? (tool.sampleLabelText as string | null)
        : tool.sample_label_text !== undefined
          ? (tool.sample_label_text as string | null)
          : null,
    produceLots: (tool.produceLots ?? tool.produce_lots ?? []).map((lot) =>
      normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
    ),
    liquids:
      (tool.liquids as BenchLiquidPortion[] | undefined)?.map((liquid) =>
        normalizeBenchLiquid(liquid as BenchLiquidPortion & Record<string, unknown>),
      ) ?? [],
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
    sampleLabelText: String(entry.sampleLabelText ?? entry.sample_label_text ?? ""),
  };
}

function normalizeWorkspaceWidget(
  widget: ExperimentWorkspaceWidget & Record<string, unknown>,
): ExperimentWorkspaceWidget {
  const legacyX = Number(widget.x ?? 0);
  const legacyY = Number(widget.y ?? 0);

  return {
    id: String(widget.id) as ExperimentWorkspaceWidget["id"],
    widgetType: String(widget.widgetType ?? widget.widget_type) as ExperimentWorkspaceWidget["widgetType"],
    label: String(widget.label),
    anchor: String(widget.anchor ?? "top-left") as WidgetAnchor,
    offsetX: Number(widget.offsetX ?? widget.offset_x ?? legacyX),
    offsetY: Number(widget.offsetY ?? widget.offset_y ?? legacyY),
    x: legacyX,
    y: legacyY,
    isPresent: Boolean(widget.isPresent ?? widget.is_present),
    isTrashed: Boolean(widget.isTrashed ?? widget.is_trashed),
    produceLots: (widget.produceLots ?? widget.produce_lots ?? []).map((lot) =>
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
    id: String(lot.id),
    isContaminated: Boolean(lot.isContaminated ?? lot.is_contaminated),
    label: String(lot.label),
    produceType: String(lot.produceType ?? lot.produce_type) as ExperimentProduceLot["produceType"],
    temperatureC: Number(lot.temperatureC ?? lot.temperature_c ?? 20),
    totalMassG: Number(lot.totalMassG ?? lot.total_mass_g),
    unitCount:
      unitCountValue === undefined || unitCountValue === null ? null : Number(unitCountValue),
  };
}
