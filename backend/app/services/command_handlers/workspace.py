from __future__ import annotations

from app.domain.rules import is_workspace_widget_discardable
from app.domain.models import Experiment, ProduceLot, TrashProduceLotEntry, new_id
from app.services.command_handlers.support import find_workspace_produce_lot, find_workspace_widget


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
