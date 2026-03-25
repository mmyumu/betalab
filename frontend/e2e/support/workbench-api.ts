import type { Page, Route } from "@playwright/test";

import type { Experiment } from "../../src/types/experiment";
import type {
  BenchSlot,
  BenchToolInstance,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  RackSlot,
  TrashToolEntry,
  ToolType,
} from "../../src/types/workbench";

type CommandRecord = {
  payload: Record<string, unknown>;
  type: string;
};

type MockWorkbenchApi = {
  commands: CommandRecord[];
};

const defaultAuditLog = [
  "Experiment created",
  "Start by dragging an extraction tool onto the bench.",
];

function makeSlots(count = 2): BenchSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `station_${index + 1}`,
    label: `Station ${index + 1}`,
    tool: null,
  }));
}

function makeRackSlots(): RackSlot[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `rack_slot_${index + 1}`,
    label: `Position ${index + 1}`,
    tool: null,
  }));
}

function makeWorkspaceWidgets(): ExperimentWorkspaceWidget[] {
  return [
    {
      id: "workbench",
      isPresent: true,
      isTrashed: false,
      label: "Workbench",
      trashable: false,
      widgetType: "workbench",
      x: 234,
      y: 0,
    },
    {
      id: "trash",
      isPresent: true,
      isTrashed: false,
      label: "Trash",
      trashable: false,
      widgetType: "trash",
      x: 1530,
      y: 0,
    },
    {
      id: "rack",
      isPresent: false,
      isTrashed: false,
      label: "Autosampler rack",
      trashable: true,
      widgetType: "autosampler_rack",
      x: 234,
      y: 886,
    },
    {
      id: "instrument",
      isPresent: false,
      isTrashed: false,
      label: "LC-MS/MS",
      trashable: true,
      widgetType: "lc_msms_instrument",
      x: 812,
      y: 886,
    },
    {
      id: "basket",
      isPresent: true,
      isTrashed: false,
      label: "Produce basket",
      trashable: false,
      widgetType: "produce_basket",
      x: 1460,
      y: 248,
    },
  ];
}

function makeTool(toolId: string): BenchToolInstance {
  const toolMap: Record<string, Omit<BenchToolInstance, "id">> = {
    autosampler_rack_widget: {
      accepts_liquids: false,
      accent: "sky",
      capacity_ml: 0,
      label: "Autosampler rack",
      liquids: [],
      produceLots: [],
      subtitle: "Sequence staging",
      toolId: "autosampler_rack_widget",
      toolType: "beaker" as ToolType,
      trashable: true,
    },
    beaker_rinse: {
      accepts_liquids: true,
      accent: "rose",
      capacity_ml: 100,
      label: "Bench beaker",
      liquids: [],
      produceLots: [],
      subtitle: "Temporary holding",
      toolId: "beaker_rinse",
      toolType: "beaker",
      trashable: true,
    },
    centrifuge_tube_50ml: {
      accepts_liquids: true,
      accent: "amber",
      capacity_ml: 50,
      label: "50 mL centrifuge tube",
      liquids: [],
      produceLots: [],
      subtitle: "QuEChERS extraction",
      toolId: "centrifuge_tube_50ml",
      toolType: "centrifuge_tube",
      trashable: true,
    },
    cleanup_tube_dspe: {
      accepts_liquids: true,
      accent: "emerald",
      capacity_ml: 15,
      label: "d-SPE cleanup tube",
      liquids: [],
      produceLots: [],
      subtitle: "Matrix cleanup",
      toolId: "cleanup_tube_dspe",
      toolType: "cleanup_tube",
      trashable: true,
    },
    sample_vial_lcms: {
      accepts_liquids: true,
      accent: "sky",
      capacity_ml: 2,
      label: "Autosampler vial",
      liquids: [],
      produceLots: [],
      subtitle: "Injection ready",
      toolId: "sample_vial_lcms",
      toolType: "sample_vial",
      trashable: true,
    },
    sealed_sampling_bag: {
      accepts_liquids: false,
      accent: "emerald",
      capacity_ml: 500,
      label: "Sealed sampling bag",
      liquids: [],
      produceLots: [],
      subtitle: "Field collection",
      toolId: "sealed_sampling_bag",
      toolType: "sample_bag",
      trashable: true,
    },
  };

  const baseTool = toolMap[toolId];
  if (!baseTool) {
    throw new Error(`Unsupported mock tool id: ${toolId}`);
  }

  return {
    id: `bench_tool_${toolId}`,
    ...baseTool,
  };
}

function makeExperiment(): Experiment {
  return {
    audit_log: [...defaultAuditLog],
    id: "experiment_pesticides",
    rack: { slots: makeRackSlots() },
    status: "preparing",
    trash: { produceLots: [], tools: [] },
    workbench: { slots: makeSlots() },
    workspace: { produceLots: [], widgets: makeWorkspaceWidgets() },
  };
}

function appendAudit(experiment: Experiment, message: string) {
  return {
    ...experiment,
    audit_log: [...experiment.audit_log, message],
  };
}

