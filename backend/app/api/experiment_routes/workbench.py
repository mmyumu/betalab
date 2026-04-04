from app.schemas.experiment import (
    DebugProducePresetSpawnToWorkbenchSchema,
    ExperimentSchema,
    PaletteToolDiscardSchema,
    TrashSampleLabelRestoreSchema,
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
)

from .common import (
    experiment_service,
    find_default_tool_label_id,
    find_tool_slot,
    handle_service_errors,
    router,
)


@router.post("/{experiment_id}/workbench/slots", response_model=ExperimentSchema)
def add_workbench_slot(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: experiment_service.add_workbench_slot(experiment_id))


@router.delete("/{experiment_id}/workbench/slots/{slot_id}", response_model=ExperimentSchema)
def remove_workbench_slot(experiment_id: str, slot_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.remove_workbench_slot(experiment_id, slot_id)
    )


@router.post("/{experiment_id}/workbench/slots/{slot_id}/place-tool", response_model=ExperimentSchema)
def place_tool_on_workbench(
    experiment_id: str,
    slot_id: str,
    request: WorkbenchToolPlacementSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.place_tool_on_workbench(experiment_id, slot_id, request.tool_id)
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/move-to-slot", response_model=ExperimentSchema)
def move_tool_between_workbench_slots(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolMoveSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.move_tool_between_workbench_slots(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/discard", response_model=ExperimentSchema)
def discard_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/liquids", response_model=ExperimentSchema)
def add_liquid_to_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolLiquidCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.add_liquid_to_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
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
    return handle_service_errors(
        lambda: experiment_service.update_workbench_liquid_volume(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
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
    return handle_service_errors(
        lambda: experiment_service.remove_liquid_from_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            liquid_id,
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def apply_sample_label_to_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.apply_sample_label_to_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/close", response_model=ExperimentSchema)
def close_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.close_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/open", response_model=ExperimentSchema)
def open_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.open_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/spatula/load", response_model=ExperimentSchema)
def load_spatula_from_workbench_tool(experiment_id: str, tool_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.load_spatula_from_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/spatula/pour", response_model=ExperimentSchema)
def pour_spatula_into_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolPowderPourSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.pour_spatula_into_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            request.delta_mass_g,
        )
    )


@router.patch(
    "/{experiment_id}/workbench/tools/{tool_id}/sample-labels/{label_id}",
    response_model=ExperimentSchema,
)
def update_workbench_tool_sample_label_text(
    experiment_id: str,
    tool_id: str,
    label_id: str,
    request: WorkbenchToolSampleLabelUpdateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.update_workbench_tool_sample_label_text(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
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
    return handle_service_errors(
        lambda: experiment_service.update_workbench_tool_sample_label_text(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            find_default_tool_label_id(experiment_id, tool_id),
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
    return handle_service_errors(
        lambda: experiment_service.move_sample_label_between_workbench_tools(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            find_tool_slot(experiment_id, request.target_tool_id),
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
    return handle_service_errors(
        lambda: experiment_service.move_sample_label_between_workbench_tools(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            find_tool_slot(experiment_id, request.target_tool_id),
            find_default_tool_label_id(experiment_id, tool_id),
        )
    )


@router.delete(
    "/{experiment_id}/workbench/tools/{tool_id}/sample-labels/{label_id}",
    response_model=ExperimentSchema,
)
def discard_sample_label_from_workbench_tool(
    experiment_id: str,
    tool_id: str,
    label_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_sample_label_from_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            label_id,
        )
    )


@router.delete("/{experiment_id}/workbench/tools/{tool_id}/sample-label", response_model=ExperimentSchema)
def discard_primary_sample_label_from_workbench_tool(
    experiment_id: str,
    tool_id: str,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_sample_label_from_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            find_default_tool_label_id(experiment_id, tool_id),
        )
    )


@router.post("/{experiment_id}/workbench/tools/{tool_id}/add-produce-lot", response_model=ExperimentSchema)
def add_produce_lot_to_workbench_tool(
    experiment_id: str,
    tool_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.add_produce_lot_to_workbench_tool(
            experiment_id,
            find_tool_slot(experiment_id, tool_id),
            request.produce_lot_id,
        )
    )


@router.post("/{experiment_id}/workbench/slots/{slot_id}/add-produce-lot", response_model=ExperimentSchema)
def add_produce_lot_to_workbench_slot(
    experiment_id: str,
    slot_id: str,
    request: WorkbenchToolProduceLotCreateSchema,
) -> ExperimentSchema:
    return handle_service_errors(
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
    return handle_service_errors(
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
    "/{experiment_id}/workbench/produce-lots/{produce_lot_id}/move-to-tool",
    response_model=ExperimentSchema,
)
def move_produce_lot_between_workbench_tools(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchProduceLotMoveSchema,
) -> ExperimentSchema:
    return handle_service_errors(
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
    return handle_service_errors(
        lambda: experiment_service.cut_workbench_produce_lot(
            experiment_id,
            request.slot_id,
            produce_lot_id,
        )
    )


@router.post(
    "/{experiment_id}/workbench/produce-lots/{produce_lot_id}/discard",
    response_model=ExperimentSchema,
)
def discard_produce_lot_from_workbench_tool(
    experiment_id: str,
    produce_lot_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
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
    return handle_service_errors(
        lambda: experiment_service.discard_tool_from_palette(experiment_id, request.tool_id)
    )


@router.post("/{experiment_id}/palette/sample-labels/discard", response_model=ExperimentSchema)
def discard_sample_label_from_palette(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_sample_label_from_palette(
            experiment_id,
            "sampling_bag_label",
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
    return handle_service_errors(
        lambda: experiment_service.restore_trashed_sample_label_to_workbench_tool(
            experiment_id,
            entry_id,
            find_tool_slot(experiment_id, request.target_tool_id),
        )
    )
