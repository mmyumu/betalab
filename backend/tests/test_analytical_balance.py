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
    tool = runtime_experiment.workbench.slots[0].tool
    assert tool is not None
    tool.powder_mass_g = 10.124
    runtime_experiment.workspace.widgets[1].tool = None
    runtime_experiment.workspace.widgets[2].tool = tool
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
    tool = runtime_experiment.workbench.slots[0].tool
    assert tool is not None
    tool.powder_mass_g = 10.5
    runtime_experiment.workspace.widgets[1].tool = None
    runtime_experiment.workspace.widgets[2].tool = tool
    runtime_experiment.workbench.slots[0].tool = None

    with pytest.raises(ValueError, match="ERR_RANGE"):
        RecordAnalyticalSampleMassService(service).run(experiment.id, EmptyRequest())


def test_analytical_balance_tare_persists_when_different_tube_placed() -> None:
    """Tare is a balance property, not a tube property — placing a new tube must not clear it."""
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    # Tare with tube A
    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    TareAnalyticalBalanceService(service).run(experiment.id, EmptyRequest())
    tare_mass = service._require_experiment(experiment.id).analytical_balance.tare_mass_g
    assert tare_mass == pytest.approx(12.0)

    # Remove tube A, place tube B
    MoveAnalyticalBalanceToolToWorkbenchService(service).run(
        experiment.id,
        MoveAnalyticalBalanceToolToWorkbenchRequest(target_slot_id="station_1"),
    )
    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )

    # Tare value must still be set — placing a new tube must not clear it
    updated = service._require_experiment(experiment.id)
    assert updated.analytical_balance.tare_mass_g == pytest.approx(12.0)


def test_analytical_balance_tare_works_on_empty_balance() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    updated = TareAnalyticalBalanceService(service).run(experiment.id, EmptyRequest())
    assert updated.analytical_balance.tare_mass_g == pytest.approx(0.0)


def test_analytical_balance_tare_works_with_liquid_in_tube() -> None:
    from app.domain.models import WorkbenchLiquid

    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    tool = runtime_experiment.workspace.widgets[2].tool
    assert tool is not None
    tool.liquids.append(WorkbenchLiquid(id="liq1", liquid_id="acetonitrile", name="ACN", volume_ml=10.0, accent="blue"))

    updated = TareAnalyticalBalanceService(service).run(experiment.id, EmptyRequest())
    # 12g (tube) + 10g (liquid) = 22g tare
    assert updated.analytical_balance.tare_mass_g == pytest.approx(22.0)


def test_analytical_balance_tool_can_be_closed_and_reopened() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )

    closed = CloseAnalyticalBalanceToolService(service).run(experiment.id, EmptyRequest())
    closed_tool = closed.workspace.widgets[2].tool
    assert closed_tool is not None
    assert closed_tool.is_sealed is True

    reopened = OpenAnalyticalBalanceToolService(service).run(experiment.id, EmptyRequest())
    reopened_tool = reopened.workspace.widgets[2].tool
    assert reopened_tool is not None
    assert reopened_tool.is_sealed is False
