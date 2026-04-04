from __future__ import annotations

from app.domain.models import (
    Experiment,
    ProduceLot,
    TrashProduceLotEntry,
    WorkbenchLiquid,
    new_id,
)
from app.domain.rules import can_tool_be_sealed, is_workspace_widget_discardable
from app.domain.workbench_catalog import get_workbench_liquid_definition
from app.services.command_handlers.support import (
    find_produce_basket_lot,
    find_workspace_widget,
    find_workspace_widget_liquid,
    format_volume,
    round_volume,
)
from app.services.commands import (
    AddLiquidToWorkspaceWidgetCommand,
    AddWorkspaceProduceLotToWidgetCommand,
    AdvanceWorkspaceCryogenicsCommand,
    CreateProduceLotCommand,
    CreateReceivedSamplingBagCommand,
    DiscardWidgetProduceLotCommand,
    DiscardWorkspaceProduceLotCommand,
    MoveWidgetProduceLotToWorkbenchToolCommand,
    MoveWorkbenchProduceLotToWidgetCommand,
    RestoreTrashedProduceLotToWidgetCommand,
    UpdateWorkspaceWidgetLiquidVolumeCommand,
    WorkspaceWidgetCommand,
    WorkspaceWidgetLayoutCommand,
    WorkspaceWidgetLiquidCommand,
)
from app.services.physical_simulation_service import PhysicalSimulationService
from app.services.produce_lot_transfer import (
    GrinderProduceLotSource,
    GrinderProduceLotTarget,
    ProduceLotTransferService,
    TrashProduceLotSource,
    WorkbenchProduceLotSource,
    WorkbenchProduceLotTarget,
    WorkspaceProduceLotSource,
)
from app.services.received_sample_generation import build_received_sampling_bag

physical_simulation_service = PhysicalSimulationService()
produce_lot_transfer_service = ProduceLotTransferService()


def create_received_sampling_bag(
    experiment: Experiment,
    _command: CreateReceivedSamplingBagCommand,
) -> None:
    if experiment.basket_tool is not None:
        raise ValueError("The produce basket already contains the received sampling bag.")
    experiment.basket_tool = build_received_sampling_bag(label="Received sampling bag")
    experiment.audit_log.append(
        f"{experiment.basket_tool.produce_lots[0].label} created in a received sampling bag."
    )


def _apply_widget_layout_command(widget, command: WorkspaceWidgetLayoutCommand) -> None:
    widget.anchor = command.anchor
    widget.offset_x = command.offset_x
    widget.offset_y = command.offset_y


def add_workspace_widget(experiment: Experiment, command: WorkspaceWidgetLayoutCommand) -> None:
    widget = find_workspace_widget(experiment.workspace, command.widget_id)
    _apply_widget_layout_command(widget, command)
    widget.is_trashed = False

    if not widget.is_present:
        widget.is_present = True
        experiment.audit_log.append(f"{widget.label} added to workspace.")
        return

    experiment.audit_log.append(f"{widget.label} repositioned in workspace.")


def move_workspace_widget(experiment: Experiment, command: WorkspaceWidgetLayoutCommand) -> None:
    widget = find_workspace_widget(experiment.workspace, command.widget_id)
    if not widget.is_present:
        raise ValueError(f"{widget.label} must be added to the workspace before moving it.")

    _apply_widget_layout_command(widget, command)
    experiment.audit_log.append(f"{widget.label} moved in workspace.")


def discard_workspace_widget(experiment: Experiment, command: WorkspaceWidgetCommand) -> None:
    widget = find_workspace_widget(experiment.workspace, command.widget_id)
    if not is_workspace_widget_discardable(widget.id):
        raise ValueError(f"{widget.label} cannot be discarded.")
    if not widget.is_present and widget.is_trashed:
        return

    if not widget.is_present:
        widget.is_trashed = True
        experiment.audit_log.append(f"{widget.label} added to trash.")
        return

    widget.is_present = False
    widget.is_trashed = True
    experiment.audit_log.append(f"{widget.label} removed from workspace.")


