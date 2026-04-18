from app.domain.models import ProduceFraction, ProduceMaterialState, WorkbenchLiquid
from app.services.domain_services.analytical_balance import (
    EmptyRequest,
    LoadSpatulaFromAnalyticalBalanceToolService,
    PlaceToolOnAnalyticalBalanceRequest,
    PlaceToolOnAnalyticalBalanceService,
    PourSpatulaIntoAnalyticalBalanceToolRequest,
    PourSpatulaIntoAnalyticalBalanceToolService,
)
from app.services.domain_services.workbench import (
    DiscardSpatulaService,
    LoadSpatulaFromWorkbenchToolService,
    PlaceToolOnWorkbenchRequest,
    PlaceToolOnWorkbenchService,
    PourSpatulaIntoWorkbenchToolRequest,
    PourSpatulaIntoWorkbenchToolService,
    WorkbenchSlotRequest,
)
from app.services.experiment_service import ExperimentRuntimeService


def test_workbench_spatula_load_updates_canonical_tool_fraction_mass(monkeypatch) -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnWorkbenchService(service).run(
        experiment.id,
        PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="hdpe_storage_jar_2l"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    tool = runtime_experiment.workbench.slots[0].tool
    assert tool is not None
    tool.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=6.0,
            location_kind="workbench_tool",
            location_id="station_1",
            container_id=tool.id,
            container_label=tool.label,
        )
    ]

    monkeypatch.setattr("app.services.domain_services.workbench.random.gauss", lambda mu, sigma: 1.0)

    updated = LoadSpatulaFromWorkbenchToolService(service).run(experiment.id, WorkbenchSlotRequest(slot_id="station_1"))

    tool = updated.workbench.slots[0].tool
    assert tool is not None
    assert tool.produce_fractions
    assert tool.produce_fractions[0].mass_g == 1.0
    assert updated.spatula.produce_fractions
    assert updated.spatula.produce_fractions[0].mass_g == 5.0
    assert updated.spatula.produce_fractions[0].location_kind == "spatula"
    runtime_experiment = service._require_experiment(experiment.id)
    assert runtime_experiment.spatula.produce_fractions
    assert runtime_experiment.spatula.produce_fractions[0].mass_g == 5.0


def test_workbench_spatula_load_can_start_from_canonical_only_powder(monkeypatch) -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnWorkbenchService(service).run(
        experiment.id,
        PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="hdpe_storage_jar_2l"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    tool = runtime_experiment.workbench.slots[0].tool
    assert tool is not None
    tool.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=6.0,
            location_kind="workbench_tool",
            location_id="station_1",
            container_id=tool.id,
            container_label=tool.label,
        )
    ]
    runtime_experiment.spatula.produce_fractions = []

    monkeypatch.setattr("app.services.domain_services.workbench.random.gauss", lambda mu, sigma: 1.0)

    updated = LoadSpatulaFromWorkbenchToolService(service).run(experiment.id, WorkbenchSlotRequest(slot_id="station_1"))

    tool = updated.workbench.slots[0].tool
    assert tool is not None
    assert sum(f.mass_g for f in tool.produce_fractions) == 1.0
    assert sum(f.mass_g for f in updated.spatula.produce_fractions) == 5.0


def test_workbench_spatula_pour_updates_canonical_target_fraction_mass() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnWorkbenchService(service).run(
        experiment.id,
        PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=4.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = PourSpatulaIntoWorkbenchToolService(service).run(
        experiment.id,
        PourSpatulaIntoWorkbenchToolRequest(slot_id="station_1", delta_mass_g=1.5),
    )

    tool = updated.workbench.slots[0].tool
    assert tool is not None
    assert tool.produce_fractions
    assert tool.produce_fractions[0].mass_g == 1.5
    assert updated.spatula.produce_fractions
    assert updated.spatula.produce_fractions[0].mass_g == 2.5
    assert updated.spatula.produce_fractions[0].location_kind == "spatula"


def test_workbench_spatula_pour_respects_liquid_occupied_volume() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnWorkbenchService(service).run(
        experiment.id,
        PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    tool = runtime_experiment.workbench.slots[0].tool
    assert tool is not None
    tool.liquids = [
        WorkbenchLiquid(
            id="bench_liquid_1",
            liquid_id="acetonitrile_extraction",
            name="Acetonitrile",
            volume_ml=48.0,
            accent="amber",
        )
    ]
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=4.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = PourSpatulaIntoWorkbenchToolService(service).run(
        experiment.id,
        PourSpatulaIntoWorkbenchToolRequest(slot_id="station_1", delta_mass_g=1.5),
    )

    tool = updated.workbench.slots[0].tool
    assert tool is not None
    assert tool.produce_fractions
    assert tool.produce_fractions[0].mass_g == 1.0
    assert updated.spatula.produce_fractions
    assert updated.spatula.produce_fractions[0].mass_g == 3.0


def test_workbench_spatula_pour_can_start_from_canonical_only_spatula() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnWorkbenchService(service).run(
        experiment.id,
        PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=4.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = PourSpatulaIntoWorkbenchToolService(service).run(
        experiment.id,
        PourSpatulaIntoWorkbenchToolRequest(slot_id="station_1", delta_mass_g=1.5),
    )

    tool = updated.workbench.slots[0].tool
    assert tool is not None
    assert sum(f.mass_g for f in tool.produce_fractions) == 1.5
    assert sum(f.mass_g for f in updated.spatula.produce_fractions) == 2.5


def test_analytical_balance_spatula_load_updates_canonical_tool_fraction_mass(monkeypatch) -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="hdpe_storage_jar_2l"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    tool = runtime_experiment.workspace.widgets[2].tool
    assert tool is not None
    tool.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=6.0,
            location_kind="workspace_widget_tool",
            location_id="analytical_balance",
            container_id=tool.id,
            container_label=tool.label,
        )
    ]

    monkeypatch.setattr("app.services.domain_services.analytical_balance.random.gauss", lambda mu, sigma: 1.0)

    updated = LoadSpatulaFromAnalyticalBalanceToolService(service).run(experiment.id, EmptyRequest())

    tool = updated.workspace.widgets[2].tool
    assert tool is not None
    assert tool.produce_fractions
    assert tool.produce_fractions[0].mass_g == 1.0
    assert updated.spatula.produce_fractions
    assert updated.spatula.produce_fractions[0].mass_g == 5.0
    assert updated.spatula.produce_fractions[0].location_kind == "spatula"
    runtime_experiment = service._require_experiment(experiment.id)
    assert runtime_experiment.spatula.produce_fractions
    assert runtime_experiment.spatula.produce_fractions[0].mass_g == 5.0


def test_analytical_balance_spatula_load_can_start_from_canonical_only_powder(monkeypatch) -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="hdpe_storage_jar_2l"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    tool = runtime_experiment.workspace.widgets[2].tool
    assert tool is not None
    tool.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=6.0,
            location_kind="workspace_widget_tool",
            location_id="analytical_balance",
            container_id=tool.id,
            container_label=tool.label,
        )
    ]

    monkeypatch.setattr("app.services.domain_services.analytical_balance.random.gauss", lambda mu, sigma: 1.0)

    updated = LoadSpatulaFromAnalyticalBalanceToolService(service).run(experiment.id, EmptyRequest())

    tool = updated.workspace.widgets[2].tool
    assert tool is not None
    assert sum(f.mass_g for f in tool.produce_fractions) == 1.0
    assert sum(f.mass_g for f in updated.spatula.produce_fractions) == 5.0


