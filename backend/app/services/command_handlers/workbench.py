from __future__ import annotations

from app.domain.rules import can_tool_accept_liquids, can_tool_be_sealed, can_tool_receive_contents
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
from app.services.commands import (
    AddLiquidToWorkbenchToolCommand,
    AddProduceLotToWorkbenchToolCommand,
    ApplySampleLabelToWorkbenchToolCommand,
    CloseWorkbenchToolCommand,
    OpenWorkbenchToolCommand,
    MoveProduceLotBetweenWorkbenchToolsCommand,
    MoveSampleLabelBetweenWorkbenchToolsCommand,
    MoveToolBetweenWorkbenchSlotsCommand,
    PlaceToolOnWorkbenchCommand,
    RestoreTrashedSampleLabelToWorkbenchToolCommand,
    UpdateWorkbenchLiquidVolumeCommand,
    UpdateWorkbenchToolSampleLabelTextCommand,
    WorkbenchLiquidCommand,
    WorkbenchProduceLotCommand,
    WorkbenchSlotCommand,
)
from app.services.physical_simulation_service import PhysicalSimulationService
from app.services.produce_lot_transfer import (
    ProduceLotTransferService,
    WorkbenchProduceLotSource,
    WorkbenchProduceLotTarget,
    WorkspaceProduceLotSource,
)
from app.services.command_handlers.support import (
    find_trash_sample_label,
    find_workbench_slot,
    format_volume,
    round_volume,
)

produce_lot_transfer_service = ProduceLotTransferService()
physical_simulation_service = PhysicalSimulationService()


