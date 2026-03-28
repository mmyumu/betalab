from fastapi import APIRouter, HTTPException

from app.schemas.experiment import (
    ExperimentSchema,
    PaletteToolDiscardSchema,
    RackToolMoveSchema,
    RackToolMoveToWorkbenchSchema,
    RackToolPlacementSchema,
    RackWorkbenchPlacementSchema,
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
    WorkbenchToolProduceLotCreateSchema,
    WorkbenchToolSampleLabelMoveSchema,
    WorkbenchToolSampleLabelUpdateSchema,
    WorkspaceAdvanceCryogenicsSchema,
    WorkspaceProduceLotCreateSchema,
    WorkspaceWidgetCreateSchema,
    WorkspaceWidgetLiquidCreateSchema,
    WorkspaceWidgetLiquidUpdateSchema,
    WorkspaceWidgetMoveSchema,
    WorkspaceWidgetMoveProduceLotToWorkbenchSchema,
    WorkspaceWidgetMoveWorkbenchProduceLotSchema,
    WorkspaceWidgetProduceLotCreateSchema,
)
from app.services.experiment_service import ExperimentNotFoundError, ExperimentService

router = APIRouter(prefix="/experiments", tags=["experiments"])
experiment_service = ExperimentService()


def _run_command(experiment_id: str, command_type: str, payload: dict | None = None) -> ExperimentSchema:
    try:
        return getattr(experiment_service, command_type)(experiment_id, payload or {})
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("", response_model=ExperimentSchema)
def create_experiment() -> ExperimentSchema:
    return experiment_service.create_experiment()


@router.get("/{experiment_id}", response_model=ExperimentSchema)
def get_experiment(experiment_id: str) -> ExperimentSchema:
    try:
        return experiment_service.get_experiment(experiment_id)
    except ExperimentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Experiment not found") from exc


@router.post("/{experiment_id}/workbench/slots", response_model=ExperimentSchema)
def add_workbench_slot(experiment_id: str) -> ExperimentSchema:
    return _run_command(experiment_id, "add_workbench_slot")


@router.delete("/{experiment_id}/workbench/slots/{slot_id}", response_model=ExperimentSchema)
def remove_workbench_slot(experiment_id: str, slot_id: str) -> ExperimentSchema:
    return _run_command(experiment_id, "remove_workbench_slot", {"slot_id": slot_id})


