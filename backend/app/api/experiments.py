from app.api.experiment_routes import (
    core,
    gross_balance,
    rack,
    reception,
    trash,
    workbench,
    workspace,
)
from app.api.experiment_routes.common import experiment_service as shared_experiment_service
from app.api.experiment_routes.common import router
from app.services.experiment_service import ExperimentRuntimeService

_route_modules = (core, gross_balance, rack, reception, trash, workbench, workspace)
experiment_service: ExperimentRuntimeService = shared_experiment_service

__all__ = ["experiment_service", "router"]
