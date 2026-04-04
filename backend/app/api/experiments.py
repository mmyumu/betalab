import asyncio
from collections.abc import Callable

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.schemas.experiment import (
    DebugProducePresetSpawnToWidgetSchema,
    DebugProducePresetSpawnToWorkbenchSchema,
    ExperimentListEntrySchema,
    ExperimentSchema,
    GrossBalanceMoveProduceLotToWorkbenchSchema,
    GrossMassOffsetUpdateSchema,
    GrossWeightRecordSchema,
    LimsLabelPrintSchema,
    LimsReceptionCreateSchema,
    PaletteToolDiscardSchema,
    RackSlotReferenceSchema,
    RackToolMoveSchema,
    RackToolMoveToWorkbenchSchema,
    RackToolPlacementSchema,
    RackWorkbenchPlacementSchema,
    ReceivedBagPlacementSchema,
    TargetWorkbenchSlotSchema,
    TrashProduceLotRestoreToWidgetSchema,
    TrashProduceLotRestoreToWorkbenchSchema,
    TrashSampleLabelRestoreSchema,
    TrashToolRestoreToRackSchema,
    TrashToolRestoreToWorkbenchSchema,
    WorkbenchProduceLotMoveSchema,
    WorkbenchSlotReferenceSchema,
    WorkbenchToolLiquidCreateSchema,
    WorkbenchToolLiquidUpdateSchema,
    WorkbenchToolMoveSchema,
    WorkbenchToolPlacementSchema,
    WorkbenchToolPowderPourSchema,
    WorkbenchToolProduceLotCreateSchema,
    WorkbenchToolSampleLabelMoveSchema,
    WorkbenchToolSampleLabelUpdateSchema,
    WorkspaceProduceLotCreateSchema,
    WorkspaceWidgetCreateSchema,
    WorkspaceWidgetLiquidCreateSchema,
    WorkspaceWidgetLiquidUpdateSchema,
    WorkspaceWidgetMoveProduceLotToWorkbenchSchema,
    WorkspaceWidgetMoveSchema,
    WorkspaceWidgetMoveWorkbenchProduceLotSchema,
    WorkspaceWidgetProduceLotCreateSchema,
)
from app.services.experiment_repository import SqliteExperimentRepository
from app.services.experiment_service import ExperimentNotFoundError, ExperimentService

router = APIRouter(prefix="/experiments", tags=["experiments"])
experiment_service = ExperimentService(
    repository=SqliteExperimentRepository(settings.experiments_db_path)
)
experiment_stream_interval_seconds = 0.25


def _handle_service_errors(operation: Callable[[], ExperimentSchema]) -> ExperimentSchema:
    try:
        return operation()
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("", response_model=ExperimentSchema)
def create_experiment() -> ExperimentSchema:
    return experiment_service.create_experiment()


@router.get("", response_model=list[ExperimentListEntrySchema])
def list_experiments() -> list[ExperimentListEntrySchema]:
    return experiment_service.list_experiments()


@router.delete("/{experiment_id}", status_code=204)
def delete_experiment(experiment_id: str) -> None:
    try:
        experiment_service.delete_experiment(experiment_id)
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc


