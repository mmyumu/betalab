from __future__ import annotations

from dataclasses import asdict

from app.domain.models import Experiment
from app.schemas.experiment import ExperimentSchema
from app.services.command_handlers.rack import (
    move_rack_tool_between_slots,
    place_tool_in_rack_slot,
    place_workbench_tool_in_rack_slot,
    remove_rack_tool_to_workbench_slot,
)
from app.services.command_handlers.trash import (
    discard_sample_label_from_palette,
    discard_tool_from_palette,
    discard_rack_tool,
    discard_workbench_tool,
    restore_trashed_produce_lot_to_workbench_tool,
    restore_trashed_tool_to_rack_slot,
    restore_trashed_tool_to_workbench_slot,
)
from app.services.command_handlers.workbench import (
    add_workbench_slot,
    apply_sample_label_to_workbench_tool,
    add_produce_lot_to_workbench_tool,
    add_liquid_to_workbench_tool,
    discard_sample_label_from_workbench_tool,
    discard_produce_lot_from_workbench_tool,
    cut_workbench_produce_lot,
    move_sample_label_between_workbench_tools,
    move_produce_lot_between_workbench_tools,
    move_tool_between_workbench_slots,
    place_tool_on_workbench,
    remove_workbench_slot,
    remove_liquid_from_workbench_tool,
    restore_trashed_sample_label_to_workbench_tool,
    update_workbench_tool_sample_label_text,
    update_workbench_liquid_volume,
)
from app.services.command_handlers.workspace import (
    add_liquid_to_workspace_widget,
    add_workspace_produce_lot_to_widget,
    add_workspace_widget,
    advance_workspace_cryogenics,
    create_produce_lot,
    complete_grinder_cycle,
    discard_widget_produce_lot,
    discard_workspace_produce_lot,
    move_widget_produce_lot_to_workbench_tool,
    discard_workspace_widget,
    move_workbench_produce_lot_to_widget,
    move_workspace_widget,
    remove_liquid_from_workspace_widget,
    restore_trashed_produce_lot_to_widget,
    update_workspace_widget_liquid_volume,
)
from app.services.experiment_factory import build_experiment


class ExperimentNotFoundError(KeyError):
    pass


class ExperimentService:
    def __init__(self) -> None:
        self._experiments: dict[str, Experiment] = {}

    def create_experiment(self) -> ExperimentSchema:
        experiment = build_experiment()
        self._experiments[experiment.id] = experiment
        return self._to_schema(experiment)

    def get_experiment(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)
        return self._to_schema(experiment)

    def add_workbench_slot(self, experiment_id: str, payload: dict | None = None) -> ExperimentSchema:
        return self._mutate(experiment_id, add_workbench_slot, payload or {})

    def remove_workbench_slot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, remove_workbench_slot, payload)

    def place_tool_on_workbench(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, place_tool_on_workbench, payload)

    def move_tool_between_workbench_slots(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_tool_between_workbench_slots, payload)

    def discard_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_workbench_tool, payload)

    def discard_tool_from_palette(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_tool_from_palette, payload)

    def discard_sample_label_from_palette(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_sample_label_from_palette, payload)

    def restore_trashed_tool_to_workbench_slot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, restore_trashed_tool_to_workbench_slot, payload)

    def add_workspace_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, add_workspace_widget, payload)

    def move_workspace_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_workspace_widget, payload)

    def discard_workspace_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_workspace_widget, payload)

    def add_liquid_to_workspace_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, add_liquid_to_workspace_widget, payload)

    def update_workspace_widget_liquid_volume(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, update_workspace_widget_liquid_volume, payload)

    def remove_liquid_from_workspace_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, remove_liquid_from_workspace_widget, payload)

    def complete_grinder_cycle(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, complete_grinder_cycle, payload)

    def advance_workspace_cryogenics(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, advance_workspace_cryogenics, payload)

    def add_workspace_produce_lot_to_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, add_workspace_produce_lot_to_widget, payload)

    def move_workbench_produce_lot_to_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_workbench_produce_lot_to_widget, payload)

    def restore_trashed_produce_lot_to_widget(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, restore_trashed_produce_lot_to_widget, payload)

    def create_produce_lot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, create_produce_lot, payload)

    def discard_workspace_produce_lot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_workspace_produce_lot, payload)

    def move_widget_produce_lot_to_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_widget_produce_lot_to_workbench_tool, payload)

    def discard_widget_produce_lot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_widget_produce_lot, payload)

    def place_tool_in_rack_slot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, place_tool_in_rack_slot, payload)

    def place_workbench_tool_in_rack_slot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, place_workbench_tool_in_rack_slot, payload)

    def move_rack_tool_between_slots(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_rack_tool_between_slots, payload)

    def remove_rack_tool_to_workbench_slot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, remove_rack_tool_to_workbench_slot, payload)

    def discard_rack_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_rack_tool, payload)

    def restore_trashed_tool_to_rack_slot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, restore_trashed_tool_to_rack_slot, payload)

    def add_liquid_to_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, add_liquid_to_workbench_tool, payload)

    def add_produce_lot_to_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, add_produce_lot_to_workbench_tool, payload)

    def discard_produce_lot_from_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_produce_lot_from_workbench_tool, payload)

    def cut_workbench_produce_lot(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, cut_workbench_produce_lot, payload)

    def move_produce_lot_between_workbench_tools(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_produce_lot_between_workbench_tools, payload)

    def restore_trashed_produce_lot_to_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, restore_trashed_produce_lot_to_workbench_tool, payload)

    def remove_liquid_from_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, remove_liquid_from_workbench_tool, payload)

    def update_workbench_liquid_volume(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, update_workbench_liquid_volume, payload)

    def apply_sample_label_to_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, apply_sample_label_to_workbench_tool, payload)

    def update_workbench_tool_sample_label_text(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, update_workbench_tool_sample_label_text, payload)

    def move_sample_label_between_workbench_tools(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, move_sample_label_between_workbench_tools, payload)

    def discard_sample_label_from_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, discard_sample_label_from_workbench_tool, payload)

    def restore_trashed_sample_label_to_workbench_tool(self, experiment_id: str, payload: dict) -> ExperimentSchema:
        return self._mutate(experiment_id, restore_trashed_sample_label_to_workbench_tool, payload)

    def _mutate(self, experiment_id: str, mutation, payload: dict) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)

        mutation(experiment, payload)
        return self._to_schema(experiment)

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
