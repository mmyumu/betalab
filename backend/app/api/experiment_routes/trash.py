from app.schemas.experiment import (
    ExperimentSchema,
    TrashProduceLotRestoreToWidgetSchema,
    TrashProduceLotRestoreToWorkbenchSchema,
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
        lambda: experiment_service.restore_trashed_produce_lot_to_workbench_tool(
            experiment_id,
            entry_id,
            request.target_slot_id,
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
        lambda: experiment_service.restore_trashed_produce_lot_to_widget(
            experiment_id,
            entry_id,
            request.widget_id,
        )
    )
