from __future__ import annotations

from app.domain.models import EntityOrigin, Experiment, TrashProduceLotEntry, TrashToolEntry
from app.domain.rules import can_tool_accept_produce, can_tool_be_sealed, can_tool_receive_contents
from app.services.command_handlers.support import (
    find_rack_slot,
    find_trash_tool,
    find_workbench_slot,
    find_workspace_widget,
)
from app.services.commands import (
    CloseGrossBalanceToolCommand,
    DiscardGrossBalanceProduceLotCommand,
    DiscardGrossBalanceToolCommand,
    MoveBasketToolToGrossBalanceCommand,
    MoveGrossBalanceProduceLotToWidgetCommand,
    MoveGrossBalanceProduceLotToWorkbenchCommand,
    MoveGrossBalanceToolToRackCommand,
    MoveGrossBalanceToolToWorkbenchCommand,
    MoveRackToolToGrossBalanceCommand,
    MoveWidgetProduceLotToGrossBalanceCommand,
    MoveWorkbenchProduceLotToGrossBalanceCommand,
    MoveWorkbenchToolToGrossBalanceCommand,
    MoveWorkspaceProduceLotToGrossBalanceCommand,
    OpenGrossBalanceToolCommand,
    PlaceToolOnGrossBalanceCommand,
    RestoreTrashedProduceLotToGrossBalanceCommand,
    RestoreTrashedToolToGrossBalanceCommand,
)
from app.services.produce_lot_transfer import (
    GrinderProduceLotSource,
    GrinderProduceLotTarget,
    ProduceLotPlacement,
    ProduceLotRemoval,
    ProduceLotTransferService,
    TrashProduceLotSource,
    WorkbenchProduceLotSource,
    WorkbenchProduceLotTarget,
    WorkspaceProduceLotSource,
)
from app.services.received_sample_generation import resolve_received_bag_gross_mass_g
from app.services.command_handlers.workbench import build_workbench_tool

produce_lot_transfer_service = ProduceLotTransferService()


def move_workbench_tool_to_gross_balance(
    experiment: Experiment,
    command: MoveWorkbenchToolToGrossBalanceCommand,
) -> None:
    source_slot = find_workbench_slot(experiment.workbench, command.source_slot_id)
    if source_slot.tool is None:
        raise ValueError(f"{source_slot.label} does not contain a tool.")
    moved_tool = source_slot.tool
    source_slot.tool = None
    _place_tool_on_balance(experiment, moved_tool)


def move_basket_tool_to_gross_balance(
    experiment: Experiment,
    _command: MoveBasketToolToGrossBalanceCommand,
) -> None:
    if experiment.basket_tool is None:
        raise ValueError("The produce basket does not contain a tool.")
    moved_tool = experiment.basket_tool
    experiment.basket_tool = None
    _place_tool_on_balance(experiment, moved_tool)


def place_tool_on_gross_balance(
    experiment: Experiment,
    command: PlaceToolOnGrossBalanceCommand,
) -> None:
    _place_tool_on_balance(experiment, build_workbench_tool(command.tool_id))


def move_rack_tool_to_gross_balance(
    experiment: Experiment,
    command: MoveRackToolToGrossBalanceCommand,
) -> None:
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)
    if rack_slot.tool is None:
        raise ValueError(f"{rack_slot.label} does not contain a tool.")
    moved_tool = rack_slot.tool
    rack_slot.tool = None
    _place_tool_on_balance(experiment, moved_tool)


def restore_trashed_tool_to_gross_balance(
    experiment: Experiment,
    command: RestoreTrashedToolToGrossBalanceCommand,
) -> None:
    trashed_tool = find_trash_tool(experiment.trash, command.trash_tool_id)
    restored_tool = trashed_tool.tool
    experiment.trash.tools = [
        entry for entry in experiment.trash.tools if entry.id != trashed_tool.id
    ]
    _place_tool_on_balance(
        experiment,
        restored_tool,
        action_verb="restored onto",
    )


