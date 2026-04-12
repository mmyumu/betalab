from app.domain.models import PowderFraction
from app.services.domain_services.workbench import _pour_fractions_proportional
from app.services.experiment_repository import _deserialize_experiment, _serialize_experiment
from app.services.experiment_service import ExperimentRuntimeService
from app.services.helpers.workbench import build_workbench_tool


def test_build_workbench_tool_assigns_contact_impurity() -> None:
    tool = build_workbench_tool("hdpe_storage_jar_2l")

    assert tool.contact_impurity_mg_per_g > 0


def test_pour_fractions_adds_target_contact_impurity_and_tracks_exposure() -> None:
    source = [
        PowderFraction(
            id="powder_source",
            source_lot_id="lot_a",
            mass_g=2.0,
            impurity_mass_mg=0.1,
            exposure_container_ids=["jar_source"],
        )
    ]
    dest: list[PowderFraction] = []
    target_tool = build_workbench_tool("sample_vial_lcms")
    target_tool.id = "vial_1"
    target_tool.contact_impurity_mg_per_g = 0.02

    _pour_fractions_proportional(source, dest, 0.5, target_tool)

    assert source[0].mass_g == 1.0
    assert source[0].impurity_mass_mg == 0.05
    assert dest == [
        PowderFraction(
            id=dest[0].id,
            source_lot_id="lot_a",
            mass_g=1.0,
            impurity_mass_mg=0.07,
            exposure_container_ids=["jar_source", "vial_1"],
        )
    ]


def test_pour_fractions_keeps_distinct_exposure_histories_separate() -> None:
    source = [
        PowderFraction(
            id="powder_source",
            source_lot_id="lot_a",
            mass_g=1.0,
            impurity_mass_mg=0.02,
            exposure_container_ids=["jar_source"],
        )
    ]
    target_tool = build_workbench_tool("sample_vial_lcms")
    target_tool.id = "vial_1"
    target_tool.contact_impurity_mg_per_g = 0.01
    dest = [
        PowderFraction(
            id="powder_existing",
            source_lot_id="lot_a",
            mass_g=0.5,
            impurity_mass_mg=0.03,
            exposure_container_ids=["other_jar", "vial_1"],
        )
    ]

    _pour_fractions_proportional(source, dest, 1.0, target_tool)

    assert len(dest) == 2
    assert {tuple(f.exposure_container_ids) for f in dest} == {
        ("other_jar", "vial_1"),
        ("jar_source", "vial_1"),
    }


def test_experiment_roundtrip_preserves_powder_impurity_state() -> None:
    service = ExperimentRuntimeService()
    created = service.create_experiment()
    experiment = service._require_experiment(created.id)
    tool = build_workbench_tool("centrifuge_tube_50ml")
    tool.contact_impurity_mg_per_g = 0.015
    tool.powder_fractions = [
        PowderFraction(
            id="powder_1",
            source_lot_id="lot_a",
            mass_g=1.25,
            impurity_mass_mg=0.08,
            exposure_container_ids=["jar_a", "tube_a"],
        )
    ]
    experiment.workbench.slots[0].tool = tool

    restored = _deserialize_experiment(_serialize_experiment(experiment))
    restored_tool = restored.workbench.slots[0].tool

    assert restored_tool is not None
    assert restored_tool.contact_impurity_mg_per_g == 0.015
    assert restored_tool.powder_fractions == [
        PowderFraction(
            id="powder_1",
            source_lot_id="lot_a",
            mass_g=1.25,
            impurity_mass_mg=0.08,
            exposure_container_ids=["jar_a", "tube_a"],
        )
    ]
