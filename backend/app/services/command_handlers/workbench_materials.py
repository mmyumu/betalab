from __future__ import annotations

from app.domain.models import Experiment, TrashProduceLotEntry, new_id
from app.services.command_handlers.support import find_workbench_slot
from app.services.command_handlers.workbench_shared import (
    find_produce_lot_in_slot,
    require_slot_tool,
)
from app.services.commands import (
    AddProduceLotToWorkbenchToolCommand,
    LoadSpatulaFromWorkbenchToolCommand,
    MoveProduceLotBetweenWorkbenchToolsCommand,
    PourSpatulaIntoWorkbenchToolCommand,
    WorkbenchProduceLotCommand,
)
from app.services.produce_lot_transfer import (
    ProduceLotTransferService,
    WorkbenchProduceLotSource,
    WorkbenchProduceLotTarget,
    WorkspaceProduceLotSource,
)

produce_lot_transfer_service = ProduceLotTransferService()
SPATULA_CAPACITY_G = 2.0


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
    removal = WorkbenchProduceLotSource(
        slot_id=command.slot_id,
        produce_lot_id=command.produce_lot_id,
    ).remove(experiment)
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=new_id("trash_produce_lot"),
            origin_label=removal.source_label,
            produce_lot=removal.produce_lot,
            origin=removal.origin,
        )
    )
    experiment.audit_log.append(
        f"{removal.produce_lot.label} discarded from {removal.source_label}."
    )


def cut_workbench_produce_lot(experiment: Experiment, command: WorkbenchProduceLotCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    produce_lot, origin_label = find_produce_lot_in_slot(slot, command.produce_lot_id)

    if slot.tool is not None and slot.tool.tool_type != "cutting_board":
        raise ValueError(f"{slot.tool.label} does not support cutting.")
    if produce_lot.cut_state != "whole":
        return

    produce_lot.cut_state = "cut"
    experiment.audit_log.append(f"{produce_lot.label} cut on {origin_label}.")


def load_spatula_from_workbench_tool(
    experiment: Experiment,
    command: LoadSpatulaFromWorkbenchToolCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "loading the spatula")
    if tool.tool_type != "storage_jar":
        raise ValueError("The spatula can only be loaded from a storage jar.")
    if tool.is_sealed:
        raise ValueError(f"Open {tool.label} before loading the spatula.")
    if experiment.spatula.is_loaded and experiment.spatula.loaded_powder_mass_g > 0:
        raise ValueError("Empty the spatula before loading it again.")
    if tool.powder_mass_g <= 0:
        raise ValueError(f"{tool.label} is empty.")

    available_mass_g = max(tool.powder_mass_g, 0.0)
    fill_ratio = 0.45 + ((experiment.snapshot_version % 11) * 0.045)
    loaded_mass_g = min(
        SPATULA_CAPACITY_G,
        available_mass_g,
        round(SPATULA_CAPACITY_G * fill_ratio, 3),
    )
    if loaded_mass_g <= 0:
        raise ValueError(f"{tool.label} is empty.")

    tool.powder_mass_g = round(max(tool.powder_mass_g - loaded_mass_g, 0.0), 3)
    experiment.spatula.is_loaded = True
    experiment.spatula.loaded_powder_mass_g = loaded_mass_g
    experiment.spatula.source_tool_id = tool.id
    experiment.audit_log.append(f"Spatula loaded from {tool.label}.")


def pour_spatula_into_workbench_tool(
    experiment: Experiment,
    command: PourSpatulaIntoWorkbenchToolCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "receiving powder")
    if tool.tool_type != "sample_vial":
        raise ValueError("The spatula can only pour into an autosampler vial.")
    if tool.is_sealed:
        raise ValueError(f"Open {tool.label} before adding powder.")
    if not experiment.spatula.is_loaded or experiment.spatula.loaded_powder_mass_g <= 0:
        raise ValueError("Load the spatula before pouring.")

    requested_mass_g = max(float(command.delta_mass_g), 0.0)
    if requested_mass_g <= 0:
        return

    transferred_mass_g = min(requested_mass_g, experiment.spatula.loaded_powder_mass_g)
    tool.powder_mass_g = round(tool.powder_mass_g + transferred_mass_g, 3)
    experiment.spatula.loaded_powder_mass_g = round(
        max(experiment.spatula.loaded_powder_mass_g - transferred_mass_g, 0.0),
        3,
    )
    if experiment.spatula.loaded_powder_mass_g <= 0:
        experiment.spatula.is_loaded = False
        experiment.spatula.loaded_powder_mass_g = 0.0
        experiment.spatula.source_tool_id = None

    experiment.audit_log.append(f"Powder transferred into {tool.label}.")
