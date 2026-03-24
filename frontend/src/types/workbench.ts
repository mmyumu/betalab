export type ToolbarAccent = "amber" | "emerald" | "rose" | "sky";
export type DropTargetType = "workbench_slot" | "workspace_canvas" | "rack_slot" | "trash_bin";

type ToolbarBaseItem = {
  allowedDropTargets: DropTargetType[];
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: ToolbarAccent;
  trashable: boolean;
};

export type ToolType = "volumetric_flask" | "amber_bottle" | "sample_vial" | "beaker" | "centrifuge_tube" | "cleanup_tube";

export type LiquidType = "ultrapure_water" | "acetonitrile" | "methanol" | "formic_acid" | "matrix_blank" | "apple_extract";

export type WorkspaceWidgetType = "autosampler_rack" | "lc_msms_instrument" | "produce_basket";
export type ExperimentWorkspaceWidgetId = "workbench" | "trash" | "rack" | "instrument" | "basket";
export type ExperimentWorkspaceWidgetType = "workbench" | "trash" | WorkspaceWidgetType;

export type ToolCatalogItem = ToolbarBaseItem & {
  itemType: "tool";
  toolType: ToolType;
  capacity_ml: number;
  accepts_liquids: boolean;
};

export type LiquidCatalogItem = ToolbarBaseItem & {
  itemType: "liquid";
  liquidType: LiquidType;
  transfer_volume_ml: number;
};

export type WorkspaceWidgetCatalogItem = ToolbarBaseItem & {
  itemType: "workspace_widget";
  widgetType: WorkspaceWidgetType;
};

export type ToolbarItem = ToolCatalogItem | LiquidCatalogItem | WorkspaceWidgetCatalogItem;

export type ToolbarCategory = {
  id: string;
  label: string;
  description: string;
  items: ToolbarItem[];
};

export type ToolbarDragPayload = {
  allowedDropTargets: DropTargetType[];
  itemId: string;
  itemType: ToolbarItem["itemType"];
};

export type BenchToolDragPayload = {
  allowedDropTargets: DropTargetType[];
  sourceSlotId: string;
  toolId: string;
  toolType: ToolType;
  trashable: boolean;
};

export type RackToolDragPayload = {
  allowedDropTargets: DropTargetType[];
  rackSlotId: string;
  toolId: string;
  toolType: ToolType;
  trashable: boolean;
};

export type TrashToolDragPayload = {
  allowedDropTargets: DropTargetType[];
  toolId: string;
  toolType: ToolType;
  trashToolId: string;
};

export type WorkspaceWidgetDragPayload = {
  allowedDropTargets: DropTargetType[];
  widgetId: ExperimentWorkspaceWidgetId;
  widgetType: ExperimentWorkspaceWidgetType;
};

export type BenchLiquidPortion = {
  id: string;
  liquidId: string;
  name: string;
  volume_ml: number;
  accent: ToolbarAccent;
};

export type BenchToolInstance = {
  id: string;
  toolId: string;
  label: string;
  subtitle: string;
  accent: ToolbarAccent;
  toolType: ToolType;
  capacity_ml: number;
  accepts_liquids: boolean;
  trashable: boolean;
  liquids: BenchLiquidPortion[];
};

export type BenchSlot = {
  id: string;
  label: string;
  tool: BenchToolInstance | null;
};

export type RackSlot = {
  id: string;
  label: string;
  tool: BenchToolInstance | null;
};

export type TrashToolEntry = {
  id: string;
  originLabel: string;
  tool: BenchToolInstance;
};

export type ExperimentWorkspaceWidget = {
  id: ExperimentWorkspaceWidgetId;
  widgetType: ExperimentWorkspaceWidgetType;
  label: string;
  x: number;
  y: number;
  isPresent: boolean;
  isTrashed: boolean;
  trashable: boolean;
};
