from app.schemas.experiment import (
    DebugProducePresetSpawnToWidgetSchema,
    ExperimentSchema,
    WorkspaceProduceLotCreateSchema,
    WorkspaceWidgetCreateSchema,
    WorkspaceWidgetLiquidCreateSchema,
    WorkspaceWidgetLiquidUpdateSchema,
    WorkspaceWidgetMoveProduceLotToWorkbenchSchema,
    WorkspaceWidgetMoveSchema,
    WorkspaceWidgetMoveWorkbenchProduceLotSchema,
    WorkspaceWidgetProduceLotCreateSchema,
)

from .common import experiment_service, handle_service_errors, router


@router.post("/{experiment_id}/workspace/widgets", response_model=ExperimentSchema)
def add_workspace_widget(
    experiment_id: str,
    request: WorkspaceWidgetCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.add_workspace_widget(
            experiment_id,
            request.widget_id,
            request.anchor,
            request.offset_x,
            request.offset_y,
        )
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/move", response_model=ExperimentSchema)
def move_workspace_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetMoveSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_workspace_widget(
            experiment_id,
            widget_id,
            request.anchor,
            request.offset_x,
            request.offset_y,
        )
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/discard", response_model=ExperimentSchema)
def discard_workspace_widget(experiment_id: str, widget_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_workspace_widget(experiment_id, widget_id)
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/liquids", response_model=ExperimentSchema)
def add_liquid_to_workspace_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetLiquidCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.add_liquid_to_workspace_widget(
            experiment_id,
            widget_id,
            request.liquid_id,
            request.volume_ml,
        )
    )


@router.patch(
    "/{experiment_id}/workspace/widgets/{widget_id}/liquids/{liquid_id}",
    response_model=ExperimentSchema,
)
def update_workspace_widget_liquid_volume(
    experiment_id: str,
    widget_id: str,
    liquid_id: str,
    request: WorkspaceWidgetLiquidUpdateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.update_workspace_widget_liquid_volume(
            experiment_id,
            widget_id,
            liquid_id,
            request.volume_ml,
        )
    )


@router.delete(
    "/{experiment_id}/workspace/widgets/{widget_id}/liquids/{liquid_id}",
    response_model=ExperimentSchema,
)
def remove_liquid_from_workspace_widget(
    experiment_id: str,
    widget_id: str,
    liquid_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.remove_liquid_from_workspace_widget(
            experiment_id,
            widget_id,
            liquid_id,
        )
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/complete-grinder-cycle",
    response_model=ExperimentSchema,
)
def complete_grinder_cycle(experiment_id: str, widget_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.complete_grinder_cycle(experiment_id, widget_id)
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/start-grinder-cycle",
    response_model=ExperimentSchema,
)
def start_grinder_cycle(experiment_id: str, widget_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.start_grinder_cycle(experiment_id, widget_id)
    )


@router.post("/{experiment_id}/workspace/produce-lots", response_model=ExperimentSchema)
def create_produce_lot(
    experiment_id: str,
    request: WorkspaceProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.create_produce_lot(experiment_id, request.produce_type)
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/add-produce-lot",
    response_model=ExperimentSchema,
)
def add_workspace_produce_lot_to_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.add_workspace_produce_lot_to_widget(
            experiment_id,
            widget_id,
            request.produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/move-workbench-produce-lot",
    response_model=ExperimentSchema,
)
def move_workbench_produce_lot_to_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetMoveWorkbenchProduceLotSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_workbench_produce_lot_to_widget(
            experiment_id,
            widget_id,
            request.source_slot_id,
            request.produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/workspace/produce-lots/{produce_lot_id}/discard",
    response_model=ExperimentSchema,
)
def discard_workspace_produce_lot(experiment_id: str, produce_lot_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_workspace_produce_lot(experiment_id, produce_lot_id)
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/produce-lots/{produce_lot_id}/move-to-workbench-tool",
    response_model=ExperimentSchema,
)
def move_widget_produce_lot_to_workbench_tool(
    experiment_id: str,
    widget_id: str,
    produce_lot_id: str,
    request: WorkspaceWidgetMoveProduceLotToWorkbenchSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_widget_produce_lot_to_workbench_tool(
            experiment_id,
            widget_id,
            produce_lot_id,
            request.target_slot_id,
        )
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/produce-lots/{produce_lot_id}/discard",
    response_model=ExperimentSchema,
)
def discard_widget_produce_lot(
    experiment_id: str,
    widget_id: str,
    produce_lot_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_widget_produce_lot(
            experiment_id,
            widget_id,
            produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/debug/produce-presets/{preset_id}/spawn-on-widget",
    response_model=ExperimentSchema,
)
def create_debug_produce_lot_to_widget(
    experiment_id: str,
    preset_id: str,
    request: DebugProducePresetSpawnToWidgetSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.create_debug_produce_lot_to_widget(
            experiment_id,
            preset_id,
            request.widget_id,
            request.total_mass_g,
            request.temperature_c,
            request.residual_co2_mass_g,
        )
    )