def create_produce_lot(experiment: Experiment, command: CreateProduceLotCommand) -> None:
    produce_type = command.produce_type
    if produce_type != "apple":
        raise ValueError("Unsupported produce type")

    apple_lot_count = sum(
        1 for lot in experiment.workspace.produce_basket_lots if lot.produce_type == produce_type
    )

    produce_lot = ProduceLot(
        id=new_id("produce"),
        label=f"Apple lot {apple_lot_count + 1}",
        produce_type=produce_type,
        unit_count=12,
        total_mass_g=2450.0,
    )

    experiment.workspace.produce_basket_lots.append(produce_lot)
    experiment.audit_log.append(f"{produce_lot.label} created in Produce basket.")


def add_liquid_to_workspace_widget(
    experiment: Experiment,
    command: AddLiquidToWorkspaceWidgetCommand,
) -> None:
    widget = _find_grinder_widget(experiment, command.widget_id)
    liquid_definition = get_workbench_liquid_definition(command.liquid_id)

    if liquid_definition.id != "dry_ice_pellets":
        raise ValueError(f"{widget.label} only accepts dry ice pellets.")

    added_mass_g = round_volume(max(float(command.volume_ml or liquid_definition.transfer_volume_ml), 0.0))

    existing_liquid = next(
        (liquid for liquid in widget.liquids if liquid.liquid_id == liquid_definition.id),
        None,
    )
    if existing_liquid is None:
        widget.liquids.append(
            WorkbenchLiquid(
                id=new_id("workspace_liquid"),
                liquid_id=liquid_definition.id,
                name=liquid_definition.name,
                volume_ml=added_mass_g,
                accent=liquid_definition.accent,
            )
        )
        experiment.audit_log.append(f"{liquid_definition.name} added to {widget.label}.")
        return

    existing_liquid.volume_ml = round_volume(existing_liquid.volume_ml + added_mass_g)
    experiment.audit_log.append(f"{liquid_definition.name} increased in {widget.label}.")


def update_workspace_widget_liquid_volume(
    experiment: Experiment,
    command: UpdateWorkspaceWidgetLiquidVolumeCommand,
) -> None:
    widget = _find_grinder_widget(experiment, command.widget_id)
    liquid_entry = find_workspace_widget_liquid(widget, command.liquid_entry_id)

    liquid_entry.volume_ml = round_volume(max(float(command.volume_ml), 0.0))
    if liquid_entry.volume_ml <= 0:
        widget.liquids = [liquid for liquid in widget.liquids if liquid.id != command.liquid_entry_id]
        experiment.audit_log.append(f"{liquid_entry.name} removed from {widget.label}.")
        return

    experiment.audit_log.append(
        f"{liquid_entry.name} adjusted to {format_volume(liquid_entry.volume_ml)} g in {widget.label}."
    )


def remove_liquid_from_workspace_widget(
    experiment: Experiment,
    command: WorkspaceWidgetLiquidCommand,
) -> None:
    widget = _find_grinder_widget(experiment, command.widget_id)
    liquid_entry = find_workspace_widget_liquid(widget, command.liquid_entry_id)
    widget.liquids = [liquid for liquid in widget.liquids if liquid.id != liquid_entry.id]
    experiment.audit_log.append(f"{liquid_entry.name} removed from {widget.label}.")


def start_grinder_cycle(experiment: Experiment, command: WorkspaceWidgetCommand) -> None:
    widget = _find_grinder_widget(experiment, command.widget_id)
    if not widget.produce_lots:
        raise ValueError(f"{widget.label} does not contain a produce lot.")

    produce_lot = widget.produce_lots[0]
    if produce_lot.cut_state == "whole":
        raise ValueError(f"{produce_lot.label} must be cut before grinding.")
    if produce_lot.cut_state == "ground":
        raise ValueError(f"{produce_lot.label} is already ground.")
    if produce_lot.temperature_c > physical_simulation_service.grinder_start_threshold_c:
        raise ValueError(f"{produce_lot.label} is not cold enough for cryogenic grinding.")
    if widget.grinder_run_remaining_ms > 0:
        return

    produce_lot.grind_quality_label = None
    produce_lot.homogeneity_score = None
    produce_lot.grinding_elapsed_seconds = 0.0
    produce_lot.grinding_temperature_integral = 0.0
    cycle_duration_ms = physical_simulation_service.grinder_cycle_duration_seconds * 1000.0
    widget.grinder_run_duration_ms = cycle_duration_ms
    widget.grinder_run_remaining_ms = cycle_duration_ms
    widget.grinder_fault = None
    experiment.audit_log.append(f"{produce_lot.label} grinding started in {widget.label}.")


