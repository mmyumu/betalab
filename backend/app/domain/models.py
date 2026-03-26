from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4


class ExperimentStatus(str, Enum):
    PREPARING = "preparing"


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
    sample_label_text: str | None = None
    produce_lots: list["ProduceLot"] = field(default_factory=list)
    liquids: list[WorkbenchLiquid] = field(default_factory=list)


@dataclass
class WorkbenchSlot:
    id: str
    label: str
    tool: WorkbenchTool | None = None
    surface_produce_lots: list["ProduceLot"] = field(default_factory=list)


@dataclass
class Workbench:
    slots: list[WorkbenchSlot] = field(default_factory=list)


@dataclass
class RackSlot:
    id: str
    label: str
    tool: WorkbenchTool | None = None


@dataclass
class Rack:
    slots: list[RackSlot] = field(default_factory=list)


@dataclass
class TrashToolEntry:
    id: str
    origin_label: str
    tool: WorkbenchTool


@dataclass
class TrashProduceLotEntry:
    id: str
    origin_label: str
    produce_lot: "ProduceLot"


@dataclass
class TrashSampleLabelEntry:
    id: str
    origin_label: str
    sample_label_text: str


@dataclass
class Trash:
    tools: list[TrashToolEntry] = field(default_factory=list)
    produce_lots: list[TrashProduceLotEntry] = field(default_factory=list)
    sample_labels: list[TrashSampleLabelEntry] = field(default_factory=list)


@dataclass
class WorkspaceWidget:
    id: str
    widget_type: str
    label: str
    x: int
    y: int
    is_present: bool
    is_trashed: bool


@dataclass
class ProduceLot:
    id: str
    label: str
    produce_type: str
    total_mass_g: float
    unit_count: int | None = None
    is_contaminated: bool = False
    cut_state: str = "whole"


@dataclass
class Workspace:
    widgets: list[WorkspaceWidget] = field(default_factory=list)
    produce_lots: list[ProduceLot] = field(default_factory=list)


@dataclass
class Experiment:
    id: str
    status: ExperimentStatus
    workbench: Workbench
    rack: Rack
    trash: Trash
    workspace: Workspace
    audit_log: list[str] = field(default_factory=list)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"
