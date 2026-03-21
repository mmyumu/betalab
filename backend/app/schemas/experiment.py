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


class ExperimentSchema(BaseModel):
    id: str
    scenario_id: str
    status: str
    molecule: MoleculeSchema
    containers: dict[str, ContainerSchema]
    rack: RackSchema
    runs: list[RunSchema]
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
    ]
    payload: dict = Field(default_factory=dict)
