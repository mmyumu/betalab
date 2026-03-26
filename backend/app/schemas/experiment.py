from __future__ import annotations

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


class WorkbenchToolSchema(BaseModel):
    id: str
    tool_id: str
    label: str
    subtitle: str
    accent: str
    tool_type: str
    capacity_ml: float
    accepts_liquids: bool
    trashable: bool
    sample_label_text: str | None = None
    produce_lots: list[ProduceLotSchema]
    liquids: list[WorkbenchLiquidSchema]


class WorkbenchSlotSchema(BaseModel):
    id: str
    label: str
    tool: WorkbenchToolSchema | None = None


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


class TrashSchema(BaseModel):
    tools: list[TrashToolEntrySchema]
    produce_lots: list[TrashProduceLotEntrySchema]


class WorkspaceWidgetSchema(BaseModel):
    id: str
    widget_type: str
    label: str
    x: int
    y: int
    is_present: bool
    is_trashed: bool
    trashable: bool


class WorkspaceSchema(BaseModel):
    widgets: list[WorkspaceWidgetSchema]
    produce_lots: list[ProduceLotSchema]


class ExperimentSchema(BaseModel):
    id: str
    status: str
    workbench: WorkbenchSchema
    rack: RackSchema
    trash: TrashSchema
    workspace: WorkspaceSchema
    audit_log: list[str]


class ExperimentCommandEnvelope(BaseModel):
    type: Literal[
        "add_workbench_slot",
        "remove_workbench_slot",
        "place_tool_on_workbench",
        "move_tool_between_workbench_slots",
        "discard_workbench_tool",
        "discard_tool_from_palette",
        "restore_trashed_tool_to_workbench_slot",
        "add_workspace_widget",
        "move_workspace_widget",
        "discard_workspace_widget",
        "create_produce_lot",
        "discard_workspace_produce_lot",
        "place_tool_in_rack_slot",
        "place_workbench_tool_in_rack_slot",
        "remove_rack_tool_to_workbench_slot",
        "discard_rack_tool",
        "restore_trashed_tool_to_rack_slot",
        "add_liquid_to_workbench_tool",
        "add_produce_lot_to_workbench_tool",
        "discard_produce_lot_from_workbench_tool",
        "move_produce_lot_between_workbench_tools",
        "restore_trashed_produce_lot_to_workbench_tool",
        "remove_liquid_from_workbench_tool",
        "update_workbench_liquid_volume",
        "apply_sample_label_to_workbench_tool",
        "update_workbench_tool_sample_label_text",
    ]
    payload: dict = Field(default_factory=dict)