def place_tool_on_workbench(experiment: Experiment, command: PlaceToolOnWorkbenchCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is not None or slot.surface_produce_lots:
        raise ValueError(f"{slot.label} already contains a tool")

    slot.tool = build_workbench_tool(command.tool_id)
    experiment.audit_log.append(f"{slot.tool.label} placed on {slot.label}.")


def add_workbench_slot(experiment: Experiment) -> None:
    next_index = _get_next_workbench_slot_index(experiment)
    experiment.workbench.slots.append(
        WorkbenchSlot(
            id=f"station_{next_index}",
            label=f"Station {next_index}",
        )
    )
    experiment.audit_log.append(f"Station {next_index} added to workbench.")


def remove_workbench_slot(experiment: Experiment, command: WorkbenchSlotCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is not None or slot.surface_produce_lots:
        raise ValueError(f"{slot.label} must be empty before it can be removed.")

    experiment.workbench.slots = [
        existing_slot for existing_slot in experiment.workbench.slots if existing_slot.id != slot.id
    ]
    experiment.audit_log.append(f"{slot.label} removed from workbench.")


def move_tool_between_workbench_slots(
    experiment: Experiment,
    command: MoveToolBetweenWorkbenchSlotsCommand,
) -> None:
    source_slot = find_workbench_slot(experiment.workbench, command.source_slot_id)
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

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


def add_liquid_to_workbench_tool(
    experiment: Experiment,
    command: AddLiquidToWorkbenchToolCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before adding liquids.")
    if not can_tool_accept_liquids(slot.tool.tool_type):
        raise ValueError(f"{slot.tool.label} does not accept liquids.")
    if not can_tool_receive_contents(slot.tool.tool_type, slot.tool.is_sealed):
        raise ValueError(f"Open {slot.tool.label} before adding liquids.")

    liquid_definition = get_workbench_liquid_definition(command.liquid_id)
    current_volume = round_volume(sum(liquid.volume_ml for liquid in slot.tool.liquids))
    remaining_capacity = round_volume(max(slot.tool.capacity_ml - current_volume, 0.0))
    if remaining_capacity <= 0:
        raise ValueError(f"{slot.tool.label} is already full.")

    requested_volume = round_volume(
        max(float(command.volume_ml or liquid_definition.transfer_volume_ml), 0.0)
    )
    volume_to_add = round_volume(min(requested_volume, remaining_capacity))
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

    if volume_to_add < requested_volume:
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


def add_produce_lot_to_workbench_tool(
    experiment: Experiment,
    command: AddProduceLotToWorkbenchToolCommand,
) -> None:
    transfer = produce_lot_transfer_service.transfer(
        experiment,
        WorkspaceProduceLotSource(produce_lot_id=command.produce_lot_id),
        WorkbenchProduceLotTarget(slot_id=command.slot_id),
    )
    experiment.audit_log.append(
        f"{transfer.produce_lot.label} added to {transfer.target_label}."
        if not transfer.contamination_applied
        else f"{transfer.produce_lot.label} placed directly on {transfer.target_label} and marked contaminated."
    )


def apply_sample_label_to_workbench_tool(
    experiment: Experiment,
    command: ApplySampleLabelToWorkbenchToolCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before adding a sample label.")
    if slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{slot.tool.label} does not accept a sample label.")
    if slot.tool.sample_label_text is not None:
        raise ValueError(f"{slot.tool.label} already has a sample label.")

    slot.tool.sample_label_text = ""
    experiment.audit_log.append(f"Sample label applied to {slot.tool.label} on {slot.label}.")


def close_workbench_tool(experiment: Experiment, command: CloseWorkbenchToolCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before sealing it.")
    if not can_tool_be_sealed(slot.tool.tool_type):
        raise ValueError(f"{slot.tool.label} cannot be sealed.")

    slot.tool.is_sealed = True
    slot.tool.closure_fault = None
    slot.tool.internal_pressure_bar = max(slot.tool.internal_pressure_bar, 1.0)
    experiment.audit_log.append(f"{slot.tool.label} sealed on {slot.label}.")


def open_workbench_tool(experiment: Experiment, command: OpenWorkbenchToolCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before opening it.")
    if not can_tool_be_sealed(slot.tool.tool_type):
        raise ValueError(f"{slot.tool.label} cannot be opened.")

    vent_event = physical_simulation_service.vent_opened_tool(slot.tool)
    slot.tool.is_sealed = False
    slot.tool.closure_fault = None
    if vent_event is not None and vent_event.lost_mass_g > 0:
        experiment.audit_log.append(
            f"{slot.tool.label} vented at {format_volume(vent_event.pressure_bar)} bar on {slot.label}; {format_volume(vent_event.lost_mass_g)} g of powder was lost."
        )
        return

    experiment.audit_log.append(f"{slot.tool.label} opened on {slot.label}.")


def update_workbench_tool_sample_label_text(
    experiment: Experiment,
    command: UpdateWorkbenchToolSampleLabelTextCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before editing its sample label.")
    if slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{slot.tool.label} does not accept a sample label.")
    if slot.tool.sample_label_text is None:
        raise ValueError(f"{slot.tool.label} does not have a sample label yet.")

    next_text = command.sample_label_text.strip()
    slot.tool.sample_label_text = next_text
    if next_text:
        experiment.audit_log.append(
            f"Sample label updated to {next_text} on {slot.tool.label}."
        )
        return

    experiment.audit_log.append(f"Sample label cleared on {slot.tool.label}.")


def move_sample_label_between_workbench_tools(
    experiment: Experiment,
    command: MoveSampleLabelBetweenWorkbenchToolsCommand,
) -> None:
    source_slot = find_workbench_slot(experiment.workbench, command.source_slot_id)
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

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


def discard_sample_label_from_workbench_tool(
    experiment: Experiment,
    command: WorkbenchSlotCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
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


def restore_trashed_sample_label_to_workbench_tool(
    experiment: Experiment,
    command: RestoreTrashedSampleLabelToWorkbenchToolCommand,
) -> None:
    trashed_sample_label = find_trash_sample_label(
        experiment.trash, command.trash_sample_label_id
    )
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

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


def move_produce_lot_between_workbench_tools(
    experiment: Experiment,
    command: MoveProduceLotBetweenWorkbenchToolsCommand,
) -> None:
    if command.source_slot_id == command.target_slot_id:
        return

    transfer = produce_lot_transfer_service.transfer(
        experiment,
        WorkbenchProduceLotSource(
            slot_id=command.source_slot_id,
            produce_lot_id=command.produce_lot_id,
        ),
        WorkbenchProduceLotTarget(slot_id=command.target_slot_id),
    )
    experiment.audit_log.append(
        f"{transfer.produce_lot.label} moved from {transfer.source_label} to {transfer.target_label}."
    )


def discard_produce_lot_from_workbench_tool(
    experiment: Experiment,
    command: WorkbenchProduceLotCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    produce_lot_id = command.produce_lot_id
    produce_lot, origin_label = _remove_produce_lot_from_slot(slot, produce_lot_id)
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=new_id("trash_produce_lot"),
            origin_label=origin_label,
            produce_lot=produce_lot,
        )
    )
    experiment.audit_log.append(f"{produce_lot.label} discarded from {origin_label}.")


def cut_workbench_produce_lot(experiment: Experiment, command: WorkbenchProduceLotCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    produce_lot_id = command.produce_lot_id
    produce_lot, origin_label = _find_produce_lot_in_slot(slot, produce_lot_id)

    if slot.tool is not None and slot.tool.tool_type != "cutting_board":
        raise ValueError(f"{slot.tool.label} does not support cutting.")
    if produce_lot.cut_state != "whole":
        return

    produce_lot.cut_state = "cut"
    experiment.audit_log.append(f"{produce_lot.label} cut on {origin_label}.")


def _remove_produce_lot_from_slot(slot: WorkbenchSlot, produce_lot_id: str):
    produce_lot, origin_label = _find_produce_lot_in_slot(slot, produce_lot_id)
    if slot.tool is not None and origin_label == slot.tool.label:
        slot.tool.produce_lots = [
            lot for lot in slot.tool.produce_lots if lot.id != produce_lot_id
        ]
        return produce_lot, origin_label

    slot.surface_produce_lots = [
        lot for lot in slot.surface_produce_lots if lot.id != produce_lot_id
    ]
    return produce_lot, origin_label


def _find_produce_lot_in_slot(slot: WorkbenchSlot, produce_lot_id: str):
    if slot.tool is not None and slot.tool.produce_lots:
        produce_lot = next(
            (lot for lot in slot.tool.produce_lots if lot.id == produce_lot_id),
            None,
        )
        if produce_lot is not None:
            return produce_lot, slot.tool.label

    produce_lot = next(
        (lot for lot in slot.surface_produce_lots if lot.id == produce_lot_id),
        None,
    )
    if produce_lot is None:
        raise ValueError("Unknown produce lot")

    return produce_lot, slot.label


def remove_liquid_from_workbench_tool(
    experiment: Experiment,
    command: WorkbenchLiquidCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

    liquid_entry = next(
        (liquid for liquid in slot.tool.liquids if liquid.id == command.liquid_entry_id),
        None,
    )
    if liquid_entry is None:
        raise ValueError("Unknown workbench liquid")

    slot.tool.liquids = [
        liquid for liquid in slot.tool.liquids if liquid.id != command.liquid_entry_id
    ]
    experiment.audit_log.append(f"{liquid_entry.name} removed from {slot.tool.label}.")


def update_workbench_liquid_volume(
    experiment: Experiment,
    command: UpdateWorkbenchLiquidVolumeCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

    liquid_entry = next(
        (liquid for liquid in slot.tool.liquids if liquid.id == command.liquid_entry_id),
        None,
    )
    if liquid_entry is None:
        raise ValueError("Unknown workbench liquid")

    requested_volume = round_volume(max(float(command.volume_ml), 0.0))
    occupied_by_others = sum(
        liquid.volume_ml for liquid in slot.tool.liquids if liquid.id != liquid_entry.id
    )
    max_allowed_volume = round_volume(max(slot.tool.capacity_ml - occupied_by_others, 0.0))
    liquid_entry.volume_ml = round_volume(min(requested_volume, max_allowed_volume))
    if liquid_entry.volume_ml <= 0:
        slot.tool.liquids = [
            liquid for liquid in slot.tool.liquids if liquid.id != command.liquid_entry_id
        ]
        experiment.audit_log.append(f"{liquid_entry.name} removed from {slot.tool.label}.")
        return

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
        is_sealed=False,
        closure_fault=None,
        sample_label_text=None,
        produce_lots=[],
    )
