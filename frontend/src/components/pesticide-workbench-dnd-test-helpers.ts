import {
  pesticideToolCatalog,
  pesticideWorkflowCategories,
} from "@/lib/pesticide-workflow-catalog";
import type { Experiment } from "@/types/experiment";
import type {
  BenchSlot,
  BenchToolInstance,
  ExperimentWorkspaceWidget,
  RackSlot,
  ToolbarItem,
  ToolCatalogItem,
  TrashToolEntry,
  WorkspaceWidgetType,
} from "@/types/workbench";
import { expect } from "vitest";

export type MockDataTransfer = {
  data: Map<string, string>;
  dropEffect: string;
  effectAllowed: string;
  types: string[];
  getData: (type: string) => string;
  setData: (type: string, value: string) => void;
};

export type DndTargetId =
  | "bench-slot-station_1"
  | "bench-slot-station_2"
  | "rack-illustration-slot-1"
  | "widget-workspace"
  | "trash-dropzone";

export type ExpectedCommand = {
  payload: unknown;
  type: string;
};

export type DndSourceCase = {
  availableTargets: DndTargetId[];
  buildExperiment: () => Experiment;
  expectRackWidget: boolean;
  id: string;
  label: string;
  openBasket: boolean;
  openTrash: boolean;
  sourceTestId: string;
  targetExpectations: Partial<
    Record<
      DndTargetId,
      {
        command: ExpectedCommand | null;
        compatible: boolean;
      }
    >
  >;
};

const workspaceWidgetItemToId = {
  autosampler_rack_widget: "rack",
  lc_msms_instrument_widget: "instrument",
} as const;

const toolbarItems = pesticideWorkflowCategories.flatMap((category) => category.items);
const toolItems = toolbarItems.filter((item): item is ToolCatalogItem => item.itemType === "tool");
const sampleVialItem = pesticideToolCatalog.sample_vial_lcms;

export const dndTargetCases: {
  assertDragOver: boolean;
  id: DndTargetId;
  label: string;
}[] = [
  { id: "bench-slot-station_1", label: "occupied station", assertDragOver: true },
  { id: "bench-slot-station_2", label: "empty station", assertDragOver: true },
  { id: "rack-illustration-slot-1", label: "rack slot", assertDragOver: true },
  { id: "widget-workspace", label: "workspace canvas", assertDragOver: false },
  { id: "trash-dropzone", label: "trash", assertDragOver: true },
];

export function createDataTransfer(): MockDataTransfer {
  const data = new Map<string, string>();
  const dataTransfer = {
    data,
    dropEffect: "copy",
    effectAllowed: "copy",
    types: [] as string[],
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => {
      data.set(type, value);
      dataTransfer.types = Array.from(data.keys());
    },
  };

  return dataTransfer;
}

function makeSlots(overrides: Partial<BenchSlot>[] = [], count = Math.max(2, overrides.length)): BenchSlot[] {
  const baseSlots: BenchSlot[] = Array.from({ length: count }, (_, index) => ({
    id: `station_${index + 1}`,
    label: `Station ${index + 1}`,
    tool: null,
  }));

  return baseSlots.map((slot, index) => ({
    ...slot,
    ...(overrides[index] ?? {}),
  }));
}

function makeRackSlots(overrides: Partial<RackSlot>[] = []): RackSlot[] {
  const baseSlots: RackSlot[] = Array.from({ length: 12 }, (_, index) => ({
    id: `rack_slot_${index + 1}`,
    label: `Position ${index + 1}`,
    tool: null,
  }));

  return baseSlots.map((slot, index) => ({
    ...slot,
    ...(overrides[index] ?? {}),
  }));
}

