import type { BenchSlot, LiquidCatalogItem, ToolCatalogItem, ToolbarCategory } from "@/types/workbench";

export const pesticideWorkflowCategories: ToolbarCategory[] = [
  {
    id: "prep_tools",
    label: "Preparation tools",
    description: "Bench containers used from extraction to cleanup before injection.",
    items: [
      {
        id: "centrifuge_tube_50ml",
        itemType: "tool",
        name: "50 mL centrifuge tube",
        subtitle: "QuEChERS extraction",
        description: "Receives apple sample and extraction solvent before salts and centrifugation.",
        accent: "amber",
        toolType: "centrifuge_tube",
        capacity_ml: 50,
        accepts_liquids: true,
      },
      {
        id: "cleanup_tube_dspe",
        itemType: "tool",
        name: "d-SPE cleanup tube",
        subtitle: "Matrix cleanup",
        description: "Collects the supernatant for dispersive SPE cleanup before final vialing.",
        accent: "emerald",
        toolType: "cleanup_tube",
        capacity_ml: 15,
        accepts_liquids: true,
      },
      {
        id: "sample_vial_lcms",
        itemType: "tool",
        name: "LC-MS/MS vial",
        subtitle: "Injection ready",
        description: "Final vial intended for the autosampler once the extract is clear.",
        accent: "sky",
        toolType: "sample_vial",
        capacity_ml: 2,
        accepts_liquids: true,
      },
      {
        id: "beaker_rinse",
        itemType: "tool",
        name: "Bench beaker",
        subtitle: "Temporary holding",
        description: "Open vessel for rinse, discard, or intermediate handling on the bench.",
        accent: "rose",
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
        itemType: "liquid",
        name: "Ultrapure water",
        subtitle: "Rinse / dilution",
        description: "Support liquid for rinsing or simple dilution during setup.",
        accent: "sky",
        liquidType: "ultrapure_water",
        transfer_volume_ml: 5,
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
  { id: "station_3", label: "Station 3", tool: null },
  { id: "station_4", label: "Station 4", tool: null },
];
