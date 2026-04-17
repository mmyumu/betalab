from app.schemas.experiment import (
    BasketToolReferenceSchema,
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
from app.services.domain_services.gross_balance import (
    ApplySampleLabelToGrossBalanceToolService,
    CloseGrossBalanceToolService,
    DiscardGrossBalanceProduceLotRequest,
    DiscardGrossBalanceProduceLotService,
    DiscardGrossBalanceToolService,
    EmptyRequest,
    MoveAnalyticalBalanceToolToGrossBalanceRequest,
    MoveAnalyticalBalanceToolToGrossBalanceService,
    MoveBasketToolToGrossBalanceRequest,
    MoveBasketToolToGrossBalanceService,
    MoveGrossBalanceProduceLotToWidgetRequest,
    MoveGrossBalanceProduceLotToWidgetService,
    MoveGrossBalanceProduceLotToWorkbenchRequest,
    MoveGrossBalanceProduceLotToWorkbenchService,
    MoveGrossBalanceToolToRackRequest,
    MoveGrossBalanceToolToRackService,
    MoveGrossBalanceToolToWorkbenchRequest,
    MoveGrossBalanceToolToWorkbenchService,
    MoveRackToolToGrossBalanceRequest,
    MoveRackToolToGrossBalanceService,
    MoveWidgetProduceLotToGrossBalanceRequest,
    MoveWidgetProduceLotToGrossBalanceService,
    MoveWorkbenchProduceLotToGrossBalanceRequest,
    MoveWorkbenchProduceLotToGrossBalanceService,
    MoveWorkbenchSampleLabelToGrossBalanceRequest,
    MoveWorkbenchSampleLabelToGrossBalanceService,
    MoveWorkbenchToolToGrossBalanceRequest,
    MoveWorkbenchToolToGrossBalanceService,
    MoveWorkspaceProduceLotToGrossBalanceRequest,
    MoveWorkspaceProduceLotToGrossBalanceService,
    OpenGrossBalanceToolService,
    PlaceToolOnGrossBalanceRequest,
    PlaceToolOnGrossBalanceService,
    RestoreTrashedProduceLotToGrossBalanceRequest,
    RestoreTrashedProduceLotToGrossBalanceService,
    RestoreTrashedSampleLabelToGrossBalanceRequest,
    RestoreTrashedSampleLabelToGrossBalanceService,
    RestoreTrashedToolToGrossBalanceRequest,
    RestoreTrashedToolToGrossBalanceService,
)

from .common import experiment_service, handle_service_errors, router


@router.post("/{experiment_id}/gross-balance/place-workbench-tool", response_model=ExperimentSchema)
def move_workbench_tool_to_gross_balance(
    experiment_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveWorkbenchToolToGrossBalanceService(experiment_service).run(
            experiment_id,
            MoveWorkbenchToolToGrossBalanceRequest(source_slot_id=request.slot_id),
        )
    )


@router.post("/{experiment_id}/gross-balance/place-basket-tool", response_model=ExperimentSchema)
def move_basket_tool_to_gross_balance(experiment_id: str, request: BasketToolReferenceSchema) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveBasketToolToGrossBalanceService(experiment_service).run(
            experiment_id, MoveBasketToolToGrossBalanceRequest(tool_id=request.tool_id)
        )
    )


@router.post("/{experiment_id}/gross-balance/place-tool", response_model=ExperimentSchema)
def place_tool_on_gross_balance(
    experiment_id: str,
    request: WorkbenchToolPlacementSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: PlaceToolOnGrossBalanceService(experiment_service).run(
            experiment_id,
            PlaceToolOnGrossBalanceRequest(tool_id=request.tool_id),
        )
    )


@router.post("/{experiment_id}/gross-balance/place-rack-tool", response_model=ExperimentSchema)
def move_rack_tool_to_gross_balance(
    experiment_id: str,
    request: RackSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveRackToolToGrossBalanceService(experiment_service).run(
            experiment_id,
            MoveRackToolToGrossBalanceRequest(rack_slot_id=request.rack_slot_id),
        )
    )


