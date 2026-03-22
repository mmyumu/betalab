from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TransitionSchema(BaseModel):
    id: str
    q1_mz: float
    q3_mz: float
    relative_response: float


class MoleculeSchema(BaseModel):
    id: str
    name: str
    retention_time_min: float
    response_factor: float
    expected_ion_ratio: float
    transitions: list[TransitionSchema]


class ContentPortionSchema(BaseModel):
    source_id: str
    source_type: str
    name: str
    volume_ml: float
    analyte_concentration_ng_ml: float
    matrix_effect_factor: float


class ContainerSchema(BaseModel):
    id: str
    kind: str
    label: str
    capacity_ml: float
    current_volume_ml: float
    contents: list[ContentPortionSchema]
    analyte_concentration_ng_ml: float = 0.0
    matrix_effect_factor: float = 1.0


class RackSchema(BaseModel):
    positions: dict[str, str | None]


class ChromatogramPointSchema(BaseModel):
    time_min: float
    intensity: float


class TransitionResultSchema(BaseModel):
    transition_id: str
    area: float
    height: float
    chromatogram_points: list[ChromatogramPointSchema]


class RunResultSchema(BaseModel):
    observed_retention_time: float
    transition_results: list[TransitionResultSchema]
    estimated_concentration_ng_ml: float
    warnings: list[str]


class RunSchema(BaseModel):
    id: str
    source_vial_id: str
    sample_type: str
    status: str
    result: RunResultSchema | None = None


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
    scenario_id: str
    status: str
    molecule: MoleculeSchema
    containers: dict[str, ContainerSchema]
    rack: RackSchema
    runs: list[RunSchema]
    workbench: WorkbenchSchema | None = None
    audit_log: list[str]


class CreateExperimentRequest(BaseModel):
    scenario_id: str = "lcmsms_single_analyte"


class ExperimentCommandEnvelope(BaseModel):
    type: Literal[
        "create_flask",
        "add_liquid",
        "transfer_to_vial",
        "place_vial_in_rack",
        "run_sequence",
        "place_tool_on_workbench",
        "add_liquid_to_workbench_tool",
        "update_workbench_liquid_volume",
    ]
    payload: dict = Field(default_factory=dict)
