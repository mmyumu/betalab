import pytest

from app.services.domain_services.analytical_balance import (
    CloseAnalyticalBalanceToolService,
    EmptyRequest,
    MoveAnalyticalBalanceToolToWorkbenchRequest,
    MoveAnalyticalBalanceToolToWorkbenchService,
    OpenAnalyticalBalanceToolService,
    PlaceToolOnAnalyticalBalanceRequest,
    PlaceToolOnAnalyticalBalanceService,
    RecordAnalyticalSampleMassService,
    TareAnalyticalBalanceService,
)
from app.services.experiment_service import ExperimentRuntimeService


def test_analytical_balance_only_accepts_the_50ml_tube() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="only accepts the 50 mL centrifuge tube"):
        PlaceToolOnAnalyticalBalanceService(service).run(
            experiment.id,
            PlaceToolOnAnalyticalBalanceRequest(tool_id="sample_vial_lcms"),
        )


def test_analytical_balance_records_precise_sample_mass() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    TareAnalyticalBalanceService(service).run(experiment.id, EmptyRequest())
    MoveAnalyticalBalanceToolToWorkbenchService(service).run(
        experiment.id,
        MoveAnalyticalBalanceToolToWorkbenchRequest(target_slot_id="station_1"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.workbench.slots[0].tool.powder_mass_g = 10.124
    runtime_experiment.workspace.widgets[1].tool = None
    runtime_experiment.workspace.widgets[2].tool = runtime_experiment.workbench.slots[0].tool
    runtime_experiment.workbench.slots[0].tool = None
    updated = RecordAnalyticalSampleMassService(service).run(experiment.id, EmptyRequest())
    assert updated.lims_reception.measured_sample_mass_g == pytest.approx(10.124)


def test_analytical_balance_rejects_out_of_spec_sample_mass() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    TareAnalyticalBalanceService(service).run(experiment.id, EmptyRequest())
    MoveAnalyticalBalanceToolToWorkbenchService(service).run(
        experiment.id,
        MoveAnalyticalBalanceToolToWorkbenchRequest(target_slot_id="station_1"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.workbench.slots[0].tool.powder_mass_g = 10.5
    runtime_experiment.workspace.widgets[1].tool = None
    runtime_experiment.workspace.widgets[2].tool = runtime_experiment.workbench.slots[0].tool
    runtime_experiment.workbench.slots[0].tool = None

    with pytest.raises(ValueError, match="ERR_RANGE"):
        RecordAnalyticalSampleMassService(service).run(experiment.id, EmptyRequest())


def test_analytical_balance_tool_can_be_closed_and_reopened() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )

    closed = CloseAnalyticalBalanceToolService(service).run(experiment.id, EmptyRequest())
    assert closed.workspace.widgets[2].tool.is_sealed is True

    reopened = OpenAnalyticalBalanceToolService(service).run(experiment.id, EmptyRequest())
    assert reopened.workspace.widgets[2].tool.is_sealed is False
