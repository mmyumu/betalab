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
    discard_workspace_produce_lot,
    discard_workspace_widget,
    move_workbench_produce_lot_to_widget,
    move_workspace_widget,
    restore_trashed_produce_lot_to_widget,
    update_workspace_widget_liquid_volume,
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
            "discard_tool_from_palette": discard_tool_from_palette,
            "discard_sample_label_from_palette": discard_sample_label_from_palette,
            "restore_trashed_tool_to_workbench_slot": restore_trashed_tool_to_workbench_slot,
            "add_workspace_widget": add_workspace_widget,
            "move_workspace_widget": move_workspace_widget,
            "discard_workspace_widget": discard_workspace_widget,
            "add_liquid_to_workspace_widget": add_liquid_to_workspace_widget,
            "update_workspace_widget_liquid_volume": update_workspace_widget_liquid_volume,
            "advance_workspace_cryogenics": advance_workspace_cryogenics,
            "add_workspace_produce_lot_to_widget": add_workspace_produce_lot_to_widget,
            "move_workbench_produce_lot_to_widget": move_workbench_produce_lot_to_widget,
            "restore_trashed_produce_lot_to_widget": restore_trashed_produce_lot_to_widget,
            "create_produce_lot": create_produce_lot,
            "discard_workspace_produce_lot": discard_workspace_produce_lot,
            "place_tool_in_rack_slot": place_tool_in_rack_slot,
            "place_workbench_tool_in_rack_slot": place_workbench_tool_in_rack_slot,
            "remove_rack_tool_to_workbench_slot": remove_rack_tool_to_workbench_slot,
            "discard_rack_tool": discard_rack_tool,
            "restore_trashed_tool_to_rack_slot": restore_trashed_tool_to_rack_slot,
            "add_liquid_to_workbench_tool": add_liquid_to_workbench_tool,
            "add_produce_lot_to_workbench_tool": add_produce_lot_to_workbench_tool,
            "discard_produce_lot_from_workbench_tool": discard_produce_lot_from_workbench_tool,
            "cut_workbench_produce_lot": cut_workbench_produce_lot,
            "move_produce_lot_between_workbench_tools": move_produce_lot_between_workbench_tools,
            "restore_trashed_produce_lot_to_workbench_tool": restore_trashed_produce_lot_to_workbench_tool,
            "remove_liquid_from_workbench_tool": remove_liquid_from_workbench_tool,
            "update_workbench_liquid_volume": update_workbench_liquid_volume,
            "apply_sample_label_to_workbench_tool": apply_sample_label_to_workbench_tool,
            "update_workbench_tool_sample_label_text": update_workbench_tool_sample_label_text,
            "move_sample_label_between_workbench_tools": move_sample_label_between_workbench_tools,
            "discard_sample_label_from_workbench_tool": discard_sample_label_from_workbench_tool,
            "restore_trashed_sample_label_to_workbench_tool": restore_trashed_sample_label_to_workbench_tool,
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