function makeWorkspaceWidgets(
  overrides: Partial<ExperimentWorkspaceWidget>[] = [],
): ExperimentWorkspaceWidget[] {
  const baseWidgets: ExperimentWorkspaceWidget[] = [
    {
      id: "workbench",
      widgetType: "workbench",
      label: "Workbench",
      x: 234,
      y: 0,
      isPresent: true,
      isTrashed: false,
      trashable: false,
    },
    {
      id: "trash",
      widgetType: "trash",
      label: "Trash",
      x: 1530,
      y: 0,
      isPresent: true,
      isTrashed: false,
      trashable: false,
    },
    {
      id: "rack",
      widgetType: "autosampler_rack",
      label: "Autosampler rack",
      x: 234,
      y: 886,
      isPresent: true,
      isTrashed: false,
      trashable: true,
    },
    {
      id: "instrument",
      widgetType: "lc_msms_instrument",
      label: "LC-MS/MS",
      x: 812,
      y: 886,
      isPresent: false,
      isTrashed: false,
      trashable: true,
    },
    {
      id: "basket",
      widgetType: "produce_basket",
      label: "Produce basket",
      x: 1460,
      y: 248,
      isPresent: true,
      isTrashed: false,
      trashable: false,
    },
  ];

  return baseWidgets.map((widget, index) => ({
    ...widget,
    ...(overrides[index] ?? {}),
  }));
}

function makeTool(item: ToolCatalogItem, overrides: Partial<BenchToolInstance> = {}): BenchToolInstance {
  return {
    id: "bench_tool_1",
    toolId: item.id,
    label: item.name,
    subtitle: item.subtitle,
    accent: item.accent,
    toolType: item.toolType,
    capacity_ml: item.capacity_ml,
    accepts_liquids: item.accepts_liquids,
    produceLots: [],
    trashable: item.trashable,
    liquids: [],
    ...overrides,
  };
}

function makeTrashToolEntry(item: ToolCatalogItem): TrashToolEntry {
  return {
    id: "trash_tool_1",
    originLabel: "Station 1",
    tool: makeTool(item),
  };
}

function makeExperiment({
  slots = makeSlots(),
  rackSlots = makeRackSlots(),
  trashTools = [],
  produceLots = [],
  workspaceWidgets = makeWorkspaceWidgets(),
}: {
  slots?: BenchSlot[];
  rackSlots?: RackSlot[];
  trashTools?: TrashToolEntry[];
  produceLots?: Experiment["workspace"]["produceLots"];
  workspaceWidgets?: ExperimentWorkspaceWidget[];
} = {}): Experiment {
  return {
    id: "experiment_pesticides",
    status: "preparing",
    workbench: { slots },
    rack: { slots: rackSlots },
    trash: { tools: trashTools },
    workspace: { produceLots, widgets: workspaceWidgets },
    audit_log: ["Experiment created", "Start by dragging an extraction tool onto the bench."],
  };
}

function createPaletteSourceCase(item: ToolbarItem): DndSourceCase {
  const widgetId =
    item.itemType === "workspace_widget"
      ? workspaceWidgetItemToId[item.id as keyof typeof workspaceWidgetItemToId]
      : null;

  return {
    id: `palette-${item.id}`,
    label: `palette ${item.name}`,
    sourceTestId: `toolbar-item-${item.id}`,
    openBasket: false,
    openTrash: false,
    expectRackWidget: true,
    availableTargets: [
      "bench-slot-station_1",
      "bench-slot-station_2",
      "rack-illustration-slot-1",
      "widget-workspace",
      "trash-dropzone",
    ],
    buildExperiment: () =>
      makeExperiment({
        slots: makeSlots([{ tool: makeTool(sampleVialItem) }]),
      }),
    targetExpectations: {
      "bench-slot-station_1": {
        compatible: item.itemType === "liquid",
        command:
          item.itemType === "liquid"
            ? {
                type: "add_liquid_to_workbench_tool",
                payload: {
                  slot_id: "station_1",
                  liquid_id: item.id,
                },
              }
            : null,
      },
      "bench-slot-station_2": {
        compatible: item.itemType === "tool",
        command:
          item.itemType === "tool"
            ? {
                type: "place_tool_on_workbench",
                payload: {
                  slot_id: "station_2",
                  tool_id: item.id,
                },
              }
            : null,
      },
      "rack-illustration-slot-1": {
        compatible: item.itemType === "tool" && item.toolType === "sample_vial",
        command:
          item.itemType === "tool" && item.toolType === "sample_vial"
            ? {
                type: "place_tool_in_rack_slot",
                payload: {
                  rack_slot_id: "rack_slot_1",
                  tool_id: item.id,
                },
              }
            : null,
      },
      "widget-workspace": {
        compatible: item.itemType === "workspace_widget",
        command:
          item.itemType === "workspace_widget" && widgetId
            ? {
                type: "add_workspace_widget",
                payload: expect.objectContaining({ widget_id: widgetId }),
              }
            : null,
      },
      "trash-dropzone": {
        compatible: false,
        command: null,
      },
    },
  };
}

