from __future__ import annotations

from app.domain.models import Experiment, TrashSampleLabelEntry, TrashToolEntry, new_id
from app.services.commands import (
    DiscardBasketToolCommand,
    DiscardSampleLabelFromPaletteCommand,
    DiscardToolFromPaletteCommand,
    RackSlotCommand,
    RestoreTrashedProduceLotToWorkbenchToolCommand,
    RestoreTrashedToolToRackSlotCommand,
    RestoreTrashedToolToWorkbenchSlotCommand,
    WorkbenchSlotCommand,
)
from app.services.produce_lot_transfer import (
    ProduceLotTransferService,
    TrashProduceLotSource,
    WorkbenchProduceLotTarget,
)
from app.services.command_handlers.support import (
    find_rack_slot,
    find_trash_produce_lot,
    find_trash_tool,
    find_workbench_slot,
)
from app.services.command_handlers.workbench import build_workbench_tool
from app.services.command_handlers.support import build_manual_label

produce_lot_transfer_service = ProduceLotTransferService()


def discard_workbench_tool(experiment: Experiment, command: WorkbenchSlotCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before discarding it.")

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


def discard_basket_tool(experiment: Experiment, _command: DiscardBasketToolCommand) -> None:
    if experiment.basket_tool is None:
        raise ValueError("Place a received sampling bag in the basket before discarding it.")

    discarded_tool = experiment.basket_tool
    experiment.basket_tool = None
    experiment.trash.tools.append(
        TrashToolEntry(
            id=new_id("trash_tool"),
            origin_label="Produce basket",
            tool=discarded_tool,
        )
    )
    experiment.audit_log.append(f"{discarded_tool.label} discarded from Produce basket.")


def discard_tool_from_palette(experiment: Experiment, command: DiscardToolFromPaletteCommand) -> None:
    discarded_tool = build_workbench_tool(command.tool_id)
    experiment.trash.tools.append(
        TrashToolEntry(
            id=new_id("trash_tool"),
            origin_label="Palette",
            tool=discarded_tool,
        )
    )
    experiment.audit_log.append(f"{discarded_tool.label} discarded from Palette.")


def discard_sample_label_from_palette(
    experiment: Experiment,
    command: DiscardSampleLabelFromPaletteCommand,
) -> None:
    experiment.trash.sample_labels.append(
        TrashSampleLabelEntry(
            id=new_id("trash_sample_label"),
            origin_label="Palette",
            label=build_manual_label(text=""),
        )
    )
    experiment.audit_log.append("Manual label discarded from Palette.")


def restore_trashed_tool_to_workbench_slot(
    experiment: Experiment,
    command: RestoreTrashedToolToWorkbenchSlotCommand,
) -> None:
    trashed_tool = find_trash_tool(experiment.trash, command.trash_tool_id)
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

    if target_slot.tool is not None or target_slot.surface_produce_lots:
        raise ValueError(f"{target_slot.label} already contains a tool")

    target_slot.tool = trashed_tool.tool
    experiment.trash.tools = [
        entry for entry in experiment.trash.tools if entry.id != trashed_tool.id
    ]
    experiment.audit_log.append(
        f"{target_slot.tool.label} restored from trash to {target_slot.label}."
    )


def discard_rack_tool(experiment: Experiment, command: RackSlotCommand) -> None:
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)
    if rack_slot.tool is None:
        raise ValueError(f"Place a vial in {rack_slot.label} before discarding it.")

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


def restore_trashed_tool_to_rack_slot(
    experiment: Experiment,
    command: RestoreTrashedToolToRackSlotCommand,
) -> None:
    trashed_tool = find_trash_tool(experiment.trash, command.trash_tool_id)
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)

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


def restore_trashed_produce_lot_to_workbench_tool(
    experiment: Experiment,
    command: RestoreTrashedProduceLotToWorkbenchToolCommand,
) -> None:
    transfer = produce_lot_transfer_service.transfer(
        experiment,
        TrashProduceLotSource(trash_produce_lot_id=command.trash_produce_lot_id),
        WorkbenchProduceLotTarget(
            slot_id=command.target_slot_id,
            allowed_tool_types=frozenset({"sample_bag", "cutting_board"}),
        ),
    )
    experiment.audit_log.append(
        f"{transfer.produce_lot.label} restored from trash to {transfer.location_label}."
    )