def move_gross_balance_tool_to_workbench(
    experiment: Experiment,
    command: MoveGrossBalanceToolToWorkbenchCommand,
) -> None:
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)
    if target_slot.tool is not None or target_slot.surface_produce_lots:
        raise ValueError(f"{target_slot.label} already contains a tool")
    moved_tool = _take_tool_from_balance(experiment)
    target_slot.tool = moved_tool
    _append_tool_moved_from_balance_audit(experiment, moved_tool.label, target_slot.label)


def move_gross_balance_tool_to_rack(
    experiment: Experiment,
    command: MoveGrossBalanceToolToRackCommand,
) -> None:
    rack_slot = find_rack_slot(experiment.rack, command.rack_slot_id)
    moved_tool = _require_gross_balance_tool(experiment)
    if moved_tool.tool_type != "sample_vial":
        raise ValueError(f"{moved_tool.label} does not fit in the rack.")
    if rack_slot.tool is not None:
        raise ValueError(f"{rack_slot.label} already contains a tool.")
    rack_slot.tool = _take_tool_from_balance(experiment)
    _append_tool_moved_from_balance_audit(experiment, rack_slot.tool.label, rack_slot.label)


def discard_gross_balance_tool(
    experiment: Experiment,
    _command: DiscardGrossBalanceToolCommand,
) -> None:
    widget = _find_gross_balance_widget(experiment)
    removed_tool = _take_tool_from_balance(experiment)
    experiment.trash.tools.append(
        TrashToolEntry(
            id=f"trash_tool_{removed_tool.id}",
            origin_label=widget.label,
            tool=removed_tool,
        )
    )
    experiment.audit_log.append(f"{removed_tool.label} discarded from {widget.label}.")


def open_gross_balance_tool(experiment: Experiment, _command: OpenGrossBalanceToolCommand) -> None:
    tool = _require_gross_balance_tool(experiment)
    if not can_tool_be_sealed(tool.tool_type):
        raise ValueError(f"{tool.label} does not support sealing.")
    tool.is_sealed = False
    experiment.audit_log.append(f"{tool.label} opened on Gross balance.")


def close_gross_balance_tool(experiment: Experiment, _command: CloseGrossBalanceToolCommand) -> None:
    tool = _require_gross_balance_tool(experiment)
    if not can_tool_be_sealed(tool.tool_type):
        raise ValueError(f"{tool.label} does not support sealing.")
    tool.is_sealed = True
    experiment.audit_log.append(f"{tool.label} sealed on Gross balance.")


class GrossBalanceProduceLotTarget:
    def validate(self, experiment: Experiment) -> None:
        widget = _find_gross_balance_widget(experiment)
        if widget.tool is not None:
            if not can_tool_accept_produce(widget.tool.tool_type):
                raise ValueError(f"{widget.tool.label} does not accept produce.")
            if not can_tool_receive_contents(widget.tool.tool_type, widget.tool.is_sealed):
                raise ValueError(f"Open {widget.tool.label} before adding produce.")
            if widget.tool.produce_lots:
                raise ValueError(f"{widget.tool.label} already contains a produce lot.")
            return

        if widget.produce_lots:
            raise ValueError(f"{widget.label} already contains a produce lot.")

    def place(self, experiment: Experiment, produce_lot) -> ProduceLotPlacement:
        widget = _find_gross_balance_widget(experiment)
        if widget.tool is not None:
            widget.tool.produce_lots.append(produce_lot)
            _update_balance_measured_mass(experiment)
            return ProduceLotPlacement(
                target_label=widget.tool.label,
                location_label=f"{widget.tool.label} on {widget.label}",
            )

        widget.produce_lots.append(produce_lot)
        _update_balance_measured_mass(experiment)
        return ProduceLotPlacement(target_label=widget.label, location_label=widget.label)


