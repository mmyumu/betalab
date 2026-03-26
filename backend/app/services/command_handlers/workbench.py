from __future__ import annotations

from app.domain.rules import can_tool_accept_liquids, can_tool_accept_produce
from app.domain.models import (
    Experiment,
    TrashProduceLotEntry,
    TrashSampleLabelEntry,
    WorkbenchLiquid,
    WorkbenchSlot,
    WorkbenchTool,
    new_id,
)
from app.domain.workbench_catalog import get_workbench_liquid_definition, get_workbench_tool_definition
from app.services.command_handlers.support import (
    find_trash_sample_label,
    find_workbench_slot,
    find_workspace_produce_lot,
    format_volume,
    round_volume,
)


def place_tool_on_workbench(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is not None or slot.surface_produce_lots:
        raise ValueError(f"{slot.label} already contains a tool")

    slot.tool = build_workbench_tool(payload["tool_id"])
    experiment.audit_log.append(f"{slot.tool.label} placed on {slot.label}.")


def add_workbench_slot(experiment: Experiment, payload: dict | None = None) -> None:
    next_index = _get_next_workbench_slot_index(experiment)
    experiment.workbench.slots.append(
        WorkbenchSlot(
            id=f"station_{next_index}",
            label=f"Station {next_index}",
        )
    )
    experiment.audit_log.append(f"Station {next_index} added to workbench.")


def remove_workbench_slot(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is not None or slot.surface_produce_lots:
        raise ValueError(f"{slot.label} must be empty before it can be removed.")

    experiment.workbench.slots = [
        existing_slot for existing_slot in experiment.workbench.slots if existing_slot.id != slot.id
    ]
    experiment.audit_log.append(f"{slot.label} removed from workbench.")


def move_tool_between_workbench_slots(experiment: Experiment, payload: dict) -> None:
    source_slot = find_workbench_slot(experiment.workbench, payload["source_slot_id"])
    target_slot = find_workbench_slot(experiment.workbench, payload["target_slot_id"])

    if source_slot.id == target_slot.id:
        return
    if source_slot.tool is None:
        raise ValueError(f"Place a tool on {source_slot.label} before moving it.")
    if target_slot.tool is not None or target_slot.surface_produce_lots:
        raise ValueError(f"{target_slot.label} already contains a tool")

    moved_tool = source_slot.tool
    source_slot.tool = None
    target_slot.tool = moved_tool
    experiment.audit_log.append(
        f"{moved_tool.label} moved from {source_slot.label} to {target_slot.label}."
    )


def add_liquid_to_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before adding liquids.")
    if not can_tool_accept_liquids(slot.tool.tool_type):
        raise ValueError(f"{slot.tool.label} does not accept liquids.")

    liquid_definition = get_workbench_liquid_definition(payload["liquid_id"])
    current_volume = round_volume(sum(liquid.volume_ml for liquid in slot.tool.liquids))
    remaining_capacity = round_volume(max(slot.tool.capacity_ml - current_volume, 0.0))
    if remaining_capacity <= 0:
        raise ValueError(f"{slot.tool.label} is already full.")

    volume_to_add = round_volume(min(liquid_definition.transfer_volume_ml, remaining_capacity))
    existing_liquid = next(
        (liquid for liquid in slot.tool.liquids if liquid.liquid_id == liquid_definition.id),
        None,
    )

    if existing_liquid is None:
        slot.tool.liquids.append(
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

    if volume_to_add < liquid_definition.transfer_volume_ml:
        if existing_liquid_was_present:
            experiment.audit_log.append(
                f"{liquid_definition.name} increased to {format_volume(updated_volume)} mL in {slot.tool.label} (remaining capacity)."
            )
        else:
            experiment.audit_log.append(
                f"{liquid_definition.name} added to {slot.tool.label} at {format_volume(updated_volume)} mL (remaining capacity)."
            )
        return

    if existing_liquid_was_present:
        experiment.audit_log.append(
            f"{liquid_definition.name} increased to {format_volume(updated_volume)} mL in {slot.tool.label}."
        )
        return

    experiment.audit_log.append(f"{liquid_definition.name} added to {slot.tool.label}.")


def add_produce_lot_to_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    _validate_slot_can_accept_produce(slot)
    produce_lot = find_workspace_produce_lot(
        experiment.workspace,
        str(payload["produce_lot_id"]),
    )
    target_label = _add_produce_lot_to_slot(slot, produce_lot)
    experiment.workspace.produce_lots = [
        lot for lot in experiment.workspace.produce_lots if lot.id != produce_lot.id
    ]
    experiment.audit_log.append(
        f"{produce_lot.label} added to {target_label}."
        if target_label != slot.label
        else f"{produce_lot.label} placed directly on {slot.label} and marked contaminated."
    )


def apply_sample_label_to_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before adding a sample label.")
    if slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{slot.tool.label} does not accept a sample label.")
    if slot.tool.sample_label_text is not None:
        raise ValueError(f"{slot.tool.label} already has a sample label.")

    slot.tool.sample_label_text = ""
    experiment.audit_log.append(f"Sample label applied to {slot.tool.label} on {slot.label}.")


def update_workbench_tool_sample_label_text(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before editing its sample label.")
    if slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{slot.tool.label} does not accept a sample label.")
    if slot.tool.sample_label_text is None:
        raise ValueError(f"{slot.tool.label} does not have a sample label yet.")

    next_text = str(payload["sample_label_text"]).strip()
    slot.tool.sample_label_text = next_text
    if next_text:
        experiment.audit_log.append(
            f"Sample label updated to {next_text} on {slot.tool.label}."
        )
        return

    experiment.audit_log.append(f"Sample label cleared on {slot.tool.label}.")


def move_sample_label_between_workbench_tools(experiment: Experiment, payload: dict) -> None:
    source_slot = find_workbench_slot(experiment.workbench, payload["source_slot_id"])
    target_slot = find_workbench_slot(experiment.workbench, payload["target_slot_id"])

    if source_slot.id == target_slot.id:
        return
    if source_slot.tool is None:
        raise ValueError(f"Place a tool on {source_slot.label} before moving its sample label.")
    if source_slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{source_slot.tool.label} does not contain a sample label.")
    if source_slot.tool.sample_label_text is None:
        raise ValueError(f"{source_slot.tool.label} does not have a sample label yet.")
    if target_slot.tool is None:
        raise ValueError(f"Place a tool on {target_slot.label} before adding a sample label.")
    if target_slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{target_slot.tool.label} does not accept a sample label.")
    if target_slot.tool.sample_label_text is not None:
        raise ValueError(f"{target_slot.tool.label} already has a sample label.")

    sample_label_text = source_slot.tool.sample_label_text
    source_slot.tool.sample_label_text = None
    target_slot.tool.sample_label_text = sample_label_text
    experiment.audit_log.append(
        f"Sample label moved from {source_slot.tool.label} on {source_slot.label} to {target_slot.tool.label} on {target_slot.label}."
    )


def discard_sample_label_from_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before removing its sample label.")
    if slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{slot.tool.label} does not accept a sample label.")
    if slot.tool.sample_label_text is None:
        raise ValueError(f"{slot.tool.label} does not have a sample label yet.")

    sample_label_text = slot.tool.sample_label_text
    slot.tool.sample_label_text = None
    experiment.trash.sample_labels.append(
        TrashSampleLabelEntry(
            id=new_id("trash_sample_label"),
            origin_label=slot.tool.label,
            sample_label_text=sample_label_text,
        )
    )
    experiment.audit_log.append(f"Sample label discarded from {slot.tool.label}.")


def restore_trashed_sample_label_to_workbench_tool(experiment: Experiment, payload: dict) -> None:
    trashed_sample_label = find_trash_sample_label(
        experiment.trash, payload["trash_sample_label_id"]
    )
    target_slot = find_workbench_slot(experiment.workbench, payload["target_slot_id"])

    if target_slot.tool is None:
        raise ValueError(f"Place a tool on {target_slot.label} before adding a sample label.")
    if target_slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{target_slot.tool.label} does not accept a sample label.")
    if target_slot.tool.sample_label_text is not None:
        raise ValueError(f"{target_slot.tool.label} already has a sample label.")

    target_slot.tool.sample_label_text = trashed_sample_label.sample_label_text
    experiment.trash.sample_labels = [
        entry
        for entry in experiment.trash.sample_labels
        if entry.id != trashed_sample_label.id
    ]
    experiment.audit_log.append(
        f"Sample label restored from trash to {target_slot.tool.label} on {target_slot.label}."
    )


def move_produce_lot_between_workbench_tools(experiment: Experiment, payload: dict) -> None:
    source_slot = find_workbench_slot(experiment.workbench, payload["source_slot_id"])
    target_slot = find_workbench_slot(experiment.workbench, payload["target_slot_id"])

    if source_slot.id == target_slot.id:
        return

    produce_lot_id = str(payload["produce_lot_id"])
    produce_lot, source_label = _remove_produce_lot_from_slot(source_slot, produce_lot_id)
    target_label = _add_produce_lot_to_slot(target_slot, produce_lot)
    experiment.audit_log.append(
        f"{produce_lot.label} moved from {source_label} to {target_label}."
    )


def discard_produce_lot_from_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    produce_lot_id = str(payload["produce_lot_id"])
    produce_lot, origin_label = _remove_produce_lot_from_slot(slot, produce_lot_id)
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=new_id("trash_produce_lot"),
            origin_label=origin_label,
            produce_lot=produce_lot,
        )
    )
    experiment.audit_log.append(f"{produce_lot.label} discarded from {origin_label}.")


def _get_slot_produce_target_label(slot: WorkbenchSlot) -> str:
    if slot.tool is not None:
        return slot.tool.label
    return slot.label


def _validate_slot_can_accept_produce(slot: WorkbenchSlot) -> None:
    if slot.tool is None:
        if slot.surface_produce_lots:
            raise ValueError(f"{slot.label} already contains a produce lot.")
        return

    if not can_tool_accept_produce(slot.tool.tool_type):
        raise ValueError(f"{slot.tool.label} does not accept produce.")
    if slot.tool.produce_lots:
        raise ValueError(f"{slot.tool.label} already contains a produce lot.")


def _add_produce_lot_to_slot(slot: WorkbenchSlot, produce_lot) -> str:
    _validate_slot_can_accept_produce(slot)
    if slot.tool is None:
        produce_lot.is_contaminated = True
        slot.surface_produce_lots.append(produce_lot)
        return slot.label

    slot.tool.produce_lots.append(produce_lot)
    return slot.tool.label


def _remove_produce_lot_from_slot(slot: WorkbenchSlot, produce_lot_id: str):
    if slot.tool is not None and slot.tool.produce_lots:
        produce_lot = next(
            (lot for lot in slot.tool.produce_lots if lot.id == produce_lot_id),
            None,
        )
        if produce_lot is not None:
            slot.tool.produce_lots = [
                lot for lot in slot.tool.produce_lots if lot.id != produce_lot_id
            ]
            return produce_lot, slot.tool.label

    produce_lot = next(
        (lot for lot in slot.surface_produce_lots if lot.id == produce_lot_id),
        None,
    )
    if produce_lot is None:
        raise ValueError("Unknown produce lot")

    slot.surface_produce_lots = [
        lot for lot in slot.surface_produce_lots if lot.id != produce_lot_id
    ]
    return produce_lot, slot.label


def remove_liquid_from_workbench_tool(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

    liquid_entry = next(
        (liquid for liquid in slot.tool.liquids if liquid.id == payload["liquid_entry_id"]),
        None,
    )
    if liquid_entry is None:
        raise ValueError("Unknown workbench liquid")

    slot.tool.liquids = [
        liquid for liquid in slot.tool.liquids if liquid.id != payload["liquid_entry_id"]
    ]
    experiment.audit_log.append(f"{liquid_entry.name} removed from {slot.tool.label}.")


def update_workbench_liquid_volume(experiment: Experiment, payload: dict) -> None:
    slot = find_workbench_slot(experiment.workbench, payload["slot_id"])
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

    liquid_entry = next(
        (liquid for liquid in slot.tool.liquids if liquid.id == payload["liquid_entry_id"]),
        None,
    )
    if liquid_entry is None:
        raise ValueError("Unknown workbench liquid")

    requested_volume = round_volume(max(float(payload["volume_ml"]), 0.0))
    occupied_by_others = sum(
        liquid.volume_ml for liquid in slot.tool.liquids if liquid.id != liquid_entry.id
    )
    max_allowed_volume = round_volume(max(slot.tool.capacity_ml - occupied_by_others, 0.0))
    liquid_entry.volume_ml = round_volume(min(requested_volume, max_allowed_volume))
    experiment.audit_log.append(
        f"{liquid_entry.name} adjusted to {format_volume(liquid_entry.volume_ml)} mL in {slot.tool.label}."
    )


def _get_next_workbench_slot_index(experiment: Experiment) -> int:
    existing_indices = []
    for slot in experiment.workbench.slots:
        if slot.id.startswith("station_"):
            suffix = slot.id.removeprefix("station_")
            if suffix.isdigit():
                existing_indices.append(int(suffix))

    return (max(existing_indices) if existing_indices else 0) + 1


def build_workbench_tool(tool_id: str) -> WorkbenchTool:
    tool_definition = get_workbench_tool_definition(tool_id)
    return WorkbenchTool(
        id=new_id("bench_tool"),
        tool_id=tool_definition.id,
        label=tool_definition.name,
        subtitle=tool_definition.subtitle,
        accent=tool_definition.accent,
        tool_type=tool_definition.tool_type,
        capacity_ml=tool_definition.capacity_ml,
        sample_label_text=None,
        produce_lots=[],
    )