function cloneExperiment(experiment: Experiment): Experiment {
  return structuredClone(experiment);
}

function requireSlot(experiment: Experiment, slotId: string) {
  const slot = experiment.workbench.slots.find((candidate) => candidate.id === slotId);
  if (!slot) {
    throw new Error(`Unknown workbench slot: ${slotId}`);
  }
  return slot;
}

function requireRackSlot(experiment: Experiment, rackSlotId: string) {
  const slot = experiment.rack.slots.find((candidate) => candidate.id === rackSlotId);
  if (!slot) {
    throw new Error(`Unknown rack slot: ${rackSlotId}`);
  }
  return slot;
}

function requireTrashTool(experiment: Experiment, trashToolId: string) {
  const tool = experiment.trash.tools.find((candidate) => candidate.id === trashToolId);
  if (!tool) {
    throw new Error(`Unknown trash tool: ${trashToolId}`);
  }
  return tool;
}

function nextTrashToolId(experiment: Experiment) {
  return `trash_tool_${experiment.trash.tools.length + 1}`;
}

function applyCommand(
  experiment: Experiment,
  type: string,
  payload: Record<string, unknown>,
): Experiment {
  const next = cloneExperiment(experiment);

  switch (type) {
    case "add_workbench_slot": {
      const nextIndex = next.workbench.slots.length + 1;
      next.workbench.slots.push({
        id: `station_${nextIndex}`,
        label: `Station ${nextIndex}`,
        tool: null,
      });
      return appendAudit(next, `Station ${nextIndex} added to workbench.`);
    }
    case "remove_workbench_slot": {
      const slotId = String(payload.slot_id);
      next.workbench.slots = next.workbench.slots.filter((slot) => slot.id !== slotId);
      return appendAudit(next, `${slotId.replace("_", " ")} removed from workbench.`);
    }
    case "place_tool_on_workbench": {
      const slot = requireSlot(next, String(payload.slot_id));
      slot.tool = makeTool(String(payload.tool_id));
      return appendAudit(next, `${slot.tool.label} placed on ${slot.label}.`);
    }
    case "add_workspace_widget": {
      const widgetId = String(payload.widget_id);
      const widget = next.workspace.widgets.find((candidate) => candidate.id === widgetId);
      if (!widget) {
        throw new Error(`Unknown workspace widget: ${widgetId}`);
      }
      widget.isPresent = true;
      widget.isTrashed = false;
      widget.x = Number(payload.x);
      widget.y = Number(payload.y);
      return appendAudit(next, `${widget.label} added to workspace.`);
    }
    case "place_workbench_tool_in_rack_slot": {
      const sourceSlot = requireSlot(next, String(payload.source_slot_id));
      const rackSlot = requireRackSlot(next, String(payload.rack_slot_id));
      rackSlot.tool = sourceSlot.tool;
      sourceSlot.tool = null;
      return appendAudit(next, `${rackSlot.tool?.label ?? "Tool"} placed in ${rackSlot.label}.`);
    }
    case "discard_workbench_tool": {
      const slot = requireSlot(next, String(payload.slot_id));
      if (!slot.tool) {
        throw new Error(`No tool to discard in ${slot.id}`);
      }
      const trashTool: TrashToolEntry = {
        id: nextTrashToolId(next),
        originLabel: slot.label,
        tool: slot.tool,
      };
      next.trash.tools.push(trashTool);
      slot.tool = null;
      return appendAudit(next, `${trashTool.tool.label} discarded from ${trashTool.originLabel}.`);
    }
    case "restore_trashed_tool_to_workbench_slot": {
      const slot = requireSlot(next, String(payload.target_slot_id));
      const trashToolId = String(payload.trash_tool_id);
      const trashTool = requireTrashTool(next, trashToolId);
      slot.tool = trashTool.tool;
      next.trash.tools = next.trash.tools.filter((entry) => entry.id !== trashToolId);
      return appendAudit(next, `${slot.tool.label} restored to ${slot.label}.`);
    }
    case "create_produce_lot": {
      const produceLot: ExperimentProduceLot = {
        id: `produce_${next.workspace.produceLots.length + 1}`,
        label: `Apple lot ${next.workspace.produceLots.length + 1}`,
        produceType: "apple",
        totalMassG: 2450,
        unitCount: 12,
      };
      next.workspace.produceLots.push(produceLot);
      return appendAudit(next, `${produceLot.label} added to the basket.`);
    }
    default:
      throw new Error(`Unsupported mock command: ${type}`);
  }
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  });
}

export async function mockWorkbenchApi(page: Page): Promise<MockWorkbenchApi> {
  let experiment = makeExperiment();
  const commands: CommandRecord[] = [];

  await page.route("**/experiments", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    experiment = makeExperiment();
    await fulfillJson(route, 200, experiment);
  });

  await page.route("**/experiments/*/commands", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const request = route.request();
    const body = request.postDataJSON() as CommandRecord;
    commands.push(body);
    experiment = applyCommand(experiment, body.type, body.payload);
    await fulfillJson(route, 200, experiment);
  });

  return { commands };
}
