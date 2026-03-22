import pytest

from app.services.experiment_service import ExperimentService


def test_create_experiment_returns_default_lcmsms_setup() -> None:
    service = ExperimentService()

    experiment = service.create_experiment("lcmsms_single_analyte")

    assert experiment.scenario_id == "lcmsms_single_analyte"
    assert experiment.status == "preparing"
    assert experiment.molecule.name == "Molecule A"
    assert set(experiment.rack.positions.keys()) == {"A1", "A2", "A3"}
    assert experiment.containers["flask_std_1"].capacity_ml == 100
    assert experiment.containers["stock_analyte"].current_volume_ml == 1000


def test_add_liquid_updates_flask_concentration() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("lcmsms_single_analyte")

    updated = service.apply_command(
        experiment.id,
        "add_liquid",
        {
            "target_id": "flask_std_1",
            "source_id": "stock_analyte",
            "volume_ml": 10,
            "analyte_concentration_ng_ml": 1000,
        },
    )
    updated = service.apply_command(
        experiment.id,
        "add_liquid",
        {
            "target_id": "flask_std_1",
            "source_id": "solvent_a",
            "volume_ml": 90,
        },
    )

    flask = updated.containers["flask_std_1"]

    assert flask.current_volume_ml == 100
    assert flask.analyte_concentration_ng_ml == 100
    assert len(flask.contents) == 2


def test_run_sequence_generates_two_transition_results_for_each_loaded_vial() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("lcmsms_single_analyte")

    service.apply_command(
        experiment.id,
        "add_liquid",
        {
            "target_id": "flask_std_1",
            "source_id": "stock_analyte",
            "volume_ml": 10,
            "analyte_concentration_ng_ml": 1000,
        },
    )
    service.apply_command(
        experiment.id,
        "add_liquid",
        {
            "target_id": "flask_std_1",
            "source_id": "solvent_a",
            "volume_ml": 90,
        },
    )
    updated = service.apply_command(
        experiment.id,
        "transfer_to_vial",
        {
            "source_id": "flask_std_1",
            "label": "Std 1 vial",
            "volume_ml": 1,
        },
    )

    vial_id = next(container.id for container in updated.containers.values() if container.kind == "vial")
    service.apply_command(
        experiment.id,
        "place_vial_in_rack",
        {
            "position": "A1",
            "vial_id": vial_id,
        },
    )
    updated = service.apply_command(experiment.id, "run_sequence", {})

    assert updated.status == "completed"
    assert len(updated.runs) == 1
    assert updated.runs[0].result is not None
    assert len(updated.runs[0].result.transition_results) == 2
    assert updated.runs[0].result.estimated_concentration_ng_ml == 100


def test_get_experiment_raises_for_unknown_id() -> None:
    service = ExperimentService()

    with pytest.raises(KeyError):
        service.get_experiment("missing")


def test_apply_command_raises_for_unknown_experiment() -> None:
    service = ExperimentService()

    with pytest.raises(KeyError):
        service.apply_command("missing", "run_sequence", {})


def test_create_flask_adds_new_container() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("lcmsms_single_analyte")

    updated = service.apply_command(
        experiment.id,
        "create_flask",
        {
          "label": "QC",
          "capacity_ml": 50,
        },
    )

    created = next(container for container in updated.containers.values() if container.label == "QC")
    assert created.kind == "flask"
    assert created.capacity_ml == 50
    assert updated.audit_log[-1] == "Created flask QC"


def test_create_pesticide_workbench_experiment_exposes_empty_slots() -> None:
    service = ExperimentService()

    experiment = service.create_experiment("pesticides_workbench")

    assert experiment.scenario_id == "pesticides_workbench"
    assert experiment.workbench is not None
    assert [slot.id for slot in experiment.workbench.slots] == [
        "station_1",
        "station_2",
        "station_3",
        "station_4",
    ]
    assert all(slot.tool is None for slot in experiment.workbench.slots)


def test_workbench_commands_place_tool_merge_liquid_and_edit_volume() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("pesticides_workbench")

    updated = service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )
    updated = service.apply_command(
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.label == "50 mL centrifuge tube"
    assert len(slot.tool.liquids) == 1
    assert slot.tool.liquids[0].volume_ml == 10.0

    updated = service.apply_command(
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
        },
    )
    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert len(slot.tool.liquids) == 1
    assert slot.tool.liquids[0].volume_ml == 20.0

    updated = service.apply_command(
        experiment.id,
        "update_workbench_liquid_volume",
        {
            "slot_id": "station_1",
            "liquid_entry_id": slot.tool.liquids[0].id,
            "volume_ml": 1.5,
        },
    )
    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.liquids[0].volume_ml == 1.5
    assert updated.audit_log[-1] == "Acetonitrile adjusted to 1.5 mL in 50 mL centrifuge tube."


def test_add_liquid_raises_when_container_capacity_is_exceeded() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("lcmsms_single_analyte")

    with pytest.raises(ValueError, match="Container capacity exceeded"):
        service.apply_command(
            experiment.id,
            "add_liquid",
            {
                "target_id": "flask_std_1",
                "source_id": "solvent_a",
                "volume_ml": 101,
            },
        )


def test_transfer_to_vial_raises_when_transfer_volume_exceeds_source_volume() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("lcmsms_single_analyte")

    with pytest.raises(ValueError, match="Transfer volume exceeds source volume"):
        service.apply_command(
            experiment.id,
            "transfer_to_vial",
            {
                "source_id": "flask_std_1",
                "label": "Std 1 vial",
                "volume_ml": 1,
            },
        )


def test_place_vial_in_rack_raises_for_unknown_position() -> None:
    service = ExperimentService()
    experiment = service.create_experiment("lcmsms_single_analyte")
    service.apply_command(
        experiment.id,
        "add_liquid",
        {
            "target_id": "flask_std_1",
            "source_id": "solvent_a",
            "volume_ml": 10,
        },
    )
    updated = service.apply_command(
        experiment.id,
        "transfer_to_vial",
        {
            "source_id": "flask_std_1",
            "label": "Std 1 vial",
            "volume_ml": 1,
        },
    )
    vial_id = next(container.id for container in updated.containers.values() if container.kind == "vial")

    with pytest.raises(ValueError, match="Unknown rack position"):
        service.apply_command(
            experiment.id,
            "place_vial_in_rack",
            {
                "position": "B9",
                "vial_id": vial_id,
            },
        )