class GrossBalanceProduceLotSource:
    def __init__(self, produce_lot_id: str):
        self.produce_lot_id = produce_lot_id

    def remove(self, experiment: Experiment) -> ProduceLotRemoval:
        produce_lot, source_label, origin = _remove_gross_balance_produce_lot(
            experiment,
            self.produce_lot_id,
        )
        return ProduceLotRemoval(produce_lot=produce_lot, source_label=source_label, origin=origin)


def move_workspace_produce_lot_to_gross_balance(
    experiment: Experiment,
    command: MoveWorkspaceProduceLotToGrossBalanceCommand,
) -> None:
    result = produce_lot_transfer_service.transfer(
        experiment,
        WorkspaceProduceLotSource(command.produce_lot_id),
        GrossBalanceProduceLotTarget(),
    )
    experiment.audit_log.append(f"{result.produce_lot.label} moved from {result.source_label} to {result.target_label}.")


def move_workbench_produce_lot_to_gross_balance(
    experiment: Experiment,
    command: MoveWorkbenchProduceLotToGrossBalanceCommand,
) -> None:
    result = produce_lot_transfer_service.transfer(
        experiment,
        WorkbenchProduceLotSource(command.source_slot_id, command.produce_lot_id),
        GrossBalanceProduceLotTarget(),
    )
    experiment.audit_log.append(f"{result.produce_lot.label} moved from {result.source_label} to {result.target_label}.")


def move_widget_produce_lot_to_gross_balance(
    experiment: Experiment,
    command: MoveWidgetProduceLotToGrossBalanceCommand,
) -> None:
    result = produce_lot_transfer_service.transfer(
        experiment,
        GrinderProduceLotSource(command.widget_id, command.produce_lot_id),
        GrossBalanceProduceLotTarget(),
    )
    experiment.audit_log.append(f"{result.produce_lot.label} moved from {result.source_label} to {result.target_label}.")


def restore_trashed_produce_lot_to_gross_balance(
    experiment: Experiment,
    command: RestoreTrashedProduceLotToGrossBalanceCommand,
) -> None:
    result = produce_lot_transfer_service.transfer(
        experiment,
        TrashProduceLotSource(command.trash_produce_lot_id),
        GrossBalanceProduceLotTarget(),
    )
    experiment.audit_log.append(f"{result.produce_lot.label} moved from {result.source_label} to {result.target_label}.")


def move_gross_balance_produce_lot_to_workbench(
    experiment: Experiment,
    command: MoveGrossBalanceProduceLotToWorkbenchCommand,
) -> None:
    result = produce_lot_transfer_service.transfer(
        experiment,
        GrossBalanceProduceLotSource(command.produce_lot_id),
        WorkbenchProduceLotTarget(command.target_slot_id),
    )
    experiment.audit_log.append(f"{result.produce_lot.label} moved from {result.source_label} to {result.target_label}.")


def move_gross_balance_produce_lot_to_widget(
    experiment: Experiment,
    command: MoveGrossBalanceProduceLotToWidgetCommand,
) -> None:
    result = produce_lot_transfer_service.transfer(
        experiment,
        GrossBalanceProduceLotSource(command.produce_lot_id),
        GrinderProduceLotTarget(command.widget_id),
    )
    experiment.audit_log.append(f"{result.produce_lot.label} moved from {result.source_label} to {result.target_label}.")


def discard_gross_balance_produce_lot(
    experiment: Experiment,
    command: DiscardGrossBalanceProduceLotCommand,
) -> None:
    produce_lot, source_label, origin = _remove_gross_balance_produce_lot(
        experiment,
        command.produce_lot_id,
    )
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=f"trash_produce_{produce_lot.id}",
            origin_label=source_label,
            produce_lot=produce_lot,
            origin=origin,
        )
    )
    experiment.audit_log.append(f"{produce_lot.label} discarded from {source_label}.")


def _find_gross_balance_widget(experiment: Experiment):
    widget = find_workspace_widget(experiment.workspace, "gross_balance")
    if widget.widget_type != "gross_balance":
        raise ValueError(f"{widget.label} is not a gross balance.")
    return widget


