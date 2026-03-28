from __future__ import annotations

from app.domain.rules import is_workspace_widget_discardable
from app.domain.models import Experiment, ProduceLot, TrashProduceLotEntry, WorkbenchLiquid, new_id
from app.domain.workbench_catalog import get_workbench_liquid_definition
from app.services.cryogenic_simulation_service import CryogenicSimulationService
from app.services.command_handlers.support import (
    find_trash_produce_lot,
    find_workbench_slot,
    find_workspace_produce_lot,
    find_workspace_widget_liquid,
    format_volume,
    find_workspace_widget,
    round_volume,
)

cryogenic_simulation_service = CryogenicSimulationService()


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

    added_mass_g = round_volume(
        max(float(payload.get("volume_ml", liquid_definition.transfer_volume_ml)), 0.0)
    )

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


def update_workspace_widget_liquid_volume(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, str(payload["widget_id"]))
    liquid_entry = find_workspace_widget_liquid(widget, str(payload["liquid_entry_id"]))

    liquid_entry.volume_ml = round_volume(max(float(payload["volume_ml"]), 0.0))
    experiment.audit_log.append(
        f"{liquid_entry.name} adjusted to {format_volume(liquid_entry.volume_ml)} g in {widget.label}."
    )


def remove_liquid_from_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, str(payload["widget_id"]))
    liquid_entry = find_workspace_widget_liquid(widget, str(payload["liquid_entry_id"]))
    widget.liquids = [liquid for liquid in widget.liquids if liquid.id != liquid_entry.id]
    experiment.audit_log.append(f"{liquid_entry.name} removed from {widget.label}.")


def complete_grinder_cycle(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, str(payload["widget_id"]))
    if not widget.produce_lots:
        raise ValueError(f"{widget.label} does not contain a produce lot.")

    produce_lot = widget.produce_lots[0]
    if produce_lot.cut_state == "whole":
        raise ValueError(f"{produce_lot.label} must be cut before grinding.")
    if produce_lot.cut_state == "ground":
        return

    produce_lot.cut_state = "ground"
    widget.liquids = []
    experiment.audit_log.append(f"{produce_lot.label} ground in {widget.label}.")


def advance_workspace_cryogenics(experiment: Experiment, payload: dict) -> None:
    elapsed_ms = min(max(float(payload.get("elapsed_ms", 0.0)), 0.0), 5000.0)
    if elapsed_ms <= 0:
        return

    elapsed_seconds = elapsed_ms / 1000.0
    for widget in experiment.workspace.widgets:
        cryogenic_simulation_service.advance_widget(widget, elapsed_seconds)


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


def move_widget_produce_lot_to_workbench_tool(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, payload["widget_id"])
    target_slot = find_workbench_slot(experiment.workbench, str(payload["target_slot_id"]))
    produce_lot = _remove_widget_produce_lot(widget, str(payload["produce_lot_id"]))

    if target_slot.tool is None:
        if target_slot.surface_produce_lots:
            raise ValueError(f"{target_slot.label} already contains produce.")
        target_slot.surface_produce_lots.append(produce_lot)
        produce_lot.is_contaminated = True
        experiment.audit_log.append(
            f"{produce_lot.label} moved from {widget.label} to {target_slot.label} and marked contaminated."
        )
        return

    if target_slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{target_slot.tool.label} does not accept produce.")
    if target_slot.tool.produce_lots:
        raise ValueError(f"{target_slot.tool.label} already contains produce.")

    target_slot.tool.produce_lots.append(produce_lot)
    experiment.audit_log.append(f"{produce_lot.label} moved from {widget.label} to {target_slot.tool.label}.")


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


def discard_widget_produce_lot(experiment: Experiment, payload: dict) -> None:
    widget = _find_grinder_widget(experiment, payload["widget_id"])
    produce_lot = _remove_widget_produce_lot(widget, str(payload["produce_lot_id"]))
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


def _add_produce_lot_to_widget(widget, produce_lot: ProduceLot) -> None:
    if widget.produce_lots:
        raise ValueError(f"{widget.label} already contains a produce lot.")
    widget.produce_lots.append(produce_lot)


def _remove_widget_produce_lot(widget, produce_lot_id: str) -> ProduceLot:
    produce_lot = next((lot for lot in widget.produce_lots if lot.id == produce_lot_id), None)
    if produce_lot is None:
        raise ValueError("Unknown produce lot")

    widget.produce_lots = [lot for lot in widget.produce_lots if lot.id != produce_lot.id]
    return produce_lot
