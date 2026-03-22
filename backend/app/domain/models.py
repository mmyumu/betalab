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
class RackSlot:
    id: str
    label: str
    tool: WorkbenchTool | None = None


@dataclass
class Rack:
    slots: list[RackSlot] = field(default_factory=list)


@dataclass
class Experiment:
    id: str
    status: ExperimentStatus
    workbench: Workbench
    rack: Rack
    audit_log: list[str] = field(default_factory=list)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"
