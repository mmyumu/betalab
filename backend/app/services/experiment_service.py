from __future__ import annotations

from dataclasses import asdict

from app.domain.models import Experiment
from app.schemas.experiment import ExperimentSchema
from app.services.command_handlers.rack import (
    place_tool_in_rack_slot,
    place_workbench_tool_in_rack_slot,
    remove_rack_tool_to_workbench_slot,
)
from app.services.command_handlers.trash import (
    discard_rack_tool,
    discard_workbench_tool,
    restore_trashed_tool_to_rack_slot,
    restore_trashed_tool_to_workbench_slot,
)
from app.services.command_handlers.workbench import (
    add_workbench_slot,
    add_produce_lot_to_workbench_tool,
    add_liquid_to_workbench_tool,
    move_tool_between_workbench_slots,
    place_tool_on_workbench,
    remove_workbench_slot,
    remove_liquid_from_workbench_tool,
    update_workbench_liquid_volume,
)
from app.services.command_handlers.workspace import (
    add_workspace_widget,
    create_produce_lot,
    discard_workspace_widget,
    move_workspace_widget,
)
from app.services.experiment_factory import build_experiment


class ExperimentNotFoundError(KeyError):
    pass


class ExperimentService:
    def __init__(self) -> None:
        self._experiments: dict[str, Experiment] = {}
        self._handlers = {
            "add_workbench_slot": add_workbench_slot,
            "remove_workbench_slot": remove_workbench_slot,
            "place_tool_on_workbench": place_tool_on_workbench,
            "move_tool_between_workbench_slots": move_tool_between_workbench_slots,
            "discard_workbench_tool": discard_workbench_tool,
            "restore_trashed_tool_to_workbench_slot": restore_trashed_tool_to_workbench_slot,
            "add_workspace_widget": add_workspace_widget,
            "move_workspace_widget": move_workspace_widget,
            "discard_workspace_widget": discard_workspace_widget,
            "create_produce_lot": create_produce_lot,
            "place_tool_in_rack_slot": place_tool_in_rack_slot,
            "place_workbench_tool_in_rack_slot": place_workbench_tool_in_rack_slot,
            "remove_rack_tool_to_workbench_slot": remove_rack_tool_to_workbench_slot,
            "discard_rack_tool": discard_rack_tool,
            "restore_trashed_tool_to_rack_slot": restore_trashed_tool_to_rack_slot,
            "add_liquid_to_workbench_tool": add_liquid_to_workbench_tool,
            "add_produce_lot_to_workbench_tool": add_produce_lot_to_workbench_tool,
            "remove_liquid_from_workbench_tool": remove_liquid_from_workbench_tool,
            "update_workbench_liquid_volume": update_workbench_liquid_volume,
        }

    def create_experiment(self) -> ExperimentSchema:
        experiment = build_experiment()
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

        self._handlers[command_type](experiment, payload)
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
