from __future__ import annotations

from app.domain.models import Experiment, ProduceItem, new_id
from app.services.command_handlers.support import find_workspace_widget


def add_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = find_workspace_widget(experiment.workspace, payload["widget_id"])
    widget.x = int(payload["x"])
    widget.y = int(payload["y"])
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

    widget.x = int(payload["x"])
    widget.y = int(payload["y"])
    experiment.audit_log.append(f"{widget.label} moved in workspace.")


def discard_workspace_widget(experiment: Experiment, payload: dict) -> None:
    widget = find_workspace_widget(experiment.workspace, payload["widget_id"])
    if not widget.trashable:
        raise ValueError(f"{widget.label} cannot be discarded.")
    if not widget.is_present:
        return

    widget.is_present = False
    widget.is_trashed = True
    experiment.audit_log.append(f"{widget.label} removed from workspace.")


def create_produce_item(experiment: Experiment, payload: dict) -> None:
    produce_type = str(payload["produce_type"])
    if produce_type != "apple":
        raise ValueError("Unsupported produce type")

    apple_count = sum(
        1 for item in experiment.workspace.produce_items if item.produce_type == produce_type
    )
    produce_item = ProduceItem(
        id=new_id("produce"),
        label=f"Apple {apple_count + 1}",
        produce_type=produce_type,
    )
    experiment.workspace.produce_items.append(produce_item)
    experiment.audit_log.append(f"{produce_item.label} created in Produce basket.")
