from __future__ import annotations

from app.domain.models import Experiment
from app.services.commands import (
    MoveRackToolBetweenSlotsCommand,
    PlaceWorkbenchToolInRackSlotCommand,
    RackSlotCommand,
    RackSlotToolCommand,
    RemoveRackToolToWorkbenchSlotCommand,
)
from app.services.command_handlers.support import find_rack_slot, find_workbench_slot
from app.services.command_handlers.workbench import build_workbench_tool


def place_tool_in_rack_slot(experiment: Experiment, command: RackSlotToolCommand) -> None:
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)
    if rack_slot.tool is not None:
        raise ValueError(f"{rack_slot.label} already contains a vial")

    tool = build_workbench_tool(command.tool_id)
    if tool.tool_type != "sample_vial":
        raise ValueError("Only autosampler vials can be placed in the rack.")

    rack_slot.tool = tool
    experiment.audit_log.append(f"{rack_slot.tool.label} placed in {rack_slot.label}.")


def place_workbench_tool_in_rack_slot(
    experiment: Experiment,
    command: PlaceWorkbenchToolInRackSlotCommand,
) -> None:
    source_slot = find_workbench_slot(experiment.workbench, command.source_slot_id)
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)

    if source_slot.tool is None:
        raise ValueError(f"Place a tool on {source_slot.label} before moving it into the rack.")
    if source_slot.tool.tool_type != "sample_vial":
        raise ValueError("Only autosampler vials can be placed in the rack.")
    if rack_slot.tool is not None:
        raise ValueError(f"{rack_slot.label} already contains a vial")

    rack_slot.tool = source_slot.tool
    source_slot.tool = None
    experiment.audit_log.append(
        f"{rack_slot.tool.label} moved from {source_slot.label} to {rack_slot.label}."
    )


def remove_rack_tool_to_workbench_slot(
    experiment: Experiment,
    command: RemoveRackToolToWorkbenchSlotCommand,
) -> None:
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

    if rack_slot.tool is None:
        raise ValueError(f"Place a vial in {rack_slot.label} before moving it back to the bench.")
    if target_slot.tool is not None:
        raise ValueError(f"{target_slot.label} already contains a tool")

    target_slot.tool = rack_slot.tool
    rack_slot.tool = None
    experiment.audit_log.append(
        f"{target_slot.tool.label} moved from {rack_slot.label} to {target_slot.label}."
    )


def move_rack_tool_between_slots(
    experiment: Experiment,
    command: MoveRackToolBetweenSlotsCommand,
) -> None:
    source_slot = find_rack_slot(experiment.rack, command.source_rack_slot_id)
    target_slot = find_rack_slot(experiment.rack, command.target_rack_slot_id)

    if source_slot.tool is None:
        raise ValueError(f"Place a vial in {source_slot.label} before moving it.")
    if target_slot.tool is not None:
        raise ValueError(f"{target_slot.label} already contains a vial")

    target_slot.tool = source_slot.tool
    source_slot.tool = None
    experiment.audit_log.append(
        f"{target_slot.tool.label} moved from {source_slot.label} to {target_slot.label}."
    )