@router.get("/{experiment_id}", response_model=ExperimentSchema)
def get_experiment(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(lambda: experiment_service.get_experiment(experiment_id))


@router.post("/{experiment_id}/reception/bag/place-on-workbench", response_model=ExperimentSchema)
def place_received_bag_on_workbench(
    experiment_id: str,
    request: ReceivedBagPlacementSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.place_received_bag_on_workbench(
            experiment_id,
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/reception/bag/discard", response_model=ExperimentSchema)
def discard_received_bag(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(lambda: experiment_service.discard_basket_tool(experiment_id))


@router.post("/{experiment_id}/reception/gross-weight/record", response_model=ExperimentSchema)
def record_gross_weight(
    experiment_id: str,
    request: GrossWeightRecordSchema | None = None,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.record_gross_weight(
            experiment_id,
            request.measured_gross_mass_g if request is not None else None,
        )
    )


@router.post("/{experiment_id}/gross-balance/container-offset", response_model=ExperimentSchema)
def set_gross_balance_container_offset(
    experiment_id: str,
    request: GrossMassOffsetUpdateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.set_gross_mass_offset(
            experiment_id,
            request.gross_mass_offset_g,
        )
    )


@router.post("/{experiment_id}/lims/reception", response_model=ExperimentSchema)
def create_lims_reception(
    experiment_id: str,
    request: LimsReceptionCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.create_lims_reception(
            experiment_id,
            request.orchard_name,
            request.harvest_date,
            request.indicative_mass_g,
            request.measured_gross_mass_g,
            request.measured_sample_mass_g,
            request.entry_id,
        )
    )


@router.post("/{experiment_id}/lims/print-label", response_model=ExperimentSchema)
def print_lims_label(
    experiment_id: str,
    request: LimsLabelPrintSchema | None = None,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.print_lims_label(
            experiment_id,
            request.entry_id if request is not None else None,
        )
    )


@router.delete("/{experiment_id}/lims/printed-label", response_model=ExperimentSchema)
def discard_printed_lims_label(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(lambda: experiment_service.discard_printed_lims_label(experiment_id))


@router.post("/{experiment_id}/lims/apply-label-to-workbench-bag", response_model=ExperimentSchema)
def apply_printed_lims_label(
    experiment_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.apply_printed_lims_label(experiment_id, request.slot_id)
    )


@router.post("/{experiment_id}/lims/apply-label-to-basket-bag", response_model=ExperimentSchema)
def apply_printed_lims_label_to_basket_bag(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.apply_printed_lims_label_to_basket_bag(experiment_id)
    )


@router.post("/{experiment_id}/lims/apply-label-to-gross-balance-bag", response_model=ExperimentSchema)
def apply_printed_lims_label_to_gross_balance_bag(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.apply_printed_lims_label_to_gross_balance_bag(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/place-workbench-tool", response_model=ExperimentSchema)
def move_workbench_tool_to_gross_balance(
    experiment_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_workbench_tool_to_gross_balance(experiment_id, request.slot_id)
    )


@router.post("/{experiment_id}/gross-balance/place-basket-tool", response_model=ExperimentSchema)
def move_basket_tool_to_gross_balance(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_basket_tool_to_gross_balance(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/place-tool", response_model=ExperimentSchema)
def place_tool_on_gross_balance(
    experiment_id: str,
    request: WorkbenchToolPlacementSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.place_tool_on_gross_balance(experiment_id, request.tool_id)
    )


@router.post("/{experiment_id}/gross-balance/place-rack-tool", response_model=ExperimentSchema)
def move_rack_tool_to_gross_balance(
    experiment_id: str,
    request: RackSlotReferenceSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_rack_tool_to_gross_balance(experiment_id, request.rack_slot_id)
    )


@router.post("/{experiment_id}/gross-balance/restore-trash-tool/{trash_tool_id}", response_model=ExperimentSchema)
def restore_trashed_tool_to_gross_balance(
    experiment_id: str,
    trash_tool_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_tool_to_gross_balance(experiment_id, trash_tool_id)
    )


@router.post("/{experiment_id}/gross-balance/move-tool-to-workbench", response_model=ExperimentSchema)
def move_gross_balance_tool_to_workbench(
    experiment_id: str,
    request: TargetWorkbenchSlotSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_gross_balance_tool_to_workbench(experiment_id, request.target_slot_id)
    )


@router.post("/{experiment_id}/gross-balance/move-tool-to-rack", response_model=ExperimentSchema)
def move_gross_balance_tool_to_rack(
    experiment_id: str,
    request: RackSlotReferenceSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_gross_balance_tool_to_rack(experiment_id, request.rack_slot_id)
    )


@router.post("/{experiment_id}/gross-balance/discard-tool", response_model=ExperimentSchema)
def discard_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_gross_balance_tool(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/open-tool", response_model=ExperimentSchema)
def open_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.open_gross_balance_tool(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/close-tool", response_model=ExperimentSchema)
def close_gross_balance_tool(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.close_gross_balance_tool(experiment_id)
    )


@router.post("/{experiment_id}/gross-balance/place-workspace-produce-lot/{produce_lot_id}", response_model=ExperimentSchema)
def move_workspace_produce_lot_to_gross_balance(
    experiment_id: str,
    produce_lot_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_workspace_produce_lot_to_gross_balance(experiment_id, produce_lot_id)
    )


@router.post("/{experiment_id}/gross-balance/place-workbench-produce-lot", response_model=ExperimentSchema)
def move_workbench_produce_lot_to_gross_balance(
    experiment_id: str,
    request: WorkspaceWidgetMoveWorkbenchProduceLotSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_workbench_produce_lot_to_gross_balance(
            experiment_id,
            request.source_slot_id,
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/place-widget-produce-lot", response_model=ExperimentSchema)
def move_widget_produce_lot_to_gross_balance(
    experiment_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_widget_produce_lot_to_gross_balance(
            experiment_id,
            "grinder",
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/restore-trash-produce-lot/{trash_produce_lot_id}", response_model=ExperimentSchema)
def restore_trashed_produce_lot_to_gross_balance(
    experiment_id: str,
    trash_produce_lot_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_produce_lot_to_gross_balance(
            experiment_id,
            trash_produce_lot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/move-produce-lot-to-workbench", response_model=ExperimentSchema)
def move_gross_balance_produce_lot_to_workbench(
    experiment_id: str,
    request: GrossBalanceMoveProduceLotToWorkbenchSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_gross_balance_produce_lot_to_workbench(
            experiment_id,
            request.target_slot_id,
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/gross-balance/move-produce-lot-to-widget", response_model=ExperimentSchema)
def move_gross_balance_produce_lot_to_widget(
    experiment_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
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
    return _handle_service_errors(
        lambda: experiment_service.discard_gross_balance_produce_lot(
            experiment_id,
            request.produce_lot_id,
        )
    )


@router.websocket("/{experiment_id}/stream")
async def stream_experiment(experiment_id: str, websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        while True:
            experiment = experiment_service.get_experiment(experiment_id)
            await websocket.send_json(experiment.model_dump(mode="json"))
            await asyncio.sleep(experiment_stream_interval_seconds)
    except ExperimentNotFoundError:
        await websocket.close(code=4404, reason="Experiment not found")
    except WebSocketDisconnect:
        return


@router.post("/{experiment_id}/workbench/slots", response_model=ExperimentSchema)
def add_workbench_slot(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(lambda: experiment_service.add_workbench_slot(experiment_id))


@router.delete("/{experiment_id}/workbench/slots/{slot_id}", response_model=ExperimentSchema)
def remove_workbench_slot(experiment_id: str, slot_id: str) -> ExperimentSchema:
    return _handle_service_errors(lambda: experiment_service.remove_workbench_slot(experiment_id, slot_id))


@router.post("/{experiment_id}/workbench/slots/{slot_id}/place-tool", response_model=ExperimentSchema)
def place_tool_on_workbench(
    experiment_id: str,
    slot_id: str,
    request: WorkbenchToolPlacementSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.place_tool_on_workbench(experiment_id, slot_id, request.tool_id)
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/move-to-slot", response_model=ExperimentSchema)
def move_tool_between_workbench_slots(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolMoveSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_tool_between_workbench_slots(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/discard", response_model=ExperimentSchema)
def discard_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/liquids", response_model=ExperimentSchema)
def add_liquid_to_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolLiquidCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.add_liquid_to_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            request.liquid_id,
            request.volume_ml,
        )
    )


@router.patch(
    "/{experiment_id}/workbench/tools/{tool_id}/liquids/{liquid_id}",
    response_model=ExperimentSchema,
)
def update_workbench_liquid_volume(
    experiment_id: str,
    tool_id: str,
    liquid_id: str,
    request: WorkbenchToolLiquidUpdateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.update_workbench_liquid_volume(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            liquid_id,
            request.volume_ml,
        )
    )


@router.delete(
    "/{experiment_id}/workbench/tools/{tool_id}/liquids/{liquid_id}",
    response_model=ExperimentSchema,
)
def remove_liquid_from_workbench_tool(
    experiment_id: str,
    tool_id: str,
    liquid_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.remove_liquid_from_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            liquid_id,
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def apply_sample_label_to_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.apply_sample_label_to_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/close", response_model=ExperimentSchema)
def close_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.close_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/open", response_model=ExperimentSchema)
def open_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.open_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/spatula/load", response_model=ExperimentSchema)
def load_spatula_from_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.load_spatula_from_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/spatula/pour", response_model=ExperimentSchema)
def pour_spatula_into_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolPowderPourSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.pour_spatula_into_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            request.delta_mass_g,
        )
    )


@router.patch("/{experiment_id}/workbench/tools/{tool_id}/sample-labels/{label_id}", response_model=ExperimentSchema)
def update_workbench_tool_sample_label_text(
    experiment_id: str,
    tool_id: str,
    label_id: str,
    request: WorkbenchToolSampleLabelUpdateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.update_workbench_tool_sample_label_text(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            label_id,
            request.sample_label_text,
        )
    )


@router.patch("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def update_workbench_tool_primary_sample_label_text(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolSampleLabelUpdateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.update_workbench_tool_sample_label_text(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            _find_default_tool_label_id(experiment_id, tool_id),
            request.sample_label_text,
        )
    )


@router.post(
    "/{experiment_id}/workbench/tools/{tool_id}/sample-labels/{label_id}/move-to-tool",
    response_model=ExperimentSchema,
)
def move_sample_label_between_workbench_tools(
    experiment_id: str,
    tool_id: str,
    label_id: str,
    request: WorkbenchToolSampleLabelMoveSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_sample_label_between_workbench_tools(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            _find_tool_slot(experiment_id, request.target_tool_id),
            label_id,
        )
    )


@router.post(
    "/{experiment_id}/workbench/tools/{tool_id}/sample-label/move-to-tool",
    response_model=ExperimentSchema,
)
def move_primary_sample_label_between_workbench_tools(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolSampleLabelMoveSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_sample_label_between_workbench_tools(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            _find_tool_slot(experiment_id, request.target_tool_id),
            _find_default_tool_label_id(experiment_id, tool_id),
        )
    )


@router.delete("/{experiment_id}/workbench/tools/{tool_id}/sample-labels/{label_id}", response_model=ExperimentSchema)
def discard_sample_label_from_workbench_tool(
    experiment_id: str,
    tool_id: str,
    label_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_sample_label_from_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            label_id,
        )
    )


@router.delete("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def discard_primary_sample_label_from_workbench_tool(
    experiment_id: str,
    tool_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_sample_label_from_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            _find_default_tool_label_id(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/add-produce-lot", response_model=ExperimentSchema)
def add_produce_lot_to_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.add_produce_lot_to_workbench_tool(
            experiment_id,
            _find_tool_slot(experiment_id, tool_id),
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/workbench/slots/{slot_id}/add-produce-lot", response_model=ExperimentSchema)
def add_produce_lot_to_workbench_slot(
    experiment_id: str,
    slot_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.add_produce_lot_to_workbench_tool(
            experiment_id,
            slot_id,
            request.produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/debug/produce-presets/{preset_id}/spawn-on-workbench",
    response_model=ExperimentSchema,
)
def create_debug_produce_lot_on_workbench(
    experiment_id: str,
    preset_id: str,
    request: DebugProducePresetSpawnToWorkbenchSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.create_debug_produce_lot_on_workbench(
            experiment_id,
            preset_id,
            request.target_slot_id,
            request.total_mass_g,
            request.temperature_c,
            request.residual_co2_mass_g,
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
    return _handle_service_errors(
        lambda: experiment_service.create_debug_produce_lot_to_widget(
            experiment_id,
            preset_id,
            request.widget_id,
            request.total_mass_g,
            request.temperature_c,
            request.residual_co2_mass_g,
        )
    )


@router.post("/{experiment_id}/workbench/produce-lots/{produce_lot_id}/move-to-tool", response_model=ExperimentSchema)
def move_produce_lot_between_workbench_tools(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchProduceLotMoveSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_produce_lot_between_workbench_tools(
            experiment_id,
            request.source_slot_id,
            request.target_slot_id,
            produce_lot_id,
        )
    )


@router.post("/{experiment_id}/workbench/produce-lots/{produce_lot_id}/cut", response_model=ExperimentSchema)
def cut_workbench_produce_lot(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.cut_workbench_produce_lot(
            experiment_id,
            request.slot_id,
            produce_lot_id,
        )
    )


@router.post("/{experiment_id}/workbench/produce-lots/{produce_lot_id}/discard", response_model=ExperimentSchema)
def discard_produce_lot_from_workbench_tool(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_produce_lot_from_workbench_tool(
            experiment_id,
            request.slot_id,
            produce_lot_id,
        )
    )


@router.post("/{experiment_id}/palette/tools/discard", response_model=ExperimentSchema)
def discard_tool_from_palette(
    experiment_id: str,
    request: PaletteToolDiscardSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_tool_from_palette(experiment_id, request.tool_id)
    )


@router.post("/{experiment_id}/palette/sample-labels/discard", response_model=ExperimentSchema)
def discard_sample_label_from_palette(experiment_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_sample_label_from_palette(
            experiment_id,
            "sampling_bag_label",
        )
    )


@router.post("/{experiment_id}/rack/slots/{rack_slot_id}/place-tool-from-palette", response_model=ExperimentSchema)
def place_tool_in_rack_slot(
    experiment_id: str,
    rack_slot_id: str,
    request: RackToolPlacementSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.place_tool_in_rack_slot(
            experiment_id,
            rack_slot_id,
            request.tool_id,
        )
    )


@router.post("/{experiment_id}/rack/slots/{rack_slot_id}/place-tool-from-workbench", response_model=ExperimentSchema)
def place_workbench_tool_in_rack_slot(
    experiment_id: str,
    rack_slot_id: str,
    request: RackWorkbenchPlacementSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.place_workbench_tool_in_rack_slot(
            experiment_id,
            request.source_slot_id,
            rack_slot_id,
        )
    )


@router.post("/{experiment_id}/rack/tools/{tool_id}/move-to-slot", response_model=ExperimentSchema)
def move_rack_tool_between_slots(
    experiment_id: str,
    tool_id: str,
    request: RackToolMoveSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.move_rack_tool_between_slots(
            experiment_id,
            _find_rack_tool_slot(experiment_id, tool_id),
            request.target_rack_slot_id,
        )
    )


@router.post("/{experiment_id}/rack/tools/{tool_id}/move-to-workbench-slot", response_model=ExperimentSchema)
def remove_rack_tool_to_workbench_slot(
    experiment_id: str,
    tool_id: str,
    request: RackToolMoveToWorkbenchSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.remove_rack_tool_to_workbench_slot(
            experiment_id,
            _find_rack_tool_slot(experiment_id, tool_id),
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/rack/tools/{tool_id}/discard", response_model=ExperimentSchema)
def discard_rack_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_rack_tool(
            experiment_id,
            _find_rack_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/trash/tools/{entry_id}/restore-to-workbench", response_model=ExperimentSchema)
def restore_trashed_tool_to_workbench_slot(
    experiment_id: str,
    entry_id: str,
    request: TrashToolRestoreToWorkbenchSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_tool_to_workbench_slot(
            experiment_id,
            entry_id,
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/trash/tools/{entry_id}/restore-to-rack", response_model=ExperimentSchema)
def restore_trashed_tool_to_rack_slot(
    experiment_id: str,
    entry_id: str,
    request: TrashToolRestoreToRackSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_tool_to_rack_slot(
            experiment_id,
            entry_id,
            request.rack_slot_id,
        )
    )


@router.post(
    "/{experiment_id}/trash/produce-lots/{entry_id}/restore-to-workbench-tool",
    response_model=ExperimentSchema,
)
def restore_trashed_produce_lot_to_workbench_tool(
    experiment_id: str,
    entry_id: str,
    request: TrashProduceLotRestoreToWorkbenchSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_produce_lot_to_workbench_tool(
            experiment_id,
            entry_id,
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/trash/produce-lots/{entry_id}/restore-to-widget", response_model=ExperimentSchema)
def restore_trashed_produce_lot_to_widget(
    experiment_id: str,
    entry_id: str,
    request: TrashProduceLotRestoreToWidgetSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_produce_lot_to_widget(
            experiment_id,
            entry_id,
            request.widget_id,
        )
    )


@router.post(
    "/{experiment_id}/trash/sample-labels/{entry_id}/restore-to-workbench-tool",
    response_model=ExperimentSchema,
)
def restore_trashed_sample_label_to_workbench_tool(
    experiment_id: str,
    entry_id: str,
    request: TrashSampleLabelRestoreSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.restore_trashed_sample_label_to_workbench_tool(
            experiment_id,
            entry_id,
            _find_tool_slot(experiment_id, request.target_tool_id),
        )
    )


@router.post("/{experiment_id}/workspace/widgets", response_model=ExperimentSchema)
def add_workspace_widget(
    experiment_id: str,
    request: WorkspaceWidgetCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
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
    return _handle_service_errors(
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
    return _handle_service_errors(lambda: experiment_service.discard_workspace_widget(experiment_id, widget_id))


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/liquids", response_model=ExperimentSchema)
def add_liquid_to_workspace_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetLiquidCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
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
    return _handle_service_errors(
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
    return _handle_service_errors(
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
    return _handle_service_errors(lambda: experiment_service.complete_grinder_cycle(experiment_id, widget_id))


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/start-grinder-cycle",
    response_model=ExperimentSchema,
)
def start_grinder_cycle(experiment_id: str, widget_id: str) -> ExperimentSchema:
    return _handle_service_errors(lambda: experiment_service.start_grinder_cycle(experiment_id, widget_id))


@router.post("/{experiment_id}/workspace/produce-lots", response_model=ExperimentSchema)
def create_produce_lot(
    experiment_id: str,
    request: WorkspaceProduceLotCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.create_produce_lot(experiment_id, request.produce_type)
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/add-produce-lot", response_model=ExperimentSchema)
def add_workspace_produce_lot_to_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return _handle_service_errors(
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
    return _handle_service_errors(
        lambda: experiment_service.move_workbench_produce_lot_to_widget(
            experiment_id,
            widget_id,
            request.source_slot_id,
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/workspace/produce-lots/{produce_lot_id}/discard", response_model=ExperimentSchema)
def discard_workspace_produce_lot(experiment_id: str, produce_lot_id: str) -> ExperimentSchema:
    return _handle_service_errors(
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
    return _handle_service_errors(
        lambda: experiment_service.move_widget_produce_lot_to_workbench_tool(
            experiment_id,
            widget_id,
            produce_lot_id,
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/produce-lots/{produce_lot_id}/discard", response_model=ExperimentSchema)
def discard_widget_produce_lot(
    experiment_id: str,
    widget_id: str,
    produce_lot_id: str,
) -> ExperimentSchema:
    return _handle_service_errors(
        lambda: experiment_service.discard_widget_produce_lot(experiment_id, widget_id, produce_lot_id)
    )


def _find_tool_slot(experiment_id: str, tool_id: str) -> str:
    experiment = _get_experiment_or_404(experiment_id)
    for slot in experiment.workbench.slots:
        if slot.tool is not None and slot.tool.id == tool_id:
            return slot.id
    raise HTTPException(status_code=400, detail="Unknown workbench tool")


def _find_default_tool_label_id(experiment_id: str, tool_id: str) -> str:
    experiment = _get_experiment_or_404(experiment_id)
    for slot in experiment.workbench.slots:
        if slot.tool is None or slot.tool.id != tool_id:
            continue
        manual_label = next((label for label in slot.tool.labels if label.label_kind == "manual"), None)
        if manual_label is not None:
            return manual_label.id
        if slot.tool.labels:
            return slot.tool.labels[0].id
        break
    raise HTTPException(status_code=400, detail="Unknown workbench tool label")


def _find_rack_tool_slot(experiment_id: str, tool_id: str) -> str:
    experiment = _get_experiment_or_404(experiment_id)
    for slot in experiment.rack.slots:
        if slot.tool is not None and slot.tool.id == tool_id:
            return slot.id
    raise HTTPException(status_code=400, detail="Unknown rack tool")


def _get_experiment_or_404(experiment_id: str) -> ExperimentSchema:
    try:
        return experiment_service.get_experiment(experiment_id)
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc
