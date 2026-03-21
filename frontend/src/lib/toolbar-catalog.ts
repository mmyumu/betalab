import type { ToolbarCategory } from "@/types/workbench";

export const toolbarCategories: ToolbarCategory[] = [
  {
    id: "glassware",
    label: "Glassware",
    description: "Core containers for standards and samples.",
    items: [
      {
        id: "volumetric_flask",
        name: "Volumetric flask",
        subtitle: "100 mL calibration prep",
        description: "Build standard dilutions with a fixed final volume.",
        accent: "sky",
      },
      {
        id: "amber_bottle",
        name: "Amber bottle",
        subtitle: "Light-sensitive storage",
        description: "Hold stock solutions or reagents between prep steps.",
        accent: "amber",
      },
      {
        id: "sample_vial",
        name: "Sample vial",
        subtitle: "Autosampler ready",
        description: "Transfer the prepared solution into the rack sequence.",
        accent: "emerald",
      },
      {
        id: "beaker",
        name: "Beaker",
        subtitle: "Open handling vessel",
        description: "Useful for quick transfers, rinses, and waste collection.",
        accent: "rose",
      },
    ],
  },
  {
    id: "liquids",
    label: "Liquids",
    description: "Solvents and matrices available on the bench.",
    items: [
      {
        id: "ultrapure_water",
        name: "Ultrapure water",
        subtitle: "Aqueous phase",
        description: "Diluent and rinse solvent for low-organic preparations.",
        accent: "sky",
      },
      {
        id: "acetonitrile",
        name: "Acetonitrile",
        subtitle: "Organic modifier",
        description: "Common LC solvent for sample prep and rinsing.",
        accent: "amber",
      },
      {
        id: "methanol",
        name: "Methanol",
        subtitle: "Alternative organic solvent",
        description: "Useful for extraction or stronger wash steps.",
        accent: "emerald",
      },
      {
        id: "formic_acid",
        name: "Formic acid",
        subtitle: "0.1% acidifier",
        description: "Supports ionization and stabilizes acidic mobile phases.",
        accent: "rose",
      },
      {
        id: "matrix_blank",
        name: "Matrix blank",
        subtitle: "Control background",
        description: "Represents the biological matrix before analyte addition.",
        accent: "sky",
      },
    ],
  },
];
