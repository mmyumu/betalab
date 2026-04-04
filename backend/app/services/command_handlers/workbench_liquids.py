from __future__ import annotations

from app.domain.models import Experiment, WorkbenchLiquid, new_id
from app.domain.rules import can_tool_accept_liquids, can_tool_receive_contents
from app.domain.workbench_catalog import get_workbench_liquid_definition
from app.services.command_handlers.support import find_workbench_slot, format_volume, round_volume
from app.services.command_handlers.workbench_shared import find_tool_liquid, require_slot_tool
from app.services.commands import (
    AddLiquidToWorkbenchToolCommand,
    UpdateWorkbenchLiquidVolumeCommand,
    WorkbenchLiquidCommand,
)


def add_liquid_to_workbench_tool(
    experiment: Experiment,
    command: AddLiquidToWorkbenchToolCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "adding liquids")
    if not can_tool_accept_liquids(tool.tool_type):
        raise ValueError(f"{tool.label} does not accept liquids.")
    if not can_tool_receive_contents(tool.tool_type, tool.is_sealed):
        raise ValueError(f"Open {tool.label} before adding liquids.")

    liquid_definition = get_workbench_liquid_definition(command.liquid_id)
    current_volume = round_volume(sum(liquid.volume_ml for liquid in tool.liquids))
    remaining_capacity = round_volume(max(tool.capacity_ml - current_volume, 0.0))
    if remaining_capacity <= 0:
        raise ValueError(f"{tool.label} is already full.")

    requested_volume = round_volume(
        max(float(command.volume_ml or liquid_definition.transfer_volume_ml), 0.0)
    )
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


def remove_liquid_from_workbench_tool(
    experiment: Experiment,
    command: WorkbenchLiquidCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "editing liquids")
    liquid_entry = find_tool_liquid(tool, command.liquid_entry_id)
    tool.liquids = [
        liquid for liquid in tool.liquids if liquid.id != command.liquid_entry_id
    ]
    experiment.audit_log.append(f"{liquid_entry.name} removed from {tool.label}.")


def update_workbench_liquid_volume(
    experiment: Experiment,
    command: UpdateWorkbenchLiquidVolumeCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "editing liquids")
    liquid_entry = find_tool_liquid(tool, command.liquid_entry_id)

    requested_volume = round_volume(max(float(command.volume_ml), 0.0))
    occupied_by_others = sum(
        liquid.volume_ml for liquid in tool.liquids if liquid.id != liquid_entry.id
    )
    max_allowed_volume = round_volume(max(tool.capacity_ml - occupied_by_others, 0.0))
    liquid_entry.volume_ml = round_volume(min(requested_volume, max_allowed_volume))
    if liquid_entry.volume_ml <= 0:
        tool.liquids = [
            liquid for liquid in tool.liquids if liquid.id != command.liquid_entry_id
        ]
        experiment.audit_log.append(f"{liquid_entry.name} removed from {tool.label}.")
        return

    experiment.audit_log.append(
        f"{liquid_entry.name} adjusted to {format_volume(liquid_entry.volume_ml)} mL in {tool.label}."
    )
