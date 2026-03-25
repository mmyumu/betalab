import type { Experiment } from "@/types/experiment";
import type {
  BenchLiquidPortion,
  BenchSlot,
  ExperimentProduceItem,
  BenchToolInstance,
  ExperimentWorkspaceWidget,
  RackSlot,
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
      tools: experiment.trash.tools.map(normalizeTrashTool),
    },
    workspace: {
      produceItems:
        (experiment.workspace.produceItems ?? experiment.workspace.produce_items ?? []).map(
          normalizeProduceItem,
        ),
      widgets: experiment.workspace.widgets.map(normalizeWorkspaceWidget),
    },
  };
}

function normalizeBenchSlot(slot: BenchSlot): BenchSlot {
  return {
    id: slot.id,
    label: slot.label,
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
    accepts_liquids: Boolean(tool.accepts_liquids),
    produceItems: (tool.produceItems ?? tool.produce_items ?? []).map(
      (item) => normalizeProduceItem(item as ExperimentProduceItem & Record<string, unknown>),
    ),
    trashable: typeof tool.trashable === "boolean" ? tool.trashable : true,
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
    trashable: Boolean(widget.trashable),
  };
}

function normalizeProduceItem(
  item: ExperimentProduceItem & Record<string, unknown>,
): ExperimentProduceItem {
  return {
    id: String(item.id),
    label: String(item.label),
    produceType: String(item.produceType ?? item.produce_type) as ExperimentProduceItem["produceType"],
  };
}
