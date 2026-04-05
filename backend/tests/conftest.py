from app.services.experiment_service import ExperimentRuntimeService


def create_service() -> ExperimentRuntimeService:
    return ExperimentRuntimeService()