@router.post("/{experiment_id}/workbench/slots/{slot_id}/place-tool", response_model=ExperimentSchema)
def place_tool_on_workbench(
    experiment_id: str,
    slot_id: str,
    request: WorkbenchToolPlacementSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "place_tool_on_workbench",
        {"slot_id": slot_id, "tool_id": request.tool_id},
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/move-to-slot", response_model=ExperimentSchema)
def move_tool_between_workbench_slots(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolMoveSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "move_tool_between_workbench_slots",
        {"source_slot_id": _find_tool_slot(experiment_id, tool_id), "target_slot_id": request.target_slot_id},
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/discard", response_model=ExperimentSchema)
def discard_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "discard_workbench_tool",
        {"slot_id": _find_tool_slot(experiment_id, tool_id)},
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/liquids", response_model=ExperimentSchema)
def add_liquid_to_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolLiquidCreateSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": _find_tool_slot(experiment_id, tool_id),
            "liquid_id": request.liquid_id,
            **({"volume_ml": request.volume_ml} if request.volume_ml is not None else {}),
        },
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
    return _run_command(
        experiment_id,
        "update_workbench_liquid_volume",
        {
            "slot_id": _find_tool_slot(experiment_id, tool_id),
            "liquid_entry_id": liquid_id,
            "volume_ml": request.volume_ml,
        },
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
    return _run_command(
        experiment_id,
        "remove_liquid_from_workbench_tool",
        {"slot_id": _find_tool_slot(experiment_id, tool_id), "liquid_entry_id": liquid_id},
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def apply_sample_label_to_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "apply_sample_label_to_workbench_tool",
        {"slot_id": _find_tool_slot(experiment_id, tool_id)},
    )


@router.patch("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def update_workbench_tool_sample_label_text(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolSampleLabelUpdateSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "update_workbench_tool_sample_label_text",
        {
            "slot_id": _find_tool_slot(experiment_id, tool_id),
            "sample_label_text": request.sample_label_text,
        },
    )


@router.post(
    "/{experiment_id}/workbench/tools/{tool_id}/sample-label/move-to-tool",
    response_model=ExperimentSchema,
)
def move_sample_label_between_workbench_tools(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolSampleLabelMoveSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "move_sample_label_between_workbench_tools",
        {
            "source_slot_id": _find_tool_slot(experiment_id, tool_id),
            "target_slot_id": _find_tool_slot(experiment_id, request.target_tool_id),
        },
    )


@router.delete("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def discard_sample_label_from_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "discard_sample_label_from_workbench_tool",
        {"slot_id": _find_tool_slot(experiment_id, tool_id)},
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/add-produce-lot", response_model=ExperimentSchema)
def add_produce_lot_to_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "add_produce_lot_to_workbench_tool",
        {"slot_id": _find_tool_slot(experiment_id, tool_id), "produce_lot_id": request.produce_lot_id},
    )


@router.post("/{experiment_id}/workbench/slots/{slot_id}/add-produce-lot", response_model=ExperimentSchema)
def add_produce_lot_to_workbench_slot(
    experiment_id: str,
    slot_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "add_produce_lot_to_workbench_tool",
        {"slot_id": slot_id, "produce_lot_id": request.produce_lot_id},
    )


@router.post("/{experiment_id}/workbench/produce-lots/{produce_lot_id}/move-to-tool", response_model=ExperimentSchema)
def move_produce_lot_between_workbench_tools(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchProduceLotMoveSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "move_produce_lot_between_workbench_tools",
        {
            "source_slot_id": request.source_slot_id,
            "target_slot_id": request.target_slot_id,
            "produce_lot_id": produce_lot_id,
        },
    )


@router.post("/{experiment_id}/workbench/produce-lots/{produce_lot_id}/cut", response_model=ExperimentSchema)
def cut_workbench_produce_lot(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "cut_workbench_produce_lot",
        {"slot_id": request.slot_id, "produce_lot_id": produce_lot_id},
    )


@router.post("/{experiment_id}/workbench/produce-lots/{produce_lot_id}/discard", response_model=ExperimentSchema)
def discard_produce_lot_from_workbench_tool(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "discard_produce_lot_from_workbench_tool",
        {"slot_id": request.slot_id, "produce_lot_id": produce_lot_id},
    )


@router.post("/{experiment_id}/palette/tools/discard", response_model=ExperimentSchema)
def discard_tool_from_palette(
    experiment_id: str,
    request: PaletteToolDiscardSchema,
) -> ExperimentSchema:
    return _run_command(experiment_id, "discard_tool_from_palette", {"tool_id": request.tool_id})


@router.post("/{experiment_id}/palette/sample-labels/discard", response_model=ExperimentSchema)
def discard_sample_label_from_palette(experiment_id: str) -> ExperimentSchema:
    return _run_command(experiment_id, "discard_sample_label_from_palette", {"sample_label_id": "sampling_bag_label"})


@router.post("/{experiment_id}/rack/slots/{rack_slot_id}/place-tool-from-palette", response_model=ExperimentSchema)
def place_tool_in_rack_slot(
    experiment_id: str,
    rack_slot_id: str,
    request: RackToolPlacementSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "place_tool_in_rack_slot",
        {"rack_slot_id": rack_slot_id, "tool_id": request.tool_id},
    )


@router.post("/{experiment_id}/rack/slots/{rack_slot_id}/place-tool-from-workbench", response_model=ExperimentSchema)
def place_workbench_tool_in_rack_slot(
    experiment_id: str,
    rack_slot_id: str,
    request: RackWorkbenchPlacementSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "place_workbench_tool_in_rack_slot",
        {"source_slot_id": request.source_slot_id, "rack_slot_id": rack_slot_id},
    )


@router.post("/{experiment_id}/rack/tools/{tool_id}/move-to-slot", response_model=ExperimentSchema)
def move_rack_tool_between_slots(
    experiment_id: str,
    tool_id: str,
    request: RackToolMoveSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "move_rack_tool_between_slots",
        {
            "source_rack_slot_id": _find_rack_tool_slot(experiment_id, tool_id),
            "target_rack_slot_id": request.target_rack_slot_id,
        },
    )


@router.post("/{experiment_id}/rack/tools/{tool_id}/move-to-workbench-slot", response_model=ExperimentSchema)
def remove_rack_tool_to_workbench_slot(
    experiment_id: str,
    tool_id: str,
    request: RackToolMoveToWorkbenchSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "remove_rack_tool_to_workbench_slot",
        {"rack_slot_id": _find_rack_tool_slot(experiment_id, tool_id), "target_slot_id": request.target_slot_id},
    )


@router.post("/{experiment_id}/rack/tools/{tool_id}/discard", response_model=ExperimentSchema)
def discard_rack_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "discard_rack_tool",
        {"rack_slot_id": _find_rack_tool_slot(experiment_id, tool_id)},
    )


@router.post("/{experiment_id}/trash/tools/{entry_id}/restore-to-workbench", response_model=ExperimentSchema)
def restore_trashed_tool_to_workbench_slot(
    experiment_id: str,
    entry_id: str,
    request: TrashToolRestoreToWorkbenchSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "restore_trashed_tool_to_workbench_slot",
        {"trash_tool_id": entry_id, "target_slot_id": request.target_slot_id},
    )


@router.post("/{experiment_id}/trash/tools/{entry_id}/restore-to-rack", response_model=ExperimentSchema)
def restore_trashed_tool_to_rack_slot(
    experiment_id: str,
    entry_id: str,
    request: TrashToolRestoreToRackSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "restore_trashed_tool_to_rack_slot",
        {"trash_tool_id": entry_id, "rack_slot_id": request.rack_slot_id},
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
    return _run_command(
        experiment_id,
        "restore_trashed_produce_lot_to_workbench_tool",
        {"trash_produce_lot_id": entry_id, "target_slot_id": request.target_slot_id},
    )


@router.post("/{experiment_id}/trash/produce-lots/{entry_id}/restore-to-widget", response_model=ExperimentSchema)
def restore_trashed_produce_lot_to_widget(
    experiment_id: str,
    entry_id: str,
    request: TrashProduceLotRestoreToWidgetSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "restore_trashed_produce_lot_to_widget",
        {"trash_produce_lot_id": entry_id, "widget_id": request.widget_id},
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
    return _run_command(
        experiment_id,
        "restore_trashed_sample_label_to_workbench_tool",
        {"trash_sample_label_id": entry_id, "target_slot_id": _find_tool_slot(experiment_id, request.target_tool_id)},
    )


@router.post("/{experiment_id}/workspace/widgets", response_model=ExperimentSchema)
def add_workspace_widget(
    experiment_id: str,
    request: WorkspaceWidgetCreateSchema,
) -> ExperimentSchema:
    return _run_command(experiment_id, "add_workspace_widget", request.model_dump())


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/move", response_model=ExperimentSchema)
def move_workspace_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetMoveSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "move_workspace_widget",
        {"widget_id": widget_id, **request.model_dump()},
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/discard", response_model=ExperimentSchema)
def discard_workspace_widget(experiment_id: str, widget_id: str) -> ExperimentSchema:
    return _run_command(experiment_id, "discard_workspace_widget", {"widget_id": widget_id})


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/liquids", response_model=ExperimentSchema)
def add_liquid_to_workspace_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetLiquidCreateSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": widget_id,
            "liquid_id": request.liquid_id,
            **({"volume_ml": request.volume_ml} if request.volume_ml is not None else {}),
        },
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
    return _run_command(
        experiment_id,
        "update_workspace_widget_liquid_volume",
        {"widget_id": widget_id, "liquid_entry_id": liquid_id, "volume_ml": request.volume_ml},
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
    return _run_command(
        experiment_id,
        "remove_liquid_from_workspace_widget",
        {"widget_id": widget_id, "liquid_entry_id": liquid_id},
    )


@router.post(
    "/{experiment_id}/workspace/widgets/{widget_id}/complete-grinder-cycle",
    response_model=ExperimentSchema,
)
def complete_grinder_cycle(experiment_id: str, widget_id: str) -> ExperimentSchema:
    return _run_command(experiment_id, "complete_grinder_cycle", {"widget_id": widget_id})


@router.post("/{experiment_id}/workspace/advance-cryogenics", response_model=ExperimentSchema)
def advance_workspace_cryogenics(
    experiment_id: str,
    request: WorkspaceAdvanceCryogenicsSchema,
) -> ExperimentSchema:
    return _run_command(experiment_id, "advance_workspace_cryogenics", request.model_dump())


@router.post("/{experiment_id}/workspace/produce-lots", response_model=ExperimentSchema)
def create_produce_lot(
    experiment_id: str,
    request: WorkspaceProduceLotCreateSchema,
) -> ExperimentSchema:
    return _run_command(experiment_id, "create_produce_lot", request.model_dump())


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/add-produce-lot", response_model=ExperimentSchema)
def add_workspace_produce_lot_to_widget(
    experiment_id: str,
    widget_id: str,
    request: WorkspaceWidgetProduceLotCreateSchema,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "add_workspace_produce_lot_to_widget",
        {"widget_id": widget_id, "produce_lot_id": request.produce_lot_id},
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
    return _run_command(
        experiment_id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": widget_id,
            "source_slot_id": request.source_slot_id,
            "produce_lot_id": request.produce_lot_id,
        },
    )


@router.post("/{experiment_id}/workspace/produce-lots/{produce_lot_id}/discard", response_model=ExperimentSchema)
def discard_workspace_produce_lot(experiment_id: str, produce_lot_id: str) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "discard_workspace_produce_lot",
        {"produce_lot_id": produce_lot_id},
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
    return _run_command(
        experiment_id,
        "move_widget_produce_lot_to_workbench_tool",
        {"widget_id": widget_id, "produce_lot_id": produce_lot_id, "target_slot_id": request.target_slot_id},
    )


@router.post("/{experiment_id}/workspace/widgets/{widget_id}/produce-lots/{produce_lot_id}/discard", response_model=ExperimentSchema)
def discard_widget_produce_lot(
    experiment_id: str,
    widget_id: str,
    produce_lot_id: str,
) -> ExperimentSchema:
    return _run_command(
        experiment_id,
        "discard_widget_produce_lot",
        {"widget_id": widget_id, "produce_lot_id": produce_lot_id},
    )


def _find_tool_slot(experiment_id: str, tool_id: str) -> str:
    experiment = _get_experiment_or_404(experiment_id)
    for slot in experiment.workbench.slots:
        if slot.tool is not None and slot.tool.id == tool_id:
            return slot.id
    raise HTTPException(status_code=400, detail="Unknown workbench tool")


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