function createWorkbenchToolSourceCase(item: ToolCatalogItem): DndSourceCase {
  return {
    id: `workbench-${item.id}`,
    label: `workbench ${item.name}`,
    sourceTestId: "bench-tool-card-bench_tool_1",
    openBasket: false,
    openTrash: false,
    expectRackWidget: true,
    availableTargets: [
      "bench-slot-station_1",
      "bench-slot-station_2",
      "rack-illustration-slot-1",
      "widget-workspace",
      "trash-dropzone",
    ],
    buildExperiment: () =>
      makeExperiment({
        slots: makeSlots([{ tool: makeTool(item) }]),
      }),
    targetExpectations: {
      "bench-slot-station_1": {
        compatible: false,
        command: null,
      },
      "bench-slot-station_2": {
        compatible: true,
        command: {
          type: "move_tool_between_workbench_slots",
          payload: {
            source_slot_id: "station_1",
            target_slot_id: "station_2",
          },
        },
      },
      "rack-illustration-slot-1": {
        compatible: item.toolType === "sample_vial",
        command:
          item.toolType === "sample_vial"
            ? {
                type: "place_workbench_tool_in_rack_slot",
                payload: {
                  source_slot_id: "station_1",
                  rack_slot_id: "rack_slot_1",
                },
              }
            : null,
      },
      "widget-workspace": {
        compatible: false,
        command: null,
      },
      "trash-dropzone": {
        compatible: true,
        command: {
          type: "discard_workbench_tool",
          payload: {
            slot_id: "station_1",
          },
        },
      },
    },
  };
}

function createRackSourceCase(): DndSourceCase {
  return {
    id: "rack-sample_vial",
    label: "rack autosampler vial",
    sourceTestId: "rack-slot-tool-1",
    openBasket: false,
    openTrash: false,
    expectRackWidget: true,
    availableTargets: [
      "bench-slot-station_1",
      "bench-slot-station_2",
      "rack-illustration-slot-1",
      "widget-workspace",
      "trash-dropzone",
    ],
    buildExperiment: () =>
      makeExperiment({
        slots: makeSlots([{ tool: makeTool(sampleVialItem) }]),
        rackSlots: makeRackSlots([{ tool: makeTool(sampleVialItem) }]),
      }),
    targetExpectations: {
      "bench-slot-station_1": {
        compatible: false,
        command: null,
      },
      "bench-slot-station_2": {
        compatible: true,
        command: {
          type: "remove_rack_tool_to_workbench_slot",
          payload: {
            rack_slot_id: "rack_slot_1",
            target_slot_id: "station_2",
          },
        },
      },
      "rack-illustration-slot-1": {
        compatible: false,
        command: null,
      },
      "widget-workspace": {
        compatible: false,
        command: null,
      },
      "trash-dropzone": {
        compatible: true,
        command: {
          type: "discard_rack_tool",
          payload: {
            rack_slot_id: "rack_slot_1",
          },
        },
      },
    },
  };
}

function createTrashToolSourceCase(item: ToolCatalogItem): DndSourceCase {
  return {
    id: `trash-tool-${item.id}`,
    label: `trash ${item.name}`,
    sourceTestId: "trash-tool-trash_tool_1",
    openBasket: false,
    openTrash: true,
    expectRackWidget: true,
    availableTargets: [
      "bench-slot-station_1",
      "bench-slot-station_2",
      "rack-illustration-slot-1",
      "widget-workspace",
      "trash-dropzone",
    ],
    buildExperiment: () =>
      makeExperiment({
        slots: makeSlots([{ tool: makeTool(sampleVialItem) }]),
        trashTools: [makeTrashToolEntry(item)],
      }),
    targetExpectations: {
      "bench-slot-station_1": {
        compatible: false,
        command: null,
      },
      "bench-slot-station_2": {
        compatible: true,
        command: {
          type: "restore_trashed_tool_to_workbench_slot",
          payload: {
            target_slot_id: "station_2",
            trash_tool_id: "trash_tool_1",
          },
        },
      },
      "rack-illustration-slot-1": {
        compatible: item.toolType === "sample_vial",
        command:
          item.toolType === "sample_vial"
            ? {
                type: "restore_trashed_tool_to_rack_slot",
                payload: {
                  rack_slot_id: "rack_slot_1",
                  trash_tool_id: "trash_tool_1",
                },
              }
            : null,
      },
      "widget-workspace": {
        compatible: false,
        command: null,
      },
      "trash-dropzone": {
        compatible: false,
        command: null,
      },
    },
  };
}

