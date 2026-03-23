from __future__ import annotations

from dataclasses import asdict

from app.domain.models import (
    Experiment,
    ExperimentStatus,
    Rack,
    RackSlot,
    Trash,
    TrashToolEntry,
    Workspace,
    WorkspaceWidget,
    Workbench,
    WorkbenchLiquid,
    WorkbenchSlot,
    WorkbenchTool,
    new_id,
)
from app.domain.workbench_catalog import (
    get_workbench_liquid_definition,
    get_workbench_tool_definition,
)
from app.schemas.experiment import ExperimentSchema


class ExperimentNotFoundError(KeyError):
    pass


class ExperimentService:
    def __init__(self) -> None:
        self._experiments: dict[str, Experiment] = {}

    def create_experiment(self) -> ExperimentSchema:
        experiment = Experiment(
            id=new_id("experiment"),
            status=ExperimentStatus.PREPARING,
            workbench=Workbench(
                slots=[
                    WorkbenchSlot(id="station_1", label="Station 1"),
                    WorkbenchSlot(id="station_2", label="Station 2"),
                    WorkbenchSlot(id="station_3", label="Station 3"),
                    WorkbenchSlot(id="station_4", label="Station 4"),
                ]
            ),
            rack=Rack(
                slots=[
                    RackSlot(id=f"rack_slot_{index}", label=f"Position {index}")
                    for index in range(1, 13)
                ]
            ),
            trash=Trash(),
            workspace=Workspace(
                widgets=[
                    WorkspaceWidget(
                        id="workbench",
                        widget_type="workbench",
                        label="Workbench",
                        x=234,
                        y=0,
                        is_present=True,
                        trashable=False,
                    ),
                    WorkspaceWidget(
                        id="trash",
                        widget_type="trash",
                        label="Trash",
                        x=1530,
                        y=0,
                        is_present=True,
                        trashable=False,
                    ),
                    WorkspaceWidget(
                        id="rack",
                        widget_type="autosampler_rack",
                        label="Autosampler rack",
                        x=234,
                        y=886,
                        is_present=False,
                        trashable=True,
                    ),
                    WorkspaceWidget(
                        id="instrument",
                        widget_type="lc_msms_instrument",
                        label="LC-MS/MS",
                        x=812,
                        y=886,
                        is_present=False,
                        trashable=True,
                    ),
                ]
            ),
            audit_log=[
                "Experiment created",
                "Start by dragging an extraction tool onto the bench.",
            ],
        )
        self._experiments[experiment.id] = experiment
        return self._to_schema(experiment)

    def get_experiment(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)
        return self._to_schema(experiment)

    def apply_command(
        self, experiment_id: str, command_type: str, payload: dict
    ) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)

        handlers = {
            "place_tool_on_workbench": self._place_tool_on_workbench,
            "move_tool_between_workbench_slots": self._move_tool_between_workbench_slots,
            "discard_workbench_tool": self._discard_workbench_tool,
            "restore_trashed_tool_to_workbench_slot": self._restore_trashed_tool_to_workbench_slot,
            "add_workspace_widget": self._add_workspace_widget,
            "move_workspace_widget": self._move_workspace_widget,
            "discard_workspace_widget": self._discard_workspace_widget,
            "place_workbench_tool_in_rack_slot": self._place_workbench_tool_in_rack_slot,
            "remove_rack_tool_to_workbench_slot": self._remove_rack_tool_to_workbench_slot,
            "discard_rack_tool": self._discard_rack_tool,
            "restore_trashed_tool_to_rack_slot": self._restore_trashed_tool_to_rack_slot,
            "add_liquid_to_workbench_tool": self._add_liquid_to_workbench_tool,
            "remove_liquid_from_workbench_tool": self._remove_liquid_from_workbench_tool,
            "update_workbench_liquid_volume": self._update_workbench_liquid_volume,
        }
        handlers[command_type](experiment, payload)
        return self._to_schema(experiment)

    def _place_tool_on_workbench(self, experiment: Experiment, payload: dict) -> None:
        slot = _find_workbench_slot(experiment.workbench, payload["slot_id"])
        if slot.tool is not None:
            raise ValueError(f"{slot.label} already contains a tool")

        tool_definition = get_workbench_tool_definition(payload["tool_id"])
        slot.tool = WorkbenchTool(
            id=new_id("bench_tool"),
            tool_id=tool_definition.id,
            label=tool_definition.name,
            subtitle=tool_definition.subtitle,
            accent=tool_definition.accent,
            tool_type=tool_definition.tool_type,
            capacity_ml=tool_definition.capacity_ml,
            accepts_liquids=tool_definition.accepts_liquids,
            trashable=True,
        )
        experiment.audit_log.append(f"{slot.tool.label} placed on {slot.label}.")

    def _move_tool_between_workbench_slots(self, experiment: Experiment, payload: dict) -> None:
        source_slot = _find_workbench_slot(experiment.workbench, payload["source_slot_id"])
        target_slot = _find_workbench_slot(experiment.workbench, payload["target_slot_id"])

        if source_slot.id == target_slot.id:
            return
        if source_slot.tool is None:
            raise ValueError(f"Place a tool on {source_slot.label} before moving it.")
        if target_slot.tool is not None:
            raise ValueError(f"{target_slot.label} already contains a tool")

        moved_tool = source_slot.tool
        source_slot.tool = None
        target_slot.tool = moved_tool
        experiment.audit_log.append(
            f"{moved_tool.label} moved from {source_slot.label} to {target_slot.label}."
        )

    def _add_workspace_widget(self, experiment: Experiment, payload: dict) -> None:
        widget = _find_workspace_widget(experiment.workspace, payload["widget_id"])
        widget.x = int(payload["x"])
        widget.y = int(payload["y"])

        if not widget.is_present:
            widget.is_present = True
            experiment.audit_log.append(f"{widget.label} added to workspace.")
            return

        experiment.audit_log.append(f"{widget.label} repositioned in workspace.")

    def _move_workspace_widget(self, experiment: Experiment, payload: dict) -> None:
        widget = _find_workspace_widget(experiment.workspace, payload["widget_id"])
        if not widget.is_present:
            raise ValueError(f"{widget.label} must be added to the workspace before moving it.")

        widget.x = int(payload["x"])
        widget.y = int(payload["y"])
        experiment.audit_log.append(f"{widget.label} moved in workspace.")

    def _discard_workspace_widget(self, experiment: Experiment, payload: dict) -> None:
        widget = _find_workspace_widget(experiment.workspace, payload["widget_id"])
        if not widget.trashable:
            raise ValueError(f"{widget.label} cannot be discarded.")
        if not widget.is_present:
            return

        widget.is_present = False
        experiment.audit_log.append(f"{widget.label} removed from workspace.")

    def _discard_workbench_tool(self, experiment: Experiment, payload: dict) -> None:
        slot = _find_workbench_slot(experiment.workbench, payload["slot_id"])
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before discarding it.")
        if not slot.tool.trashable:
            raise ValueError(f"{slot.tool.label} cannot be discarded.")

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

    def _restore_trashed_tool_to_workbench_slot(
        self, experiment: Experiment, payload: dict
    ) -> None:
        trashed_tool = _find_trash_tool(experiment.trash, payload["trash_tool_id"])
        target_slot = _find_workbench_slot(experiment.workbench, payload["target_slot_id"])

        if target_slot.tool is not None:
            raise ValueError(f"{target_slot.label} already contains a tool")

        target_slot.tool = trashed_tool.tool
        experiment.trash.tools = [
            entry for entry in experiment.trash.tools if entry.id != trashed_tool.id
        ]
        experiment.audit_log.append(
            f"{target_slot.tool.label} restored from trash to {target_slot.label}."
        )

    def _place_workbench_tool_in_rack_slot(self, experiment: Experiment, payload: dict) -> None:
        source_slot = _find_workbench_slot(experiment.workbench, payload["source_slot_id"])
        rack_slot = _find_rack_slot(experiment.rack, payload["rack_slot_id"])

        if source_slot.tool is None:
            raise ValueError(f"Place a tool on {source_slot.label} before moving it into the rack.")
        if source_slot.tool.tool_type != "sample_vial":
            raise ValueError("Only autosampler vials can be placed in the rack.")
        if rack_slot.tool is not None:
            raise ValueError(f"{rack_slot.label} already contains a vial")

        rack_slot.tool = source_slot.tool
        source_slot.tool = None
        experiment.audit_log.append(
            f"{rack_slot.tool.label} moved from {source_slot.label} to {rack_slot.label}."
        )

    def _remove_rack_tool_to_workbench_slot(self, experiment: Experiment, payload: dict) -> None:
        rack_slot = _find_rack_slot(experiment.rack, payload["rack_slot_id"])
        target_slot = _find_workbench_slot(experiment.workbench, payload["target_slot_id"])

        if rack_slot.tool is None:
            raise ValueError(f"Place a vial in {rack_slot.label} before moving it back to the bench.")
        if target_slot.tool is not None:
            raise ValueError(f"{target_slot.label} already contains a tool")

        target_slot.tool = rack_slot.tool
        rack_slot.tool = None
        experiment.audit_log.append(
            f"{target_slot.tool.label} moved from {rack_slot.label} to {target_slot.label}."
        )

    def _discard_rack_tool(self, experiment: Experiment, payload: dict) -> None:
        rack_slot = _find_rack_slot(experiment.rack, payload["rack_slot_id"])
        if rack_slot.tool is None:
            raise ValueError(f"Place a vial in {rack_slot.label} before discarding it.")
        if not rack_slot.tool.trashable:
            raise ValueError(f"{rack_slot.tool.label} cannot be discarded.")

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

    def _restore_trashed_tool_to_rack_slot(self, experiment: Experiment, payload: dict) -> None:
        trashed_tool = _find_trash_tool(experiment.trash, payload["trash_tool_id"])
        rack_slot = _find_rack_slot(experiment.rack, payload["rack_slot_id"])

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

    def _add_liquid_to_workbench_tool(self, experiment: Experiment, payload: dict) -> None:
        slot = _find_workbench_slot(experiment.workbench, payload["slot_id"])
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before adding liquids.")
        if not slot.tool.accepts_liquids:
            raise ValueError(f"{slot.tool.label} does not accept liquids.")

        liquid_definition = get_workbench_liquid_definition(payload["liquid_id"])
        current_volume = _round_volume(sum(liquid.volume_ml for liquid in slot.tool.liquids))
        remaining_capacity = _round_volume(max(slot.tool.capacity_ml - current_volume, 0.0))
        if remaining_capacity <= 0:
            raise ValueError(f"{slot.tool.label} is already full.")

        volume_to_add = _round_volume(min(liquid_definition.transfer_volume_ml, remaining_capacity))
        existing_liquid = next(
            (liquid for liquid in slot.tool.liquids if liquid.liquid_id == liquid_definition.id),
            None,
        )

        if existing_liquid is None:
            slot.tool.liquids.append(
                WorkbenchLiquid(
                    id=new_id("bench_liquid"),
                    liquid_id=liquid_definition.id,
                    name=liquid_definition.name,
                    volume_ml=_round_volume(volume_to_add),
                    accent=liquid_definition.accent,
                )
            )
            updated_volume = _round_volume(volume_to_add)
            existing_liquid_was_present = False
        else:
            existing_liquid.volume_ml = _round_volume(existing_liquid.volume_ml + volume_to_add)
            updated_volume = existing_liquid.volume_ml
            existing_liquid_was_present = True

        if volume_to_add < liquid_definition.transfer_volume_ml:
            if existing_liquid_was_present:
                experiment.audit_log.append(
                    f"{liquid_definition.name} increased to {_format_volume(updated_volume)} mL in {slot.tool.label} (remaining capacity)."
                )
            else:
                experiment.audit_log.append(
                    f"{liquid_definition.name} added to {slot.tool.label} at {_format_volume(updated_volume)} mL (remaining capacity)."
                )
            return

        if existing_liquid_was_present:
            experiment.audit_log.append(
                f"{liquid_definition.name} increased to {_format_volume(updated_volume)} mL in {slot.tool.label}."
            )
            return

        experiment.audit_log.append(f"{liquid_definition.name} added to {slot.tool.label}.")

    def _remove_liquid_from_workbench_tool(self, experiment: Experiment, payload: dict) -> None:
        slot = _find_workbench_slot(experiment.workbench, payload["slot_id"])
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

        liquid_entry = next(
            (liquid for liquid in slot.tool.liquids if liquid.id == payload["liquid_entry_id"]),
            None,
        )
        if liquid_entry is None:
            raise ValueError("Unknown workbench liquid")

        slot.tool.liquids = [
            liquid for liquid in slot.tool.liquids if liquid.id != payload["liquid_entry_id"]
        ]
        experiment.audit_log.append(f"{liquid_entry.name} removed from {slot.tool.label}.")

    def _update_workbench_liquid_volume(self, experiment: Experiment, payload: dict) -> None:
        slot = _find_workbench_slot(experiment.workbench, payload["slot_id"])
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

        liquid_entry = next(
            (liquid for liquid in slot.tool.liquids if liquid.id == payload["liquid_entry_id"]),
            None,
        )
        if liquid_entry is None:
            raise ValueError("Unknown workbench liquid")

        requested_volume = _round_volume(max(float(payload["volume_ml"]), 0.0))
        occupied_by_others = sum(
            liquid.volume_ml for liquid in slot.tool.liquids if liquid.id != liquid_entry.id
        )
        max_allowed_volume = _round_volume(max(slot.tool.capacity_ml - occupied_by_others, 0.0))
        liquid_entry.volume_ml = _round_volume(min(requested_volume, max_allowed_volume))
        experiment.audit_log.append(
            f"{liquid_entry.name} adjusted to {_format_volume(liquid_entry.volume_ml)} mL in {slot.tool.label}."
        )

    def _to_schema(self, experiment: Experiment) -> ExperimentSchema:
        return ExperimentSchema.model_validate(
            {
                "id": experiment.id,
                "status": experiment.status.value,
                "workbench": asdict(experiment.workbench),
                "rack": asdict(experiment.rack),
                "trash": asdict(experiment.trash),
                "workspace": asdict(experiment.workspace),
                "audit_log": experiment.audit_log,
            }
        )


def _find_workbench_slot(workbench: Workbench, slot_id: str) -> WorkbenchSlot:
    slot = next((entry for entry in workbench.slots if entry.id == slot_id), None)
    if slot is None:
        raise ValueError("Unknown workbench slot")
    return slot


def _find_rack_slot(rack: Rack, slot_id: str) -> RackSlot:
    slot = next((entry for entry in rack.slots if entry.id == slot_id), None)
    if slot is None:
        raise ValueError("Unknown rack slot")
    return slot


def _find_trash_tool(trash: Trash, trash_tool_id: str) -> TrashToolEntry:
    tool = next((entry for entry in trash.tools if entry.id == trash_tool_id), None)
    if tool is None:
        raise ValueError("Unknown trash tool")
    return tool


def _find_workspace_widget(workspace: Workspace, widget_id: str) -> WorkspaceWidget:
    widget = next((entry for entry in workspace.widgets if entry.id == widget_id), None)
    if widget is None:
        raise ValueError("Unknown workspace widget")
    return widget


def _round_volume(volume_ml: float) -> float:
    return round(volume_ml, 3)


def _format_volume(volume_ml: float) -> str:
    return f"{_round_volume(volume_ml):g}"