def complete_grinder_cycle(experiment: Experiment, command: WorkspaceWidgetCommand) -> None:
    widget = _find_grinder_widget(experiment, command.widget_id)
    if not widget.produce_lots:
        raise ValueError(f"{widget.label} does not contain a produce lot.")

    produce_lot = widget.produce_lots[0]
    if produce_lot.cut_state == "whole":
        raise ValueError(f"{produce_lot.label} must be cut before grinding.")
    if produce_lot.cut_state == "ground":
        return

    homogeneity_score, grind_quality_label = physical_simulation_service.score_grind_result(produce_lot)
    residual_dry_ice_mass_g = sum(liquid.volume_ml for liquid in widget.liquids if liquid.liquid_id == "dry_ice_pellets")
    produce_lot.cut_state = "ground"
    produce_lot.homogeneity_score = homogeneity_score
    produce_lot.grind_quality_label = grind_quality_label
    produce_lot.residual_co2_mass_g = round_volume(max(residual_dry_ice_mass_g, 0.0))
    widget.grinder_run_duration_ms = 0.0
    widget.grinder_run_remaining_ms = 0.0
    widget.grinder_fault = None
    widget.liquids = [liquid for liquid in widget.liquids if liquid.liquid_id != "dry_ice_pellets"]
    experiment.audit_log.append(f"{produce_lot.label} ground in {widget.label}.")


def advance_workspace_cryogenics(
    experiment: Experiment,
    command: AdvanceWorkspaceCryogenicsCommand,
) -> None:
    elapsed_ms = min(max(float(command.elapsed_ms), 0.0), 5000.0)
    if elapsed_ms <= 0:
        return

    elapsed_seconds = elapsed_ms / 1000.0
    for widget in experiment.workspace.widgets:
        remaining_seconds = elapsed_seconds
        if widget.grinder_run_remaining_ms > 0:
            grinding_seconds = min(remaining_seconds, widget.grinder_run_remaining_ms / 1000.0)
            physical_simulation_service.advance_grinding_widget(widget, grinding_seconds)
            widget.grinder_run_remaining_ms = round_volume(
                max(widget.grinder_run_remaining_ms - (grinding_seconds * 1000.0), 0.0)
            )
            remaining_seconds -= grinding_seconds

            loaded_lot = widget.produce_lots[0] if widget.produce_lots else None
            if loaded_lot is not None and loaded_lot.temperature_c >= physical_simulation_service.grinder_jam_threshold_c:
                widget.grinder_run_duration_ms = 0.0
                widget.grinder_run_remaining_ms = 0.0
                widget.grinder_fault = "motor_jammed"
                _discard_jammed_grinder_contents(experiment, widget, loaded_lot)
                continue

            if loaded_lot is not None and loaded_lot.temperature_c >= physical_simulation_service.grinder_start_threshold_c:
                widget.grinder_fault = "high_torque"
            elif widget.grinder_fault == "high_torque":
                widget.grinder_fault = None

            if widget.grinder_run_remaining_ms <= 0:
                complete_grinder_cycle(experiment, WorkspaceWidgetCommand(widget_id=widget.id))

        if remaining_seconds > 0:
            physical_simulation_service.advance_widget(widget, remaining_seconds)

    for slot in experiment.workbench.slots:
        if slot.tool is not None:
            if slot.tool.is_sealed and can_tool_be_sealed(slot.tool.tool_type):
                pressure_event = physical_simulation_service.advance_sealed_tool(
                    slot.tool,
                    elapsed_seconds,
                )
                if pressure_event is not None and pressure_event.fault == "pressure_pop":
                    first_lot_label = (
                        slot.tool.produce_lots[0].label if slot.tool.produce_lots else "the sample"
                    )
                    experiment.audit_log.append(
                        f"{slot.tool.label} popped open on {slot.label} at {format_volume(pressure_event.pressure_bar)} bar; {format_volume(pressure_event.lost_mass_g)} g of {first_lot_label} was lost."
                    )
            else:
                physical_simulation_service.warm_produce_lots(slot.tool.produce_lots, elapsed_seconds)
        physical_simulation_service.warm_produce_lots(slot.surface_produce_lots, elapsed_seconds)


