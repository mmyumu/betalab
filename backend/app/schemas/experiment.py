from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

class WorkbenchLiquidSchema(BaseModel):
    id: str
    liquid_id: str
    name: str
    volume_ml: float
    accent: str


class WorkbenchToolSchema(BaseModel):
    id: str
    tool_id: str
    label: str
    subtitle: str
    accent: str
    tool_type: str
    capacity_ml: float
    accepts_liquids: bool
    liquids: list[WorkbenchLiquidSchema]


class WorkbenchSlotSchema(BaseModel):
    id: str
    label: str
    tool: WorkbenchToolSchema | None = None


class WorkbenchSchema(BaseModel):
    slots: list[WorkbenchSlotSchema]


class ExperimentSchema(BaseModel):
    id: str
    status: str
    workbench: WorkbenchSchema
    audit_log: list[str]


class ExperimentCommandEnvelope(BaseModel):
    type: Literal[
        "place_tool_on_workbench",
        "add_liquid_to_workbench_tool",
        "update_workbench_liquid_volume",
    ]
    payload: dict = Field(default_factory=dict)
