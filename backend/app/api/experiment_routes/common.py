from collections.abc import Callable

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.experiment import ExperimentSchema
from app.services.experiment_repository import SqliteExperimentRepository
from app.services.experiment_service import ExperimentNotFoundError, ExperimentRuntimeService

router = APIRouter(prefix="/experiments", tags=["experiments"])
experiment_service = ExperimentRuntimeService(
    repository=SqliteExperimentRepository(settings.experiments_db_path)
)
experiment_stream_interval_seconds = 0.25


def handle_service_errors(operation: Callable[[], ExperimentSchema]) -> ExperimentSchema:
    try:
        return operation()
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def get_experiment_or_404(experiment_id: str) -> ExperimentSchema:
    try:
        return experiment_service.get_experiment(experiment_id)
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc


def find_tool_slot(experiment_id: str, tool_id: str) -> str:
    experiment = get_experiment_or_404(experiment_id)
    for slot in experiment.workbench.slots:
        if slot.tool is not None and slot.tool.id == tool_id:
            return slot.id
    raise HTTPException(status_code=400, detail="Unknown workbench tool")


def find_default_tool_label_id(experiment_id: str, tool_id: str) -> str:
    experiment = get_experiment_or_404(experiment_id)
    for slot in experiment.workbench.slots:
        if slot.tool is None or slot.tool.id != tool_id:
            continue
        manual_label = next(
            (label for label in slot.tool.labels if label.label_kind == "manual"),
            None,
        )
        if manual_label is not None:
            return manual_label.id
        if slot.tool.labels:
            return slot.tool.labels[0].id
        break
    raise HTTPException(status_code=400, detail="Unknown workbench tool label")


def find_rack_tool_slot(experiment_id: str, tool_id: str) -> str:
    experiment = get_experiment_or_404(experiment_id)
    for slot in experiment.rack.slots:
        if slot.tool is not None and slot.tool.id == tool_id:
            return slot.id
    raise HTTPException(status_code=400, detail="Unknown rack tool")
