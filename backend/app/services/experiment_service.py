from __future__ import annotations

from dataclasses import asdict

from app.domain.models import (
    Experiment,
    ExperimentStatus,
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
            "add_liquid_to_workbench_tool": self._add_liquid_to_workbench_tool,
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
                "audit_log": experiment.audit_log,
            }
        )


def _find_workbench_slot(workbench: Workbench, slot_id: str) -> WorkbenchSlot:
    slot = next((entry for entry in workbench.slots if entry.id == slot_id), None)
    if slot is None:
        raise ValueError("Unknown workbench slot")
    return slot


def _round_volume(volume_ml: float) -> float:
    return round(volume_ml, 3)


def _format_volume(volume_ml: float) -> str:
    return f"{_round_volume(volume_ml):g}"
