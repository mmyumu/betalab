from app.schemas.experiment import (
    ExperimentSchema,
    TrashProduceLotRestoreToWidgetSchema,
    TrashProduceLotRestoreToWorkbenchSchema,
)
from app.services.domain_services.workbench import (
    RestoreTrashedProduceLotToWorkbenchToolRequest,
    RestoreTrashedProduceLotToWorkbenchToolService,
)
from app.services.domain_services.workspace import (
    RestoreTrashedProduceLotToWidgetRequest,
    RestoreTrashedProduceLotToWidgetService,
)

from .common import experiment_service, handle_service_errors, router


@router.post(
    "/{experiment_id}/trash/produce-lots/{entry_id}/restore-to-workbench-tool",
    response_model=ExperimentSchema,
)
def restore_trashed_produce_lot_to_workbench_tool(
    experiment_id: str,
    entry_id: str,
    request: TrashProduceLotRestoreToWorkbenchSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: RestoreTrashedProduceLotToWorkbenchToolService(experiment_service).run(
            experiment_id,
            RestoreTrashedProduceLotToWorkbenchToolRequest(
                trash_produce_lot_id=entry_id,
                target_slot_id=request.target_slot_id,
            ),
        )
    )


@router.post(
    "/{experiment_id}/trash/produce-lots/{entry_id}/restore-to-widget",
    response_model=ExperimentSchema,
)
def restore_trashed_produce_lot_to_widget(
    experiment_id: str,
    entry_id: str,
    request: TrashProduceLotRestoreToWidgetSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: RestoreTrashedProduceLotToWidgetService(experiment_service).run(
            experiment_id,
            RestoreTrashedProduceLotToWidgetRequest(
                trash_produce_lot_id=entry_id,
                widget_id=request.widget_id,
            ),
        )
    )
