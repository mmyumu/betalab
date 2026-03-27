from __future__ import annotations

from app.domain.rules import is_workspace_widget_discardable
from app.domain.models import Experiment, ProduceLot, TrashProduceLotEntry, WorkbenchLiquid, new_id
from app.domain.workbench_catalog import get_workbench_liquid_definition
from app.services.command_handlers.support import (
    find_trash_produce_lot,
    find_workbench_slot,
    find_workspace_produce_lot,
    find_workspace_widget,
)


def _apply_widget_layout_payload(widget, payload: dict) -> None:
    if "anchor" in payload and "offset_x" in payload and "offset_y" in payload:
        widget.anchor = str(payload["anchor"])
        widget.offset_x = int(payload["offset_x"])
        widget.offset_y = int(payload["offset_y"])
        return

    widget.anchor = "top-left"
    widget.offset_x = int(payload["x"])
    widget.offset_y = int(payload["y"])


def add_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = find_workspace_widget(experiment.workspace, payload["widget_id"])
    _apply_widget_layout_payload(widget, payload)
    widget.is_trashed = False

    if not widget.is_present:
        widget.is_present = True
        experiment.audit_log.append(f"{widget.label} added to workspace.")
        return

    experiment.audit_log.append(f"{widget.label} repositioned in workspace.")


def move_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = find_workspace_widget(experiment.workspace, payload["widget_id"])
    if not widget.is_present:
        raise ValueError(f"{widget.label} must be added to the workspace before moving it.")

    _apply_widget_layout_payload(widget, payload)
    experiment.audit_log.append(f"{widget.label} moved in workspace.")


def discard_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = find_workspace_widget(experiment.workspace, payload["widget_id"])
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


def create_produce_lot(experiment: Experiment, payload: dict) -> None:
    produce_type = str(payload["produce_type"])
    if produce_type != "apple":
        raise ValueError("Unsupported produce type")

    apple_lot_count = sum(
        1 for lot in experiment.workspace.produce_lots if lot.produce_type == produce_type
    )
    produce_lot = ProduceLot(
        id=new_id("produce"),
        label=f"Apple lot {apple_lot_count + 1}",
        produce_type=produce_type,
        unit_count=12,
        total_mass_g=2450.0,
    )
    experiment.workspace.produce_lots.append(produce_lot)
    experiment.audit_log.append(f"{produce_lot.label} created in Produce basket.")


def add_liquid_to_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, payload["widget_id"])
    liquid_definition = get_workbench_liquid_definition(str(payload["liquid_id"]))

    if liquid_definition.id != "dry_ice_pellets":
        raise ValueError(f"{widget.label} only accepts dry ice pellets.")

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
                volume_ml=liquid_definition.transfer_volume_ml,
                accent=liquid_definition.accent,
            )
        )
        experiment.audit_log.append(f"{liquid_definition.name} added to {widget.label}.")
        return

    existing_liquid.volume_ml += liquid_definition.transfer_volume_ml
    experiment.audit_log.append(f"{liquid_definition.name} increased in {widget.label}.")


def add_workspace_produce_lot_to_widget(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, payload["widget_id"])
    produce_lot = find_workspace_produce_lot(experiment.workspace, str(payload["produce_lot_id"]))
    _add_produce_lot_to_widget(widget, produce_lot)
    experiment.workspace.produce_lots = [
        lot for lot in experiment.workspace.produce_lots if lot.id != produce_lot.id
    ]
    experiment.audit_log.append(f"{produce_lot.label} added to {widget.label}.")


def move_workbench_produce_lot_to_widget(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, payload["widget_id"])
    source_slot = find_workbench_slot(experiment.workbench, str(payload["source_slot_id"]))
    produce_lot_id = str(payload["produce_lot_id"])
    produce_lot = next(
        (
            lot
            for lot in ((source_slot.tool.produce_lots if source_slot.tool else []) + source_slot.surface_produce_lots)
            if lot.id == produce_lot_id
        ),
        None,
    )
    if produce_lot is None:
        raise ValueError("Unknown produce lot")

    if source_slot.tool is not None:
        source_slot.tool.produce_lots = [
            lot for lot in source_slot.tool.produce_lots if lot.id != produce_lot.id
        ]
    source_slot.surface_produce_lots = [
        lot for lot in source_slot.surface_produce_lots if lot.id != produce_lot.id
    ]
    _add_produce_lot_to_widget(widget, produce_lot)
    experiment.audit_log.append(f"{produce_lot.label} moved to {widget.label}.")


def restore_trashed_produce_lot_to_widget(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, payload["widget_id"])
    trashed_produce_lot = find_trash_produce_lot(experiment.trash, str(payload["trash_produce_lot_id"]))
    _add_produce_lot_to_widget(widget, trashed_produce_lot.produce_lot)
    experiment.trash.produce_lots = [
        entry for entry in experiment.trash.produce_lots if entry.id != trashed_produce_lot.id
    ]
    experiment.audit_log.append(
        f"{trashed_produce_lot.produce_lot.label} restored from trash to {widget.label}."
    )


def discard_workspace_produce_lot(experiment: Experiment, payload: dict) -> None:
    produce_lot = find_workspace_produce_lot(experiment.workspace, str(payload["produce_lot_id"]))
    experiment.workspace.produce_lots = [
        lot for lot in experiment.workspace.produce_lots if lot.id != produce_lot.id
    ]
    experiment.trash.produce_lots.append(
        TrashProduceLotEntry(
            id=new_id("trash_produce_lot"),
            origin_label="Produce basket",
            produce_lot=produce_lot,
        )
    )
    experiment.audit_log.append(f"{produce_lot.label} discarded from Produce basket.")


def _find_grinder_widget(experiment: Experiment, widget_id: str):
    widget = find_workspace_widget(experiment.workspace, widget_id)
    if widget.id != "grinder" or widget.widget_type != "cryogenic_grinder":
        raise ValueError(f"{widget.label} does not accept grinder contents.")
    return widget


def _add_produce_lot_to_widget(widget, produce_lot: ProduceLot) -> None:
    if widget.produce_lots:
        raise ValueError(f"{widget.label} already contains a produce lot.")
    widget.produce_lots.append(produce_lot)
