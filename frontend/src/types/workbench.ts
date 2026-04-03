export type ToolbarAccent = "amber" | "emerald" | "rose" | "sky";
export type DropTargetType =
  | "workbench_slot"
  | "sample_bag_tool"
  | "workspace_canvas"
  | "rack_slot"
  | "trash_bin"
  | "grinder_widget"
  | "gross_balance_widget";

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
  | "cutting_board"
  | "sample_bag"
  | "storage_jar";

export type LiquidType =
  | "ultrapure_water"
  | "acetonitrile"
  | "methanol"
  | "formic_acid"
  | "matrix_blank"
  | "apple_extract"
  | "dry_ice_pellets";

export type WorkspaceWidgetType =
  | "autosampler_rack"
  | "lc_msms_instrument"
  | "cryogenic_grinder"
  | "produce_basket"
  | "lims_terminal"
  | "gross_balance";
export type ExperimentWorkspaceWidgetId =
  | "workbench"
  | "trash"
  | "rack"
  | "instrument"
  | "grinder"
  | "basket"
  | "lims"
  | "gross_balance";
export type ExperimentWorkspaceWidgetType = "workbench" | "trash" | WorkspaceWidgetType;
export type WidgetAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type ProduceLotType = "apple";
export type ProduceCutState = "whole" | "cut" | "ground" | "waste";
export type DragEntityKind =
  | "tool"
  | "liquid"
  | "workspace_widget"
  | "produce"
  | "sample_label"
  | "lims_label_ticket";
export type DragSourceKind =
  | "palette"
  | "debug_palette"
  | "workbench"
  | "rack"
  | "trash"
  | "basket"
  | "grinder"
  | "gross_balance"
  | "lims";

export type DebugProducePresetId = "apple_powder_residual_co2";

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

export type LimsLabelTicketDragPayload = BaseDragPayload & {
  entityKind: "lims_label_ticket";
  sourceId: string;
  sourceKind: "lims";
  ticketId: string;
  sampleCode: string;
  labelText: string;
};

export type ProduceDragPayload = BaseDragPayload & {
  debugProducePresetId?: DebugProducePresetId;
  entityKind: "produce";
  produceLotId: string;
  produceType: ProduceLotType;
  sourceId: string;
  sourceKind: "basket" | "workbench" | "trash" | "grinder" | "gross_balance" | "debug_palette";
  sourceSlotId?: string;
  trashProduceLotId?: string;
};

export type WorkspaceLiquidDragPayload = BaseDragPayload & {
  entityKind: "liquid";
  liquidEntryId: string;
  liquidType: LiquidType;
  sourceId: string;
  sourceKind: "grinder";
  widgetId: "grinder";
};

export type BenchToolDragPayload = BaseDragPayload & {
  entityKind: "tool";
  sourceSlotId: string;
  sourceId: string;
  sourceKind: "workbench";
  toolId: string;
  toolType: ToolType;
};

export type BasketToolDragPayload = BaseDragPayload & {
  entityKind: "tool";
  sourceId: string;
  sourceKind: "basket";
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

export type GrossBalanceToolDragPayload = BaseDragPayload & {
  entityKind: "tool";
  sourceId: string;
  sourceKind: "gross_balance";
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
      liquidEntryId?: string;
      widgetId?: "grinder";
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
      entityKind: "lims_label_ticket";
      ticketId: string;
      sampleCode: string;
      labelText: string;
    })
  | (BaseDragPayload & {
      entityKind: "produce";
      debugProducePresetId?: DebugProducePresetId;
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
  isSealed?: boolean;
  closureFault?: string | null;
  fieldLabelText?: string | null;
  sampleLabelText?: string | null;
  sampleLabelReceivedDate?: string | null;
  produceLots?: ExperimentProduceLot[];
  liquids: BenchLiquidPortion[];
};

export type BenchSlot = {
  id: string;
  label: string;
  surfaceProduceLots?: ExperimentProduceLot[];
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

export type PrintedLabelTicket = {
  id: string;
  sampleCode: string;
  labelText: string;
  receivedDate: string;
};

export type LimsReception = {
  id: string | null;
  orchardName: string;
  harvestDate: string;
  indicativeMassG: number;
  measuredGrossMassG: number | null;
  labSampleCode: string | null;
  status: "awaiting_reception" | "awaiting_label_application" | "received";
  printedLabelTicket: PrintedLabelTicket | null;
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
  anchor: WidgetAnchor;
  offsetX: number;
  offsetY: number;
  grinderRunDurationMs?: number;
  grinderRunRemainingMs?: number;
  grinderFault?: string | null;
  x?: number;
  y?: number;
  isPresent: boolean;
  isTrashed: boolean;
  tool?: BenchToolInstance | null;
  produceLots?: ExperimentProduceLot[];
  liquids?: BenchLiquidPortion[];
};

export type ExperimentProduceLot = {
  cutState?: ProduceCutState;
  grindQualityLabel?: string | null;
  homogeneityScore?: number | null;
  id: string;
  isContaminated?: boolean;
  label: string;
  produceType: ProduceLotType;
  residualCo2MassG?: number;
  temperatureC?: number;
  totalMassG: number;
  unitCount: number | null;
};
