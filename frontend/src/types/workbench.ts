export type ToolbarAccent = "amber" | "emerald" | "rose" | "sky";
export type DropTargetType = "workbench_slot" | "workspace_canvas" | "rack_slot" | "trash_bin";

type ToolbarBaseItem = {
  allowedDropTargets: DropTargetType[];
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: ToolbarAccent;
};

export type ToolType =
  | "volumetric_flask"
  | "amber_bottle"
  | "sample_vial"
  | "beaker"
  | "centrifuge_tube"
  | "cleanup_tube"
  | "sample_bag";

export type LiquidType = "ultrapure_water" | "acetonitrile" | "methanol" | "formic_acid" | "matrix_blank" | "apple_extract";

export type WorkspaceWidgetType = "autosampler_rack" | "lc_msms_instrument" | "produce_basket";
export type ExperimentWorkspaceWidgetId = "workbench" | "trash" | "rack" | "instrument" | "basket";
export type ExperimentWorkspaceWidgetType = "workbench" | "trash" | WorkspaceWidgetType;
export type ProduceLotType = "apple";
export type DragEntityKind =
  | "tool"
  | "liquid"
  | "workspace_widget"
  | "produce"
  | "sample_label";
export type DragSourceKind = "palette" | "workbench" | "rack" | "trash" | "basket";

export type ToolCatalogItem = ToolbarBaseItem & {
  itemType: "tool";
  toolType: ToolType;
  capacity_ml: number;
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

export type SampleLabelCatalogItem = ToolbarBaseItem & {
  itemType: "sample_label";
};

export type ToolbarItem =
  | ToolCatalogItem
  | LiquidCatalogItem
  | WorkspaceWidgetCatalogItem
  | SampleLabelCatalogItem;

export type ToolbarCategory = {
  id: string;
  label: string;
  description: string;
  items: ToolbarItem[];
};

type BaseDragPayload = {
  allowedDropTargets: DropTargetType[];
  entityKind: DragEntityKind;
  sourceId: string;
  sourceKind: DragSourceKind;
};

export type ToolbarDragPayload =
  | (BaseDragPayload & {
      entityKind: "tool";
      itemId: string;
      itemType: "tool";
      sourceId: string;
      sourceKind: "palette";
      toolType: ToolType;
    })
  | (BaseDragPayload & {
      entityKind: "liquid";
      itemId: string;
      itemType: "liquid";
      liquidType: LiquidType;
      sourceId: string;
      sourceKind: "palette";
    })
  | (BaseDragPayload & {
      entityKind: "workspace_widget";
      itemId: string;
      itemType: "workspace_widget";
      sourceId: string;
      sourceKind: "palette";
      widgetType: WorkspaceWidgetType;
    })
  | (BaseDragPayload & {
      entityKind: "sample_label";
      itemId: string;
      itemType: "sample_label";
      sourceId: string;
      sourceKind: "palette";
    });

export type SampleLabelDragPayload = BaseDragPayload & {
  entityKind: "sample_label";
  sampleLabelId: string;
  sampleLabelText: string;
  sourceId: string;
  sourceKind: "workbench" | "trash";
  sourceSlotId?: string;
  trashSampleLabelId?: string;
};

export type ProduceDragPayload = BaseDragPayload & {
  entityKind: "produce";
  produceLotId: string;
  produceType: ProduceLotType;
  sourceId: string;
  sourceKind: "basket" | "workbench" | "trash";
  sourceSlotId?: string;
  trashProduceLotId?: string;
};

export type BenchToolDragPayload = BaseDragPayload & {
  entityKind: "tool";
  sourceSlotId: string;
  sourceId: string;
  sourceKind: "workbench";
  toolId: string;
  toolType: ToolType;
};

export type RackToolDragPayload = BaseDragPayload & {
  entityKind: "tool";
  rackSlotId: string;
  sourceId: string;
  sourceKind: "rack";
  toolId: string;
  toolType: ToolType;
};

export type TrashToolDragPayload = BaseDragPayload & {
  entityKind: "tool";
  sourceId: string;
  sourceKind: "trash";
  toolId: string;
  toolType: ToolType;
  trashToolId: string;
};

export type WorkspaceWidgetDragPayload = BaseDragPayload & {
  entityKind: "workspace_widget";
  sourceId: string;
  sourceKind: "trash";
  widgetId: ExperimentWorkspaceWidgetId;
  widgetType: ExperimentWorkspaceWidgetType;
};

export type DragDescriptor =
  | (BaseDragPayload & {
      entityKind: "tool";
      toolId: string;
      toolType: ToolType;
    })
  | (BaseDragPayload & {
      entityKind: "liquid";
      liquidId: string;
      liquidType: LiquidType;
    })
  | (BaseDragPayload & {
      entityKind: "workspace_widget";
      widgetId: string;
      widgetType: ExperimentWorkspaceWidgetType | WorkspaceWidgetType;
    })
  | (BaseDragPayload & {
      entityKind: "sample_label";
      sampleLabelId: string;
      sampleLabelText?: string;
      sourceSlotId?: string;
      trashSampleLabelId?: string;
    })
  | (BaseDragPayload & {
      entityKind: "produce";
      produceLotId: string;
      produceType: ProduceLotType;
      sourceSlotId?: string;
      trashProduceLotId?: string;
    });

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
  sampleLabelText?: string | null;
  produceLots?: ExperimentProduceLot[];
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

export type TrashProduceLotEntry = {
  id: string;
  originLabel: string;
  produceLot: ExperimentProduceLot;
};

export type TrashSampleLabelEntry = {
  id: string;
  originLabel: string;
  sampleLabelText: string;
};

export type ExperimentWorkspaceWidget = {
  id: ExperimentWorkspaceWidgetId;
  widgetType: ExperimentWorkspaceWidgetType;
  label: string;
  x: number;
  y: number;
  isPresent: boolean;
  isTrashed: boolean;
};

export type ExperimentProduceLot = {
  id: string;
  label: string;
  produceType: ProduceLotType;
  totalMassG: number;
  unitCount: number | null;
};
