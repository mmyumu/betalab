from __future__ import annotations

from app.domain.models import Experiment, WorkbenchSlot
from app.domain.rules import can_tool_be_sealed
from app.services.command_handlers.support import find_workbench_slot, format_volume
from app.services.command_handlers.workbench_labels import (
    apply_sample_label_to_workbench_tool as apply_sample_label_to_workbench_tool,
)
from app.services.command_handlers.workbench_labels import (
    discard_sample_label_from_workbench_tool as discard_sample_label_from_workbench_tool,
)
from app.services.command_handlers.workbench_labels import (
    move_sample_label_between_workbench_tools as move_sample_label_between_workbench_tools,
)
from app.services.command_handlers.workbench_labels import (
    restore_trashed_sample_label_to_workbench_tool as restore_trashed_sample_label_to_workbench_tool,
)
from app.services.command_handlers.workbench_labels import (
    update_workbench_tool_sample_label_text as update_workbench_tool_sample_label_text,
)
from app.services.command_handlers.workbench_liquids import (
    add_liquid_to_workbench_tool as add_liquid_to_workbench_tool,
)
from app.services.command_handlers.workbench_liquids import (
    remove_liquid_from_workbench_tool as remove_liquid_from_workbench_tool,
)
from app.services.command_handlers.workbench_liquids import (
    update_workbench_liquid_volume as update_workbench_liquid_volume,
)
from app.services.command_handlers.workbench_materials import (
    add_produce_lot_to_workbench_tool as add_produce_lot_to_workbench_tool,
)
from app.services.command_handlers.workbench_materials import (
    cut_workbench_produce_lot as cut_workbench_produce_lot,
)
from app.services.command_handlers.workbench_materials import (
    discard_produce_lot_from_workbench_tool as discard_produce_lot_from_workbench_tool,
)
from app.services.command_handlers.workbench_materials import (
    load_spatula_from_workbench_tool as load_spatula_from_workbench_tool,
)
from app.services.command_handlers.workbench_materials import (
    move_produce_lot_between_workbench_tools as move_produce_lot_between_workbench_tools,
)
from app.services.command_handlers.workbench_materials import (
    pour_spatula_into_workbench_tool as pour_spatula_into_workbench_tool,
)
from app.services.command_handlers.workbench_shared import (
    build_workbench_tool,
    get_next_workbench_slot_index,
    require_slot_tool,
)
from app.services.commands import (
    CloseWorkbenchToolCommand,
    MoveToolBetweenWorkbenchSlotsCommand,
    OpenWorkbenchToolCommand,
    PlaceToolOnWorkbenchCommand,
    WorkbenchSlotCommand,
)
from app.services.physical_simulation_service import PhysicalSimulationService

physical_simulation_service = PhysicalSimulationService()


def place_tool_on_workbench(experiment: Experiment, command: PlaceToolOnWorkbenchCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is not None or slot.surface_produce_lots:
        raise ValueError(f"{slot.label} already contains a tool")

    slot.tool = build_workbench_tool(command.tool_id)
    experiment.audit_log.append(f"{slot.tool.label} placed on {slot.label}.")


def add_workbench_slot(experiment: Experiment) -> None:
    next_index = get_next_workbench_slot_index(experiment.workbench.slots)
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


def close_workbench_tool(experiment: Experiment, command: CloseWorkbenchToolCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "sealing it")
    if not can_tool_be_sealed(tool.tool_type):
        raise ValueError(f"{tool.label} cannot be sealed.")

    tool.is_sealed = True
    tool.closure_fault = None
    tool.internal_pressure_bar = max(tool.internal_pressure_bar, 1.0)
    experiment.audit_log.append(f"{tool.label} sealed on {slot.label}.")


def open_workbench_tool(experiment: Experiment, command: OpenWorkbenchToolCommand) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "opening it")
    if not can_tool_be_sealed(tool.tool_type):
        raise ValueError(f"{tool.label} cannot be opened.")

    vent_event = physical_simulation_service.vent_opened_tool(tool)
    tool.is_sealed = False
    tool.closure_fault = None
    if vent_event is not None and vent_event.lost_mass_g > 0:
        experiment.audit_log.append(
            f"{tool.label} vented at {format_volume(vent_event.pressure_bar)} bar on {slot.label}; {format_volume(vent_event.lost_mass_g)} g of powder was lost."
        )
        return

    experiment.audit_log.append(f"{tool.label} opened on {slot.label}.")
