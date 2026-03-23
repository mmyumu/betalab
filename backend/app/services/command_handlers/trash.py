from __future__ import annotations

from app.domain.models import Experiment, TrashToolEntry, new_id
from app.services.command_handlers.support import find_rack_slot, find_trash_tool, find_workbench_slot


def discard_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before discarding it.")
    if not slot.tool.trashable:
        raise ValueError(f"{slot.tool.label} cannot be discarded.")

    discarded_tool = slot.tool
    slot.tool = None
    experiment.trash.tools.append(
        TrashToolEntry(
            id=new_id("trash_tool"),
            origin_label=slot.label,
            tool=discarded_tool,
        )
    )
    experiment.audit_log.append(f"{discarded_tool.label} discarded from {slot.label}.")


def restore_trashed_tool_to_workbench_slot(experiment: Experiment, payload: dict) -> None:
    trashed_tool = find_trash_tool(experiment.trash, payload["trash_tool_id"])
    target_slot = find_workbench_slot(experiment.workbench, payload["target_slot_id"])

    if target_slot.tool is not None:
        raise ValueError(f"{target_slot.label} already contains a tool")

    target_slot.tool = trashed_tool.tool
    experiment.trash.tools = [
        entry for entry in experiment.trash.tools if entry.id != trashed_tool.id
    ]
    experiment.audit_log.append(
        f"{target_slot.tool.label} restored from trash to {target_slot.label}."
    )


def discard_rack_tool(experiment: Experiment, payload: dict) -> None:
    rack_slot = find_rack_slot(experiment.rack, payload["rack_slot_id"])
    if rack_slot.tool is None:
        raise ValueError(f"Place a vial in {rack_slot.label} before discarding it.")
    if not rack_slot.tool.trashable:
        raise ValueError(f"{rack_slot.tool.label} cannot be discarded.")

    discarded_tool = rack_slot.tool
    rack_slot.tool = None
    experiment.trash.tools.append(
        TrashToolEntry(
            id=new_id("trash_tool"),
            origin_label=rack_slot.label,
            tool=discarded_tool,
        )
    )
    experiment.audit_log.append(f"{discarded_tool.label} discarded from {rack_slot.label}.")


def restore_trashed_tool_to_rack_slot(experiment: Experiment, payload: dict) -> None:
    trashed_tool = find_trash_tool(experiment.trash, payload["trash_tool_id"])
    rack_slot = find_rack_slot(experiment.rack, payload["rack_slot_id"])

    if trashed_tool.tool.tool_type != "sample_vial":
        raise ValueError("Only autosampler vials can be restored into the rack.")
    if rack_slot.tool is not None:
        raise ValueError(f"{rack_slot.label} already contains a vial")

    rack_slot.tool = trashed_tool.tool
    experiment.trash.tools = [
        entry for entry in experiment.trash.tools if entry.id != trashed_tool.id
    ]
    experiment.audit_log.append(
        f"{rack_slot.tool.label} restored from trash to {rack_slot.label}."
    )
