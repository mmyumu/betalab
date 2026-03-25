import { getToolDropTargets } from "@/lib/tool-drop-targets";
import type { BenchSlot, LiquidCatalogItem, ToolCatalogItem, ToolbarCategory } from "@/types/workbench";

export const pesticideWorkflowCategories: ToolbarCategory[] = [
  {
    id: "prep_tools",
    label: "Preparation tools",
    description: "Bench containers used from extraction to cleanup before injection.",
    items: [
      {
        id: "centrifuge_tube_50ml",
        allowedDropTargets: getToolDropTargets("centrifuge_tube"),
        itemType: "tool",
        name: "50 mL centrifuge tube",
        subtitle: "QuEChERS extraction",
        description: "Receives apple sample and extraction solvent before salts and centrifugation.",
        accent: "amber",
        trashable: true,
        toolType: "centrifuge_tube",
        capacity_ml: 50,
        accepts_liquids: true,
      },
      {
        id: "cleanup_tube_dspe",
        allowedDropTargets: getToolDropTargets("cleanup_tube"),
        itemType: "tool",
        name: "d-SPE cleanup tube",
        subtitle: "Matrix cleanup",
        description: "Collects the supernatant for dispersive SPE cleanup before final vialing.",
        accent: "emerald",
        trashable: true,
        toolType: "cleanup_tube",
        capacity_ml: 15,
        accepts_liquids: true,
      },
      {
        id: "sample_vial_lcms",
        allowedDropTargets: getToolDropTargets("sample_vial"),
        itemType: "tool",
        name: "Autosampler vial",
        subtitle: "Injection ready",
        description: "Standard autosampler vial used to load the final extract into the chromatograph.",
        accent: "sky",
        trashable: true,
        toolType: "sample_vial",
        capacity_ml: 2,
        accepts_liquids: true,
      },
      {
        id: "beaker_rinse",
        allowedDropTargets: getToolDropTargets("beaker"),
        itemType: "tool",
        name: "Bench beaker",
        subtitle: "Temporary holding",
        description: "Open vessel for rinse, discard, or intermediate handling on the bench.",
        accent: "rose",
        trashable: true,
        toolType: "beaker",
        capacity_ml: 100,
        accepts_liquids: true,
      },
    ],
  },
  {
    id: "workflow_liquids",
    label: "Liquids",
    description: "Starting liquids for the first pesticide extraction simulation.",
    items: [
      {
        id: "acetonitrile_extraction",
        allowedDropTargets: ["workbench_slot"],
        itemType: "liquid",
        name: "Acetonitrile",
        subtitle: "Extraction solvent",
        description: "Primary extraction solvent used in the QuEChERS workflow.",
        accent: "amber",
        trashable: false,
        liquidType: "acetonitrile",
        transfer_volume_ml: 10,
      },
      {
        id: "apple_extract",
        allowedDropTargets: ["workbench_slot"],
        itemType: "liquid",
        name: "Apple extract",
        subtitle: "Homogenized sample",
        description: "Cryogenic apple homogenate represented as the incoming sample matrix.",
        accent: "rose",
        trashable: false,
        liquidType: "apple_extract",
        transfer_volume_ml: 10,
      },
      {
        id: "ultrapure_water_rinse",
        allowedDropTargets: ["workbench_slot"],
        itemType: "liquid",
        name: "Ultrapure water",
        subtitle: "Rinse / dilution",
        description: "Support liquid for rinsing or simple dilution during setup.",
        accent: "sky",
        trashable: false,
        liquidType: "ultrapure_water",
        transfer_volume_ml: 5,
      },
    ],
  },
  {
    id: "workspace_equipment",
    label: "Workspace equipment",
    description: "Large lab systems that can be dropped onto the open workspace canvas.",
    items: [
      {
        id: "autosampler_rack_widget",
        allowedDropTargets: ["workspace_canvas"],
        itemType: "workspace_widget",
        name: "Autosampler rack",
        subtitle: "Sequence staging",
        description: "Rack widget used to organize injection-ready vials before an LC-MS/MS run.",
        accent: "sky",
        trashable: true,
        widgetType: "autosampler_rack",
      },
      {
        id: "lc_msms_instrument_widget",
        allowedDropTargets: ["workspace_canvas"],
        itemType: "workspace_widget",
        name: "LC-MS/MS",
        subtitle: "Instrument system",
        description: "Pedagogical LC-MS/MS system widget with separate LC and MS/MS visual modules.",
        accent: "emerald",
        trashable: true,
        widgetType: "lc_msms_instrument",
      },
    ],
  },
  {
    id: "misc",
    label: "MISC",
    description: "Temporary catch-all for supporting lab items not yet grouped elsewhere.",
    items: [
      {
        id: "sealed_sampling_bag",
        allowedDropTargets: getToolDropTargets("sample_bag"),
        itemType: "tool",
        name: "Sealed sampling bag",
        subtitle: "Field collection",
        description: "Tamper-evident sample collection bag for sealed produce or field intake.",
        accent: "emerald",
        trashable: true,
        toolType: "sample_bag",
        capacity_ml: 500,
        accepts_liquids: false,
      },
    ],
  },
];

export const pesticideToolCatalog = Object.fromEntries(
  pesticideWorkflowCategories
    .flatMap((category) => category.items)
    .filter((item): item is ToolCatalogItem => item.itemType === "tool")
    .map((item) => [item.id, item]),
) satisfies Record<string, ToolCatalogItem>;

export const pesticideLiquidCatalog = Object.fromEntries(
  pesticideWorkflowCategories
    .flatMap((category) => category.items)
    .filter((item): item is LiquidCatalogItem => item.itemType === "liquid")
    .map((item) => [item.id, item]),
) satisfies Record<string, LiquidCatalogItem>;

export const initialWorkbenchSlots: BenchSlot[] = [
  { id: "station_1", label: "Station 1", tool: null },
  { id: "station_2", label: "Station 2", tool: null },
];