def _validate_balance_empty(widget) -> None:
    if widget.tool is not None or widget.produce_lots:
        raise ValueError(f"{widget.label} already contains an item.")


def _require_gross_balance_tool(experiment: Experiment):
    widget = _find_gross_balance_widget(experiment)
    if widget.tool is None:
        raise ValueError(f"{widget.label} does not contain a tool.")
    return widget.tool


def _place_tool_on_balance(
    experiment: Experiment,
    tool,
    *,
    action_verb: str = "placed on",
) -> None:
    widget = _find_gross_balance_widget(experiment)
    _validate_balance_empty(widget)
    widget.tool = tool
    _update_balance_measured_mass(experiment)
    experiment.audit_log.append(f"{tool.label} {action_verb} {widget.label}.")


def _take_tool_from_balance(experiment: Experiment):
    widget = _find_gross_balance_widget(experiment)
    if widget.tool is None:
        raise ValueError(f"{widget.label} does not contain a tool.")
    removed_tool = widget.tool
    widget.tool = None
    _update_balance_measured_mass(experiment)
    return removed_tool


def _append_tool_moved_from_balance_audit(
    experiment: Experiment,
    tool_label: str,
    target_label: str,
) -> None:
    widget = _find_gross_balance_widget(experiment)
    experiment.audit_log.append(f"{tool_label} moved from {widget.label} to {target_label}.")


def _update_balance_measured_mass(experiment: Experiment) -> None:
    widget = _find_gross_balance_widget(experiment)
    if widget.tool is not None:
        measured_mass_g = resolve_received_bag_gross_mass_g(widget.tool)
        if measured_mass_g is None:
            measured_mass_g = _estimate_tool_mass(widget.tool)
    elif widget.produce_lots:
        measured_mass_g = round(widget.produce_lots[0].total_mass_g, 1)
    else:
        measured_mass_g = None
    experiment.lims_reception.measured_gross_mass_g = measured_mass_g


def _estimate_tool_mass(tool) -> float:
    tare_by_tool_type = {
        "volumetric_flask": 140,
        "amber_bottle": 95,
        "sample_vial": 1.5,
        "beaker": 68,
        "centrifuge_tube": 12,
        "cleanup_tube": 7,
        "cutting_board": 320,
        "sample_bag": 36,
        "storage_jar": 180,
    }
    produce_mass_g = sum(lot.total_mass_g for lot in tool.produce_lots)
    liquid_mass_g = sum(liquid.volume_ml for liquid in tool.liquids)
    return round(tare_by_tool_type.get(tool.tool_type, 0) + produce_mass_g + liquid_mass_g, 1)


def _remove_gross_balance_produce_lot(experiment: Experiment, produce_lot_id: str):
    widget = _find_gross_balance_widget(experiment)
    if widget.tool is not None:
        produce_lot = next((lot for lot in widget.tool.produce_lots if lot.id == produce_lot_id), None)
        if produce_lot is not None:
            widget.tool.produce_lots = [
                lot for lot in widget.tool.produce_lots if lot.id != produce_lot_id
            ]
            _update_balance_measured_mass(experiment)
            return produce_lot, widget.label, EntityOrigin(
                kind="gross_balance_tool",
                location_id=widget.id,
                location_label=widget.label,
                container_id=widget.tool.id,
                container_label=widget.tool.label,
            )

    produce_lot = next((lot for lot in widget.produce_lots if lot.id == produce_lot_id), None)
    if produce_lot is None:
        raise ValueError(f"{widget.label} does not contain produce lot {produce_lot_id}.")
    widget.produce_lots = [lot for lot in widget.produce_lots if lot.id != produce_lot_id]
    _update_balance_measured_mass(experiment)
    return produce_lot, widget.label, EntityOrigin(
        kind="gross_balance_surface",
        location_id=widget.id,
        location_label=widget.label,
    )