function createTrashWidgetSourceCase(
  widgetId: "rack" | "instrument" | "basket",
  widgetType: WorkspaceWidgetType,
  label: string,
): DndSourceCase {
  const rackIsPresent = widgetId !== "rack";

  return {
    id: `trash-widget-${widgetId}`,
    label: `trash ${label}`,
    sourceTestId: `trash-widget-${widgetId}`,
    openBasket: false,
    openTrash: true,
    expectRackWidget: rackIsPresent,
    availableTargets: rackIsPresent
      ? [
          "bench-slot-station_1",
          "bench-slot-station_2",
          "rack-illustration-slot-1",
          "widget-workspace",
          "trash-dropzone",
        ]
      : [
          "bench-slot-station_1",
          "bench-slot-station_2",
          "widget-workspace",
          "trash-dropzone",
        ],
    buildExperiment: () =>
      makeExperiment({
        slots: makeSlots([{ tool: makeTool(sampleVialItem) }]),
        workspaceWidgets: makeWorkspaceWidgets([
          {},
          {},
          widgetId === "rack"
            ? { isPresent: false, isTrashed: true }
            : { isPresent: true, isTrashed: false },
          widgetId === "instrument"
            ? { isPresent: false, isTrashed: true }
            : {},
          widgetId === "basket"
            ? { isPresent: false, isTrashed: true }
            : {},
        ]),
      }),
    targetExpectations: {
      "bench-slot-station_1": {
        compatible: false,
        command: null,
      },
      "bench-slot-station_2": {
        compatible: false,
        command: null,
      },
      "rack-illustration-slot-1": {
        compatible: false,
        command: null,
      },
      "widget-workspace": {
        compatible: true,
        command: {
          type: "add_workspace_widget",
          payload: expect.objectContaining({ widget_id: widgetId }),
        },
      },
      "trash-dropzone": {
        compatible: false,
        command: null,
      },
    },
  };
}

function createBasketProduceSourceCase(): DndSourceCase {
  const sampleBagItem = pesticideToolCatalog.sealed_sampling_bag;

  return {
    id: "basket-produce-lot-apple",
    label: "basket apple lot",
    sourceTestId: "basket-produce-produce_1",
    openBasket: true,
    openTrash: false,
    expectRackWidget: true,
    availableTargets: [
      "bench-slot-station_1",
      "bench-slot-station_2",
      "rack-illustration-slot-1",
      "widget-workspace",
      "trash-dropzone",
    ],
    buildExperiment: () =>
      makeExperiment({
        slots: makeSlots([
          { tool: makeTool(sampleBagItem, { id: "bench_tool_bag" }) },
        ]),
        produceLots: [
          {
            id: "produce_1",
            label: "Apple lot 1",
            produceType: "apple",
            totalMassG: 2450,
            unitCount: 12,
          },
        ],
        workspaceWidgets: makeWorkspaceWidgets(),
      }),
    targetExpectations: {
      "bench-slot-station_1": {
        compatible: true,
        command: {
          type: "add_produce_lot_to_workbench_tool",
          payload: {
            slot_id: "station_1",
            produce_lot_id: "produce_1",
          },
        },
      },
      "bench-slot-station_2": {
        compatible: false,
        command: null,
      },
      "rack-illustration-slot-1": {
        compatible: false,
        command: null,
      },
      "widget-workspace": {
        compatible: false,
        command: null,
      },
      "trash-dropzone": {
        compatible: false,
        command: null,
      },
    },
  };
}

export const dndSourceCases: DndSourceCase[] = [
  ...toolbarItems.map(createPaletteSourceCase),
  ...toolItems.map(createWorkbenchToolSourceCase),
  createBasketProduceSourceCase(),
  createRackSourceCase(),
  ...toolItems.map(createTrashToolSourceCase),
  createTrashWidgetSourceCase("rack", "autosampler_rack", "Autosampler rack"),
  createTrashWidgetSourceCase("instrument", "lc_msms_instrument", "LC-MS/MS"),
];
