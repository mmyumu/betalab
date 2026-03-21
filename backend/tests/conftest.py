from app.services.experiment_service import ExperimentService


def create_service() -> ExperimentService:
    return ExperimentService()
