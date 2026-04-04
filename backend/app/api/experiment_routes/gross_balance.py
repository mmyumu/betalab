from app.schemas.experiment import (
    ExperimentSchema,
    GrossBalanceMoveProduceLotToWorkbenchSchema,
    RackSlotReferenceSchema,
    TargetWorkbenchSlotSchema,
    WorkbenchSlotReferenceSchema,
    WorkbenchToolPlacementSchema,
    WorkbenchToolProduceLotCreateSchema,
    WorkspaceWidgetMoveWorkbenchProduceLotSchema,
    WorkspaceWidgetProduceLotCreateSchema,
)

from .common import experiment_service, handle_service_errors, router


@router.post("/{experiment_id}/gross-balance/place-workbench-tool", response_model=ExperimentSchema)
def move_workbench_tool_to_gross_balance(
    experiment_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_workbench_tool_to_gross_balance(
            experiment_id,
            request.slot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/place-basket-tool", response_model=ExperimentSchema)
def move_basket_tool_to_gross_balance(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_basket_tool_to_gross_balance(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/place-tool", response_model=ExperimentSchema)
def place_tool_on_gross_balance(
    experiment_id: str,
    request: WorkbenchToolPlacementSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.place_tool_on_gross_balance(experiment_id, request.tool_id)
    )


@router.post("/{experiment_id}/gross-balance/place-rack-tool", response_model=ExperimentSchema)
def move_rack_tool_to_gross_balance(
    experiment_id: str,
    request: RackSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_rack_tool_to_gross_balance(
            experiment_id,
            request.rack_slot_id,
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/restore-trash-tool/{trash_tool_id}",
    response_model=ExperimentSchema,
)
def restore_trashed_tool_to_gross_balance(
    experiment_id: str,
    trash_tool_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.restore_trashed_tool_to_gross_balance(
            experiment_id,
            trash_tool_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/move-tool-to-workbench", response_model=ExperimentSchema)
def move_gross_balance_tool_to_workbench(
    experiment_id: str,
    request: TargetWorkbenchSlotSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_gross_balance_tool_to_workbench(
            experiment_id,
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/move-tool-to-rack", response_model=ExperimentSchema)
def move_gross_balance_tool_to_rack(
    experiment_id: str,
    request: RackSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_gross_balance_tool_to_rack(
            experiment_id,
            request.rack_slot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/discard-tool", response_model=ExperimentSchema)
def discard_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_gross_balance_tool(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/open-tool", response_model=ExperimentSchema)
def open_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: experiment_service.open_gross_balance_tool(experiment_id))


@router.post("/{experiment_id}/gross-balance/close-tool", response_model=ExperimentSchema)
def close_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: experiment_service.close_gross_balance_tool(experiment_id))


@router.post(
    "/{experiment_id}/gross-balance/place-workspace-produce-lot/{produce_lot_id}",
    response_model=ExperimentSchema,
)
def move_workspace_produce_lot_to_gross_balance(
    experiment_id: str,
    produce_lot_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_workspace_produce_lot_to_gross_balance(
            experiment_id,
            produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/place-workbench-produce-lot",
    response_model=ExperimentSchema,
)
def move_workbench_produce_lot_to_gross_balance(
    experiment_id: str,
    request: WorkspaceWidgetMoveWorkbenchProduceLotSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_workbench_produce_lot_to_gross_balance(
            experiment_id,
            request.source_slot_id,
            request.produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/place-widget-produce-lot",
    response_model=ExperimentSchema,
)
def move_widget_produce_lot_to_gross_balance(
    experiment_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_widget_produce_lot_to_gross_balance(
            experiment_id,
            "grinder",
            request.produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/restore-trash-produce-lot/{trash_produce_lot_id}",
    response_model=ExperimentSchema,
)
def restore_trashed_produce_lot_to_gross_balance(
    experiment_id: str,
    trash_produce_lot_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.restore_trashed_produce_lot_to_gross_balance(
            experiment_id,
            trash_produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/move-produce-lot-to-workbench",
    response_model=ExperimentSchema,
)
def move_gross_balance_produce_lot_to_workbench(
    experiment_id: str,
    request: GrossBalanceMoveProduceLotToWorkbenchSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_gross_balance_produce_lot_to_workbench(
            experiment_id,
            request.target_slot_id,
            request.produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/move-produce-lot-to-widget",
    response_model=ExperimentSchema,
)
def move_gross_balance_produce_lot_to_widget(
    experiment_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_gross_balance_produce_lot_to_widget(
            experiment_id,
            "grinder",
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/discard-produce-lot", response_model=ExperimentSchema)
def discard_gross_balance_produce_lot(
    experiment_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_gross_balance_produce_lot(
            experiment_id,
            request.produce_lot_id,
        )
    )
