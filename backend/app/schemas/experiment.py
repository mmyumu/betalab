from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

class WorkbenchLiquidSchema(BaseModel):
    id: str
    liquid_id: str
    name: str
    volume_ml: float
    accent: str


class ProduceLotSchema(BaseModel):
    id: str
    label: str
    produce_type: str
    total_mass_g: float
    unit_count: int | None = None
    is_contaminated: bool = False
    cut_state: str = "whole"
    temperature_c: float = 20.0


class WorkbenchToolSchema(BaseModel):
    id: str
    tool_id: str
    label: str
    subtitle: str
    accent: str
    tool_type: str
    capacity_ml: float
    sample_label_text: str | None = None
    produce_lots: list[ProduceLotSchema]
    liquids: list[WorkbenchLiquidSchema]


class WorkbenchSlotSchema(BaseModel):
    id: str
    label: str
    tool: WorkbenchToolSchema | None = None
    surface_produce_lots: list[ProduceLotSchema]


class WorkbenchSchema(BaseModel):
    slots: list[WorkbenchSlotSchema]


class RackSlotSchema(BaseModel):
    id: str
    label: str
    tool: WorkbenchToolSchema | None = None


class RackSchema(BaseModel):
    slots: list[RackSlotSchema]


class TrashToolEntrySchema(BaseModel):
    id: str
    origin_label: str
    tool: WorkbenchToolSchema


class TrashProduceLotEntrySchema(BaseModel):
    id: str
    origin_label: str
    produce_lot: ProduceLotSchema


class TrashSampleLabelEntrySchema(BaseModel):
    id: str
    origin_label: str
    sample_label_text: str


class TrashSchema(BaseModel):
    tools: list[TrashToolEntrySchema]
    produce_lots: list[TrashProduceLotEntrySchema]
    sample_labels: list[TrashSampleLabelEntrySchema]


class WorkspaceWidgetSchema(BaseModel):
    id: str
    widget_type: str
    label: str
    anchor: str
    offset_x: int
    offset_y: int
    is_present: bool
    is_trashed: bool
    produce_lots: list[ProduceLotSchema] = Field(default_factory=list)
    liquids: list[WorkbenchLiquidSchema] = Field(default_factory=list)


class WorkspaceSchema(BaseModel):
    widgets: list[WorkspaceWidgetSchema]
    produce_lots: list[ProduceLotSchema]


class ExperimentSchema(BaseModel):
    id: str
    status: str
    last_simulation_at: datetime
    snapshot_version: int
    workbench: WorkbenchSchema
    rack: RackSchema
    trash: TrashSchema
    workspace: WorkspaceSchema
    audit_log: list[str]


class LayoutPositionSchema(BaseModel):
    anchor: str
    offset_x: int
    offset_y: int


class WorkbenchToolPlacementSchema(BaseModel):
    tool_id: str


class WorkbenchSlotReferenceSchema(BaseModel):
    slot_id: str


class TargetWorkbenchSlotSchema(BaseModel):
    target_slot_id: str


class WorkbenchToolMoveSchema(BaseModel):
    target_slot_id: str


class WorkbenchToolLiquidCreateSchema(BaseModel):
    liquid_id: str
    volume_ml: float | None = None


class WorkbenchToolLiquidUpdateSchema(BaseModel):
    volume_ml: float


class WorkbenchToolSampleLabelUpdateSchema(BaseModel):
    sample_label_text: str


class WorkbenchToolSampleLabelMoveSchema(BaseModel):
    target_tool_id: str


class WorkbenchToolProduceLotCreateSchema(BaseModel):
    produce_lot_id: str


class WorkbenchProduceLotMoveSchema(BaseModel):
    source_slot_id: str
    target_slot_id: str


class PaletteToolDiscardSchema(BaseModel):
    tool_id: str


class RackToolPlacementSchema(BaseModel):
    tool_id: str


class RackWorkbenchPlacementSchema(BaseModel):
    source_slot_id: str


class RackToolMoveSchema(BaseModel):
    target_rack_slot_id: str


class RackToolMoveToWorkbenchSchema(BaseModel):
    target_slot_id: str


class TrashToolRestoreToWorkbenchSchema(BaseModel):
    target_slot_id: str


class TrashToolRestoreToRackSchema(BaseModel):
    rack_slot_id: str


class TrashProduceLotRestoreToWorkbenchSchema(BaseModel):
    target_slot_id: str


class TrashProduceLotRestoreToWidgetSchema(BaseModel):
    widget_id: str


class TrashSampleLabelRestoreSchema(BaseModel):
    target_tool_id: str


class WorkspaceWidgetCreateSchema(LayoutPositionSchema):
    widget_id: str


class WorkspaceWidgetMoveSchema(LayoutPositionSchema):
    pass


class WorkspaceWidgetLiquidCreateSchema(BaseModel):
    liquid_id: str
    volume_ml: float | None = None


class WorkspaceWidgetLiquidUpdateSchema(BaseModel):
    volume_ml: float


class WorkspaceProduceLotCreateSchema(BaseModel):
    produce_type: Literal["apple"]


class WorkspaceWidgetProduceLotCreateSchema(BaseModel):
    produce_lot_id: str


class WorkspaceWidgetMoveWorkbenchProduceLotSchema(BaseModel):
    source_slot_id: str
    produce_lot_id: str


class WorkspaceWidgetMoveProduceLotToWorkbenchSchema(BaseModel):
    target_slot_id: str
