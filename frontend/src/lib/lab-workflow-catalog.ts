import { getLiquidDropTargets, getSampleLabelDropTargets, getToolDropTargets } from "@/lib/tool-drop-targets";
import type { BenchSlot, LiquidCatalogItem, ToolCatalogItem, ToolbarCategory } from "@/types/workbench";

export const labWorkflowCategories: ToolbarCategory[] = [
  {
    id: "prep_tools",
    label: "Containers",
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
        toolType: "centrifuge_tube",
        capacity_ml: 50,
      },
      {
        id: "cleanup_tube_dspe",
        allowedDropTargets: getToolDropTargets("cleanup_tube"),
        itemType: "tool",
        name: "d-SPE cleanup tube",
        subtitle: "Matrix cleanup",
        description: "Collects the supernatant for dispersive SPE cleanup before final vialing.",
        accent: "emerald",
        toolType: "cleanup_tube",
        capacity_ml: 15,
      },
      {
        id: "sample_vial_lcms",
        allowedDropTargets: getToolDropTargets("sample_vial"),
        itemType: "tool",
        name: "Autosampler vial",
        subtitle: "Injection ready",
        description: "Standard autosampler vial used to load the final extract into the chromatograph.",
        accent: "sky",
        toolType: "sample_vial",
        capacity_ml: 2,
      },
      {
        id: "beaker_rinse",
        allowedDropTargets: getToolDropTargets("beaker"),
        itemType: "tool",
        name: "Bench beaker",
        subtitle: "Temporary holding",
        description: "Open vessel for rinse, discard, or intermediate handling on the bench.",
        accent: "rose",
        toolType: "beaker",
        capacity_ml: 100,
      },
      {
        id: "cutting_board_hdpe",
        allowedDropTargets: getToolDropTargets("cutting_board"),
        itemType: "tool",
        name: "Cutting board",
        subtitle: "Prep surface",
        description: "Clean prep board used to stage apples before cutting.",
        accent: "amber",
        toolType: "cutting_board",
        capacity_ml: 0,
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
        allowedDropTargets: getLiquidDropTargets("acetonitrile"),
        itemType: "liquid",
        name: "Acetonitrile",
        subtitle: "Extraction solvent",
        description: "Primary extraction solvent used in the QuEChERS workflow.",
        accent: "amber",
        liquidType: "acetonitrile",
        transfer_volume_ml: 10,
      },
      {
        id: "apple_extract",
        allowedDropTargets: getLiquidDropTargets("apple_extract"),
        itemType: "liquid",
        name: "Apple extract",
        subtitle: "Homogenized sample",
        description: "Cryogenic apple homogenate represented as the incoming sample matrix.",
        accent: "rose",
        liquidType: "apple_extract",
        transfer_volume_ml: 10,
      },
      {
        id: "ultrapure_water_rinse",
        allowedDropTargets: getLiquidDropTargets("ultrapure_water"),
        itemType: "liquid",
        name: "Ultrapure water",
        subtitle: "Rinse / dilution",
        description: "Support liquid for rinsing or simple dilution during setup.",
        accent: "sky",
        liquidType: "ultrapure_water",
        transfer_volume_ml: 5,
      },
      {
        id: "dry_ice_pellets",
        allowedDropTargets: getLiquidDropTargets("dry_ice_pellets"),
        itemType: "liquid",
        name: "Dry ice pellets (CO2)",
        subtitle: "Cryogenic cooling",
        description: "Solid CO2 pellets used for chilled handling and cold-chain prep in the cryogenic grinder.",
        accent: "sky",
        liquidType: "dry_ice_pellets",
        transfer_volume_ml: 1000,
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
        allowedDropTargets: ["workspace_canvas", "trash_bin"],
        itemType: "workspace_widget",
        name: "Autosampler rack",
        subtitle: "Sequence staging",
        description: "Rack widget used to organize injection-ready vials before an LC-MS/MS run.",
        accent: "sky",
        widgetType: "autosampler_rack",
      },
      {
        id: "lc_msms_instrument_widget",
        allowedDropTargets: ["workspace_canvas", "trash_bin"],
        itemType: "workspace_widget",
        name: "LC-MS/MS",
        subtitle: "Instrument system",
        description: "Pedagogical LC-MS/MS system widget with separate LC and MS/MS visual modules.",
        accent: "emerald",
        widgetType: "lc_msms_instrument",
      },
      {
        id: "cryogenic_grinder_widget",
        allowedDropTargets: ["workspace_canvas", "trash_bin"],
        itemType: "workspace_widget",
        name: "Cryogenic grinder",
        subtitle: "Cold homogenization",
        description: "Benchtop grinder used to homogenize chilled produce before extraction.",
        accent: "amber",
        widgetType: "cryogenic_grinder",
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
        toolType: "sample_bag",
        capacity_ml: 500,
      },
      {
        id: "sampling_bag_label",
        allowedDropTargets: getSampleLabelDropTargets(),
        itemType: "sample_label",
        name: "Sampling label",
        subtitle: "Traceability",
        description: "Adhesive lot label for sampling bags before accessioning.",
        accent: "sky",
      },
    ],
  },
];

export const labToolCatalog = Object.fromEntries(
  labWorkflowCategories
    .flatMap((category) => category.items)
    .filter((item): item is ToolCatalogItem => item.itemType === "tool")
    .map((item) => [item.id, item]),
) satisfies Record<string, ToolCatalogItem>;

export const labLiquidCatalog = Object.fromEntries(
  labWorkflowCategories
    .flatMap((category) => category.items)
    .filter((item): item is LiquidCatalogItem => item.itemType === "liquid")
    .map((item) => [item.id, item]),
) satisfies Record<string, LiquidCatalogItem>;

export const initialWorkbenchSlots: BenchSlot[] = [
  { id: "station_1", label: "Station 1", tool: null },
  { id: "station_2", label: "Station 2", tool: null },
];