def test_analytical_balance_spatula_pour_updates_canonical_target_fraction_mass() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=4.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = PourSpatulaIntoAnalyticalBalanceToolService(service).run(
        experiment.id,
        PourSpatulaIntoAnalyticalBalanceToolRequest(delta_mass_g=1.5),
    )

    tool = updated.workspace.widgets[2].tool
    assert tool is not None
    assert tool.produce_fractions
    assert tool.produce_fractions[0].mass_g == 1.5
    assert updated.spatula.produce_fractions
    assert updated.spatula.produce_fractions[0].mass_g == 2.5
    assert updated.spatula.produce_fractions[0].location_kind == "spatula"


def test_analytical_balance_spatula_pour_respects_liquid_occupied_volume() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    tool = runtime_experiment.workspace.widgets[2].tool
    assert tool is not None
    tool.liquids = [
        WorkbenchLiquid(
            id="bench_liquid_1",
            liquid_id="acetonitrile_extraction",
            name="Acetonitrile",
            volume_ml=48.0,
            accent="amber",
        )
    ]
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=4.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = PourSpatulaIntoAnalyticalBalanceToolService(service).run(
        experiment.id,
        PourSpatulaIntoAnalyticalBalanceToolRequest(delta_mass_g=1.5),
    )

    tool = updated.workspace.widgets[2].tool
    assert tool is not None
    assert tool.produce_fractions
    assert tool.produce_fractions[0].mass_g == 1.0
    assert updated.spatula.produce_fractions
    assert updated.spatula.produce_fractions[0].mass_g == 3.0


def test_analytical_balance_spatula_pour_can_start_from_canonical_only_spatula() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    PlaceToolOnAnalyticalBalanceService(service).run(
        experiment.id,
        PlaceToolOnAnalyticalBalanceRequest(tool_id="centrifuge_tube_50ml"),
    )
    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=4.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = PourSpatulaIntoAnalyticalBalanceToolService(service).run(
        experiment.id,
        PourSpatulaIntoAnalyticalBalanceToolRequest(delta_mass_g=1.5),
    )

    tool = updated.workspace.widgets[2].tool
    assert tool is not None
    assert sum(f.mass_g for f in tool.produce_fractions) == 1.5
    assert sum(f.mass_g for f in updated.spatula.produce_fractions) == 2.5


def test_discard_spatula_clears_runtime_canonical_fraction() -> None:
    service = ExperimentRuntimeService()
    experiment = service.create_experiment()

    runtime_experiment = service._require_experiment(experiment.id)
    runtime_experiment.spatula.is_loaded = True
    runtime_experiment.produce_material_states = [ProduceMaterialState(id="state_powder", produce_lot_id="lot_1", material_state="ground")]
    runtime_experiment.spatula.produce_fractions = [
        ProduceFraction(
            id="produce_fraction_1",
            produce_lot_id="lot_1",
            produce_material_state_id="state_powder",
            mass_g=2.0,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
    ]

    updated = DiscardSpatulaService(service).run(experiment.id, None)

    assert updated.spatula.is_loaded is False
    assert updated.spatula.produce_fractions == []
    runtime_experiment = service._require_experiment(experiment.id)
    assert runtime_experiment.spatula.produce_fractions == []
