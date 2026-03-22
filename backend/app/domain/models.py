from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4


class ExperimentStatus(str, Enum):
    PREPARING = "preparing"
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"


class ContainerKind(str, Enum):
    STOCK_BOTTLE = "stock_bottle"
    SOLVENT_BOTTLE = "solvent_bottle"
    MATRIX_BOTTLE = "matrix_bottle"
    FLASK = "flask"
    VIAL = "vial"


@dataclass
class Transition:
    id: str
    q1_mz: float
    q3_mz: float
    relative_response: float


@dataclass
class Molecule:
    id: str
    name: str
    retention_time_min: float
    response_factor: float
    expected_ion_ratio: float
    transitions: list[Transition]


@dataclass
class ContentPortion:
    source_id: str
    source_type: str
    name: str
    volume_ml: float
    analyte_concentration_ng_ml: float = 0.0
    matrix_effect_factor: float = 1.0


@dataclass
class Container:
    id: str
    kind: ContainerKind
    label: str
    capacity_ml: float
    current_volume_ml: float = 0.0
    contents: list[ContentPortion] = field(default_factory=list)


@dataclass
class Rack:
    positions: dict[str, str | None]


@dataclass
class ChromatogramPoint:
    time_min: float
    intensity: float


@dataclass
class TransitionResult:
    transition_id: str
    area: float
    height: float
    chromatogram_points: list[ChromatogramPoint]


@dataclass
class RunResult:
    observed_retention_time: float
    transition_results: list[TransitionResult]
    estimated_concentration_ng_ml: float
    warnings: list[str] = field(default_factory=list)


@dataclass
class Run:
    id: str
    source_vial_id: str
    sample_type: str
    status: str = "pending"
    result: RunResult | None = None


@dataclass
class WorkbenchLiquid:
    id: str
    liquid_id: str
    name: str
    volume_ml: float
    accent: str


@dataclass
class WorkbenchTool:
    id: str
    tool_id: str
    label: str
    subtitle: str
    accent: str
    tool_type: str
    capacity_ml: float
    accepts_liquids: bool
    liquids: list[WorkbenchLiquid] = field(default_factory=list)


@dataclass
class WorkbenchSlot:
    id: str
    label: str
    tool: WorkbenchTool | None = None


@dataclass
class Workbench:
    slots: list[WorkbenchSlot] = field(default_factory=list)


@dataclass
class Experiment:
    id: str
    scenario_id: str
    status: ExperimentStatus
    molecule: Molecule
    containers: dict[str, Container]
    rack: Rack
    runs: list[Run] = field(default_factory=list)
    workbench: Workbench | None = None
    audit_log: list[str] = field(default_factory=list)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"
