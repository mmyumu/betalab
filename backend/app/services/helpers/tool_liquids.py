from __future__ import annotations

from app.domain.models import Experiment, WorkbenchLiquid, WorkbenchTool, new_id
from app.domain.rules import can_tool_accept_liquids, can_tool_receive_contents
from app.domain.workbench_catalog import get_workbench_liquid_definition
from app.services.helpers.lookups import format_volume, round_volume
from app.services.helpers.produce_canonical import get_tool_remaining_fill_capacity_ml


def add_liquid_to_tool(
    experiment: Experiment,
    tool: WorkbenchTool,
    *,
    liquid_id: str,
    volume_ml: float | None,
) -> None:
    if not can_tool_accept_liquids(tool.tool_type):
        raise ValueError(f"{tool.label} does not accept liquids.")
    if not can_tool_receive_contents(tool.tool_type, tool.is_sealed):
        raise ValueError(f"Open {tool.label} before adding liquids.")

    liquid_definition = get_workbench_liquid_definition(liquid_id)
    remaining_capacity = round_volume(
        get_tool_remaining_fill_capacity_ml(tool, material_states=experiment.produce_material_states)
    )
    if remaining_capacity <= 0:
        raise ValueError(f"{tool.label} is already full.")

    requested_volume = round_volume(max(float(volume_ml or liquid_definition.transfer_volume_ml), 0.0))
    volume_to_add = round_volume(min(requested_volume, remaining_capacity))
    existing_liquid = next(
        (liquid for liquid in tool.liquids if liquid.liquid_id == liquid_definition.id),
        None,
    )

    if existing_liquid is None:
        tool.liquids.append(
            WorkbenchLiquid(
                id=new_id("bench_liquid"),
                liquid_id=liquid_definition.id,
                name=liquid_definition.name,
                volume_ml=round_volume(volume_to_add),
                accent=liquid_definition.accent,
            )
        )
        updated_volume = round_volume(volume_to_add)
        existing_liquid_was_present = False
    else:
        existing_liquid.volume_ml = round_volume(existing_liquid.volume_ml + volume_to_add)
        updated_volume = existing_liquid.volume_ml
        existing_liquid_was_present = True

    if volume_to_add < requested_volume:
        if existing_liquid_was_present:
            experiment.audit_log.append(
                f"{liquid_definition.name} increased to {format_volume(updated_volume)} mL in {tool.label} (remaining capacity)."
            )
        else:
            experiment.audit_log.append(
                f"{liquid_definition.name} added to {tool.label} at {format_volume(updated_volume)} mL (remaining capacity)."
            )
        return

    if existing_liquid_was_present:
        experiment.audit_log.append(
            f"{liquid_definition.name} increased to {format_volume(updated_volume)} mL in {tool.label}."
        )
        return

    experiment.audit_log.append(f"{liquid_definition.name} added to {tool.label}.")
