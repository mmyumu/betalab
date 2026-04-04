from app.schemas.experiment import (
    ExperimentSchema,
    GrossMassOffsetUpdateSchema,
    GrossWeightRecordSchema,
    LimsLabelPrintSchema,
    LimsReceptionCreateSchema,
    ReceivedBagPlacementSchema,
    WorkbenchSlotReferenceSchema,
)

from .common import experiment_service, handle_service_errors, router


@router.post("/{experiment_id}/reception/bag/place-on-workbench", response_model=ExperimentSchema)
def place_received_bag_on_workbench(
    experiment_id: str,
    request: ReceivedBagPlacementSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.place_received_bag_on_workbench(
            experiment_id,
            request.target_slot_id,
        )
    )


@router.post("/{experiment_id}/reception/bag/discard", response_model=ExperimentSchema)
def discard_received_bag(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(lambda: experiment_service.discard_basket_tool(experiment_id))


@router.post("/{experiment_id}/reception/gross-weight/record", response_model=ExperimentSchema)
def record_gross_weight(
    experiment_id: str,
    request: GrossWeightRecordSchema | None = None,
) -> ExperimentSchema:
    return handle_service_errors(
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
    return handle_service_errors(
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
    return handle_service_errors(
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
    return handle_service_errors(
        lambda: experiment_service.print_lims_label(
            experiment_id,
            request.entry_id if request is not None else None,
        )
    )


@router.delete("/{experiment_id}/lims/printed-label", response_model=ExperimentSchema)
def discard_printed_lims_label(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.discard_printed_lims_label(experiment_id)
    )


@router.post("/{experiment_id}/lims/apply-label-to-workbench-bag", response_model=ExperimentSchema)
def apply_printed_lims_label(
    experiment_id: str,
    request: WorkbenchSlotReferenceSchema,
) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.apply_printed_lims_label(experiment_id, request.slot_id)
    )


@router.post("/{experiment_id}/lims/apply-label-to-basket-bag", response_model=ExperimentSchema)
def apply_printed_lims_label_to_basket_bag(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.apply_printed_lims_label_to_basket_bag(experiment_id)
    )


@router.post(
    "/{experiment_id}/lims/apply-label-to-gross-balance-bag",
    response_model=ExperimentSchema,
)
def apply_printed_lims_label_to_gross_balance_bag(experiment_id: str) -> ExperimentSchema:
    return handle_service_errors(
        lambda: experiment_service.apply_printed_lims_label_to_gross_balance_bag(experiment_id)
    )