def add_workspace_produce_lot_to_widget(
    experiment: Experiment,
    command: AddWorkspaceProduceLotToWidgetCommand,
) -> None:
    transfer = produce_lot_transfer_service.transfer(
        experiment,
        WorkspaceProduceLotSource(produce_lot_id=command.produce_lot_id),
        GrinderProduceLotTarget(widget_id=command.widget_id),
    )
    experiment.audit_log.append(f"{transfer.produce_lot.label} added to {transfer.location_label}.")


def move_workbench_produce_lot_to_widget(
    experiment: Experiment,
    command: MoveWorkbenchProduceLotToWidgetCommand,
) -> None:
    transfer = produce_lot_transfer_service.transfer(
        experiment,
        WorkbenchProduceLotSource(
            slot_id=command.source_slot_id,
            produce_lot_id=command.produce_lot_id,
        ),
        GrinderProduceLotTarget(widget_id=command.widget_id),
    )
    experiment.audit_log.append(f"{transfer.produce_lot.label} moved to {transfer.location_label}.")


def restore_trashed_produce_lot_to_widget(
    experiment: Experiment,
    command: RestoreTrashedProduceLotToWidgetCommand,
) -> None:
    transfer = produce_lot_transfer_service.transfer(
        experiment,
        TrashProduceLotSource(trash_produce_lot_id=command.trash_produce_lot_id),
        GrinderProduceLotTarget(widget_id=command.widget_id),
    )
    experiment.audit_log.append(
        f"{transfer.produce_lot.label} restored from trash to {transfer.location_label}."
    )


def move_widget_produce_lot_to_workbench_tool(
    experiment: Experiment,
    command: MoveWidgetProduceLotToWorkbenchToolCommand,
) -> None:
    transfer = produce_lot_transfer_service.transfer(
        experiment,
        GrinderProduceLotSource(
            widget_id=command.widget_id,
            produce_lot_id=command.produce_lot_id,
        ),
        WorkbenchProduceLotTarget(slot_id=command.target_slot_id),
    )
    if transfer.contamination_applied:
        experiment.audit_log.append(
            f"{transfer.produce_lot.label} moved from {transfer.source_label} to {transfer.target_label} and marked contaminated."
        )
        return

    experiment.audit_log.append(
        f"{transfer.produce_lot.label} moved from {transfer.source_label} to {transfer.target_label}."
    )


def discard_workspace_produce_lot(
    experiment: Experiment,
    command: DiscardWorkspaceProduceLotCommand,
) -> None:
    produce_lot = find_produce_basket_lot(experiment.workspace, command.produce_lot_id)
    experiment.workspace.produce_basket_lots = [
        lot for lot in experiment.workspace.produce_basket_lots if lot.id != produce_lot.id
    ]
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=new_id("trash_produce_lot"),
            origin_label="Produce basket",
            produce_lot=produce_lot,
        )
    )
    experiment.audit_log.append(f"{produce_lot.label} discarded from Produce basket.")


def discard_widget_produce_lot(
    experiment: Experiment,
    command: DiscardWidgetProduceLotCommand,
) -> None:
    widget = _find_grinder_widget(experiment, command.widget_id)
    produce_lot = _remove_widget_produce_lot(widget, command.produce_lot_id)
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=new_id("trash_produce_lot"),
            origin_label=widget.label,
            produce_lot=produce_lot,
        )
    )
    experiment.audit_log.append(f"{produce_lot.label} discarded from {widget.label}.")


def _find_grinder_widget(experiment: Experiment, widget_id: str):
    widget = find_workspace_widget(experiment.workspace, widget_id)
    if widget.id != "grinder" or widget.widget_type != "cryogenic_grinder":
        raise ValueError(f"{widget.label} does not accept grinder contents.")
    return widget


def _discard_jammed_grinder_contents(
    experiment: Experiment,
    widget,
    produce_lot: ProduceLot,
) -> None:
    produce_lot.cut_state = "waste"
    produce_lot.grind_quality_label = "waste"
    produce_lot.homogeneity_score = 0.0
    widget.liquids = []
    experiment.audit_log.append(f"{produce_lot.label} jammed {widget.label} motor and became waste.")


def _remove_widget_produce_lot(widget, produce_lot_id: str) -> ProduceLot:
    produce_lot = next((lot for lot in widget.produce_lots if lot.id == produce_lot_id), None)
    if produce_lot is None:
        raise ValueError("Unknown produce lot")

    widget.produce_lots = [lot for lot in widget.produce_lots if lot.id != produce_lot.id]
    return produce_lot
