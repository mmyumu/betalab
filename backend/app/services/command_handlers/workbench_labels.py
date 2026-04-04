from __future__ import annotations

from app.domain.models import Experiment, TrashSampleLabelEntry, new_id
from app.services.command_handlers.support import (
    build_manual_label,
    find_tool_label,
    find_trash_sample_label,
    find_workbench_slot,
)
from app.services.command_handlers.workbench_shared import pop_tool_label, require_slot_tool
from app.services.commands import (
    ApplySampleLabelToWorkbenchToolCommand,
    MoveSampleLabelBetweenWorkbenchToolsCommand,
    RestoreTrashedSampleLabelToWorkbenchToolCommand,
    UpdateWorkbenchToolSampleLabelTextCommand,
    WorkbenchSampleLabelCommand,
)


def apply_sample_label_to_workbench_tool(
    experiment: Experiment,
    command: ApplySampleLabelToWorkbenchToolCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "adding a sample label")
    tool.labels.append(build_manual_label())
    experiment.audit_log.append(f"Manual label applied to {tool.label} on {slot.label}.")


def update_workbench_tool_sample_label_text(
    experiment: Experiment,
    command: UpdateWorkbenchToolSampleLabelTextCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "editing its sample label")
    label = find_tool_label(tool, command.label_id)
    if label.label_kind != "manual":
        raise ValueError("Only manual labels can be edited.")

    next_text = command.sample_label_text.strip()
    label.text = next_text
    if next_text:
        experiment.audit_log.append(f"Sample label updated to {next_text} on {tool.label}.")
        return

    experiment.audit_log.append(f"Sample label cleared on {tool.label}.")


def move_sample_label_between_workbench_tools(
    experiment: Experiment,
    command: MoveSampleLabelBetweenWorkbenchToolsCommand,
) -> None:
    source_slot = find_workbench_slot(experiment.workbench, command.source_slot_id)
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

    if source_slot.id == target_slot.id:
        return
    source_tool = require_slot_tool(source_slot, "moving its sample label")
    target_tool = require_slot_tool(target_slot, "adding a sample label")
    label = pop_tool_label(source_tool, command.label_id)
    target_tool.labels.append(label)
    experiment.audit_log.append(
        f"Label moved from {source_tool.label} on {source_slot.label} to {target_tool.label} on {target_slot.label}."
    )


def discard_sample_label_from_workbench_tool(
    experiment: Experiment,
    command: WorkbenchSampleLabelCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    tool = require_slot_tool(slot, "removing its sample label")
    label = pop_tool_label(tool, command.label_id)
    experiment.trash.sample_labels.append(
        TrashSampleLabelEntry(
            id=new_id("trash_sample_label"),
            origin_label=tool.label,
            label=label,
        )
    )
    experiment.audit_log.append(f"Label discarded from {tool.label}.")


def restore_trashed_sample_label_to_workbench_tool(
    experiment: Experiment,
    command: RestoreTrashedSampleLabelToWorkbenchToolCommand,
) -> None:
    trashed_sample_label = find_trash_sample_label(
        experiment.trash, command.trash_sample_label_id
    )
    target_slot = find_workbench_slot(experiment.workbench, command.target_slot_id)

    target_tool = require_slot_tool(target_slot, "adding a sample label")
    target_tool.labels.append(trashed_sample_label.label)
    experiment.trash.sample_labels = [
        entry
        for entry in experiment.trash.sample_labels
        if entry.id != trashed_sample_label.id
    ]
    experiment.audit_log.append(
        f"Label restored from trash to {target_tool.label} on {target_slot.label}."
    )
