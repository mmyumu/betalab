from fastapi import APIRouter, HTTPException

from app.schemas.experiment import ExperimentCommandEnvelope, CreateExperimentRequest, ExperimentSchema
from app.services.experiment_service import ExperimentNotFoundError, ExperimentService

router = APIRouter(prefix="/experiments", tags=["experiments"])
experiment_service = ExperimentService()


@router.post("", response_model=ExperimentSchema)
def create_experiment(request: CreateExperimentRequest) -> ExperimentSchema:
    return experiment_service.create_experiment(scenario_id=request.scenario_id)


@router.get("/{experiment_id}", response_model=ExperimentSchema)
def get_experiment(experiment_id: str) -> ExperimentSchema:
    try:
        return experiment_service.get_experiment(experiment_id)
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc


@router.post("/{experiment_id}/commands", response_model=ExperimentSchema)
def apply_command(experiment_id: str, command: ExperimentCommandEnvelope) -> ExperimentSchema:
    try:
        return experiment_service.apply_command(
            experiment_id=experiment_id,
            command_type=command.type,
            payload=command.payload,
        )
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
