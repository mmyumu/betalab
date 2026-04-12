from app.domain.models import PowderFraction, ProduceLot
from app.services.domain_services.workbench import PlaceToolOnWorkbenchRequest, PlaceToolOnWorkbenchService
from app.services.experiment_service import ExperimentRuntimeService
from app.services.helpers.produce_canonical import sync_canonical_produce_model


def test_sync_canonical_produce_model_exposes_tool_fraction_and_material_state() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnWorkbenchService(service).run(
        experiment.id,
        PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="hdpe_storage_jar_2l"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    tool = runtime_experiment.workbench.slots[0].tool
    assert tool is not None
    tool.produce_lots = [
        ProduceLot(
            id="lot_1",
            label="Apple lot 1",
            produce_type="apple",
            total_mass_g=2450.0,
            cut_state="ground",
            temperature_c=-62.0,
            grind_quality_label="powder_fine",
            residual_co2_mass_g=18.0,
        )
    ]
    tool.powder_fractions = [
        PowderFraction(
            id="powder_1",
            source_lot_id="lot_1",
            mass_g=500.0,
        )
    ]

    sync_canonical_produce_model(runtime_experiment)

    matching_states = [
        state for state in runtime_experiment.produce_material_states if state.produce_lot_id == "lot_1"
    ]
    assert len(matching_states) == 1
    assert matching_states[0].cut_state == "ground"
    assert len(tool.produce_fractions) == 2
    assert {fraction.id for fraction in tool.produce_fractions} == {
        "produce_fraction_lot_1_station_1",
        "powder_1",
    }
    assert {fraction.produce_material_state_id for fraction in tool.produce_fractions} == {
        matching_states[0].id
    }


def test_experiment_schema_includes_canonical_produce_fields() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.workspace.produce_basket_lots = [
        ProduceLot(
            id="lot_1",
            label="Apple lot 1",
            produce_type="apple",
            total_mass_g=2500.0,
        )
    ]

    snapshot = service.get_experiment(experiment.id)

    assert snapshot.produce_material_states
    assert snapshot.workspace.produce_basket_fractions
    assert snapshot.workspace.produce_basket_fractions[0].produce_lot_id == "lot_1"
