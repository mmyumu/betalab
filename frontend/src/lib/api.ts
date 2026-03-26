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
} from "@/types/workbench";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function buildApiError(
  response: Response,
  fallbackMessage: string,
): Promise<Error> {
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

  return normalizeExperiment((await response.json()) as Experiment);
}

export async function getExperiment(experimentId: string): Promise<Experiment> {
  const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}`);

  if (!response.ok) {
    throw await buildApiError(response, "Failed to fetch experiment");
  }

  return normalizeExperiment((await response.json()) as Experiment);
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
    throw await buildApiError(response, "Failed to send experiment command");
  }

  return normalizeExperiment((await response.json()) as Experiment);
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
    surfaceProduceLots: (slot.surfaceProduceLots ?? slot.surface_produce_lots ?? []).map(
      (lot) => normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
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
    produceLots: (tool.produceLots ?? tool.produce_lots ?? []).map(
      (lot) => normalizeProduceLot(lot as ExperimentProduceLot & Record<string, unknown>),
    ),
    liquids: (tool.liquids as BenchLiquidPortion[] | undefined)?.map(
      (liquid) => normalizeBenchLiquid(liquid as BenchLiquidPortion & Record<string, unknown>),
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

function normalizeBenchLiquid(
  liquid: BenchLiquidPortion & Record<string, unknown>,
): BenchLiquidPortion {
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

function normalizeTrashProduceLot(
  entry: TrashProduceLotEntry & Record<string, unknown>,
): TrashProduceLotEntry {
  return {
    id: String(entry.id),
    originLabel: String(entry.originLabel ?? entry.origin_label),
    produceLot: normalizeProduceLot(
      (entry.produceLot ?? entry.produce_lot) as ExperimentProduceLot & Record<string, unknown>,
    ),
  };
}

function normalizeTrashSampleLabel(
  entry: TrashSampleLabelEntry & Record<string, unknown>,
): TrashSampleLabelEntry {
  return {
    id: String(entry.id),
    originLabel: String(entry.originLabel ?? entry.origin_label),
    sampleLabelText: String(entry.sampleLabelText ?? entry.sample_label_text ?? ""),
  };
}

function normalizeWorkspaceWidget(
  widget: ExperimentWorkspaceWidget & Record<string, unknown>,
): ExperimentWorkspaceWidget {
  return {
    id: String(widget.id) as ExperimentWorkspaceWidget["id"],
    widgetType: String(widget.widgetType ?? widget.widget_type) as ExperimentWorkspaceWidget["widgetType"],
    label: String(widget.label),
    x: Number(widget.x),
    y: Number(widget.y),
    isPresent: Boolean(widget.isPresent ?? widget.is_present),
    isTrashed: Boolean(widget.isTrashed ?? widget.is_trashed),
  };
}

function normalizeProduceLot(
  lot: ExperimentProduceLot & Record<string, unknown>,
): ExperimentProduceLot {
  const unitCountValue = lot.unitCount ?? lot.unit_count;

  return {
    id: String(lot.id),
    isContaminated: Boolean(lot.isContaminated ?? lot.is_contaminated),
    label: String(lot.label),
    produceType: String(lot.produceType ?? lot.produce_type) as ExperimentProduceLot["produceType"],
    totalMassG: Number(lot.totalMassG ?? lot.total_mass_g),
    unitCount:
      unitCountValue === undefined || unitCountValue === null ? null : Number(unitCountValue),
  };
}