@router.post("/{experiment_id}/gross-balance/place-analytical-balance-tool", response_model=ExperimentSchema)
def move_analytical_balance_tool_to_gross_balance(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveAnalyticalBalanceToolToGrossBalanceService(experiment_service).run(
            experiment_id, MoveAnalyticalBalanceToolToGrossBalanceRequest()
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
        lambda: RestoreTrashedToolToGrossBalanceService(experiment_service).run(
            experiment_id,
            RestoreTrashedToolToGrossBalanceRequest(trash_tool_id=trash_tool_id),
        )
    )


@router.post("/{experiment_id}/gross-balance/move-tool-to-workbench", response_model=ExperimentSchema)
def move_gross_balance_tool_to_workbench(
    experiment_id: str,
    request: TargetWorkbenchSlotSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveGrossBalanceToolToWorkbenchService(experiment_service).run(
            experiment_id,
            MoveGrossBalanceToolToWorkbenchRequest(target_slot_id=request.target_slot_id),
        )
    )


@router.post("/{experiment_id}/gross-balance/move-tool-to-rack", response_model=ExperimentSchema)
def move_gross_balance_tool_to_rack(
    experiment_id: str,
    request: RackSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveGrossBalanceToolToRackService(experiment_service).run(
            experiment_id,
            MoveGrossBalanceToolToRackRequest(rack_slot_id=request.rack_slot_id),
        )
    )


@router.post("/{experiment_id}/gross-balance/discard-tool", response_model=ExperimentSchema)
def discard_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: DiscardGrossBalanceToolService(experiment_service).run(experiment_id, EmptyRequest()))


@router.post("/{experiment_id}/gross-balance/open-tool", response_model=ExperimentSchema)
def open_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: OpenGrossBalanceToolService(experiment_service).run(experiment_id, EmptyRequest()))


@router.post("/{experiment_id}/gross-balance/close-tool", response_model=ExperimentSchema)
def close_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: CloseGrossBalanceToolService(experiment_service).run(experiment_id, EmptyRequest()))


@router.post("/{experiment_id}/gross-balance/sample-label", response_model=ExperimentSchema)
def apply_sample_label_to_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: ApplySampleLabelToGrossBalanceToolService(experiment_service).run(
            experiment_id,
            EmptyRequest(),
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/sample-labels/{label_id}/move-from-workbench-tool",
    response_model=ExperimentSchema,
)
def move_workbench_sample_label_to_gross_balance(
    experiment_id: str,
    label_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveWorkbenchSampleLabelToGrossBalanceService(experiment_service).run(
            experiment_id,
            MoveWorkbenchSampleLabelToGrossBalanceRequest(
                source_slot_id=request.slot_id,
                label_id=label_id,
            ),
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/restore-trash-sample-label/{trash_sample_label_id}",
    response_model=ExperimentSchema,
)
def restore_trashed_sample_label_to_gross_balance(
    experiment_id: str,
    trash_sample_label_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: RestoreTrashedSampleLabelToGrossBalanceService(experiment_service).run(
            experiment_id,
            RestoreTrashedSampleLabelToGrossBalanceRequest(
                trash_sample_label_id=trash_sample_label_id,
            ),
        )
    )


@router.post(
    "/{experiment_id}/gross-balance/place-workspace-produce-lot/{produce_lot_id}",
    response_model=ExperimentSchema,
)
def move_workspace_produce_lot_to_gross_balance(
    experiment_id: str,
    produce_lot_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: MoveWorkspaceProduceLotToGrossBalanceService(experiment_service).run(
            experiment_id,
            MoveWorkspaceProduceLotToGrossBalanceRequest(produce_lot_id=produce_lot_id),
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
        lambda: MoveWorkbenchProduceLotToGrossBalanceService(experiment_service).run(
            experiment_id,
            MoveWorkbenchProduceLotToGrossBalanceRequest(
                source_slot_id=request.source_slot_id,
                produce_lot_id=request.produce_lot_id,
            ),
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
        lambda: MoveWidgetProduceLotToGrossBalanceService(experiment_service).run(
            experiment_id,
            MoveWidgetProduceLotToGrossBalanceRequest(
                widget_id="grinder",
                produce_lot_id=request.produce_lot_id,
            ),
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
        lambda: RestoreTrashedProduceLotToGrossBalanceService(experiment_service).run(
            experiment_id,
            RestoreTrashedProduceLotToGrossBalanceRequest(trash_produce_lot_id=trash_produce_lot_id),
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
        lambda: MoveGrossBalanceProduceLotToWorkbenchService(experiment_service).run(
            experiment_id,
            MoveGrossBalanceProduceLotToWorkbenchRequest(
                target_slot_id=request.target_slot_id,
                produce_lot_id=request.produce_lot_id,
            ),
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
        lambda: MoveGrossBalanceProduceLotToWidgetService(experiment_service).run(
            experiment_id,
            MoveGrossBalanceProduceLotToWidgetRequest(
                widget_id="grinder",
                produce_lot_id=request.produce_lot_id,
            ),
        )
    )


@router.post("/{experiment_id}/gross-balance/discard-produce-lot", response_model=ExperimentSchema)
def discard_gross_balance_produce_lot(
    experiment_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: DiscardGrossBalanceProduceLotService(experiment_service).run(
            experiment_id,
            DiscardGrossBalanceProduceLotRequest(produce_lot_id=request.produce_lot_id),
        )
    )
