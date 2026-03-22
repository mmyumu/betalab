from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WorkbenchToolDefinition:
    id: str
    name: str
    subtitle: str
    accent: str
    tool_type: str
    capacity_ml: float
    accepts_liquids: bool = True


@dataclass(frozen=True)
class WorkbenchLiquidDefinition:
    id: str
    name: str
    accent: str
    transfer_volume_ml: float


WORKBENCH_TOOLS = {
    "centrifuge_tube_50ml": WorkbenchToolDefinition(
        id="centrifuge_tube_50ml",
        name="50 mL centrifuge tube",
        subtitle="QuEChERS extraction",
        accent="amber",
        tool_type="centrifuge_tube",
        capacity_ml=50.0,
    ),
    "cleanup_tube_dspe": WorkbenchToolDefinition(
        id="cleanup_tube_dspe",
        name="d-SPE cleanup tube",
        subtitle="Matrix cleanup",
        accent="emerald",
        tool_type="cleanup_tube",
        capacity_ml=15.0,
    ),
    "sample_vial_lcms": WorkbenchToolDefinition(
        id="sample_vial_lcms",
        name="Autosampler vial",
        subtitle="Injection ready",
        accent="sky",
        tool_type="sample_vial",
        capacity_ml=2.0,
    ),
    "beaker_rinse": WorkbenchToolDefinition(
        id="beaker_rinse",
        name="Bench beaker",
        subtitle="Temporary holding",
        accent="rose",
        tool_type="beaker",
        capacity_ml=100.0,
    ),
}


WORKBENCH_LIQUIDS = {
    "acetonitrile_extraction": WorkbenchLiquidDefinition(
        id="acetonitrile_extraction",
        name="Acetonitrile",
        accent="amber",
        transfer_volume_ml=10.0,
    ),
    "apple_extract": WorkbenchLiquidDefinition(
        id="apple_extract",
        name="Apple extract",
        accent="rose",
        transfer_volume_ml=10.0,
    ),
    "ultrapure_water_rinse": WorkbenchLiquidDefinition(
        id="ultrapure_water_rinse",
        name="Ultrapure water",
        accent="sky",
        transfer_volume_ml=5.0,
    ),
}


def get_workbench_tool_definition(tool_id: str) -> WorkbenchToolDefinition:
    try:
        return WORKBENCH_TOOLS[tool_id]
    except KeyError as exc:
        raise ValueError("Unknown workbench tool") from exc


def get_workbench_liquid_definition(liquid_id: str) -> WorkbenchLiquidDefinition:
    try:
        return WORKBENCH_LIQUIDS[liquid_id]
    except KeyError as exc:
        raise ValueError("Unknown workbench liquid") from exc
