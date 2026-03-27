import pytest

from app.services.experiment_service import ExperimentService


def test_create_experiment_returns_empty_workbench() -> None:
    service = ExperimentService()

    experiment = service.create_experiment()

    assert experiment.status == "preparing"
    assert [slot.id for slot in experiment.workbench.slots] == [
        "station_1",
        "station_2",
    ]
    assert [slot.id for slot in experiment.rack.slots] == [
        "rack_slot_1",
        "rack_slot_2",
        "rack_slot_3",
        "rack_slot_4",
        "rack_slot_5",
        "rack_slot_6",
        "rack_slot_7",
        "rack_slot_8",
        "rack_slot_9",
        "rack_slot_10",
        "rack_slot_11",
        "rack_slot_12",
    ]
    assert all(slot.tool is None for slot in experiment.workbench.slots)
    assert all(slot.tool is None for slot in experiment.rack.slots)
    assert experiment.trash.tools == []
    assert [widget.id for widget in experiment.workspace.widgets] == [
        "workbench",
        "trash",
        "rack",
        "instrument",
        "basket",
        "grinder",
    ]
    assert experiment.workspace.widgets[0].is_present is True
    assert experiment.workspace.widgets[1].is_present is True
    assert experiment.workspace.widgets[2].is_present is False
    assert experiment.workspace.widgets[3].is_present is False
    assert experiment.workspace.widgets[4].is_present is True
    assert experiment.workspace.widgets[5].is_present is False
    assert experiment.workspace.widgets[1].anchor == "top-right"
    assert experiment.workspace.widgets[1].offset_x == 0
    assert experiment.workspace.widgets[1].offset_y == 126
    assert all(widget.is_trashed is False for widget in experiment.workspace.widgets)
    assert experiment.workspace.produce_lots == []
    assert experiment.audit_log[-1] == "Start by dragging an extraction tool onto the bench."


def test_workbench_commands_place_tool_merge_liquid_and_edit_volume() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

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


def test_place_sealed_sampling_bag_on_workbench() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.label == "Sealed sampling bag"
    assert slot.tool.tool_type == "sample_bag"
    assert slot.tool.sample_label_text is None
    assert slot.tool.produce_lots == []


def test_place_cutting_board_on_workbench() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.label == "Cutting board"
    assert slot.tool.tool_type == "cutting_board"


def test_grinder_accepts_workspace_produce_lot_and_dry_ice_pellets() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    moved = service.apply_command(
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )
    updated = service.apply_command(
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert moved.workspace.produce_lots == []
    assert len(grinder.produce_lots) == 1
    assert grinder.produce_lots[0].produce_type == "apple"
    assert len(grinder.liquids) == 1
    assert grinder.liquids[0].liquid_id == "dry_ice_pellets"
    assert grinder.liquids[0].volume_ml == 1000.0
    assert updated.audit_log[-1] == "Dry ice pellets added to Cryogenic grinder."


def test_grinder_dry_ice_mass_can_be_edited() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    added = service.apply_command(
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    liquid_id = next(widget for widget in added.workspace.widgets if widget.id == "grinder").liquids[0].id
    updated = service.apply_command(
        experiment.id,
        "update_workspace_widget_liquid_volume",
        {
            "widget_id": "grinder",
            "liquid_entry_id": liquid_id,
            "volume_ml": 12.3456,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert grinder.liquids[0].volume_ml == 12.346
    assert updated.audit_log[-1] == "Dry ice pellets adjusted to 12.346 g in Cryogenic grinder."


def test_workspace_cryogenics_cools_produce_and_consumes_dry_ice() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )
    service.apply_command(
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 1000,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert 18.0 < grinder.produce_lots[0].temperature_c < 19.0
    assert 980.0 < grinder.liquids[0].volume_ml < 985.0
    assert updated.audit_log[-1] == "Dry ice pellets added to Cryogenic grinder."


def test_workspace_cryogenics_warms_produce_back_up_when_dry_ice_is_gone() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )
    service.apply_command(
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )
    cooled = service.apply_command(
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 60000,
        },
    )

    grinder = next(widget for widget in cooled.workspace.widgets if widget.id == "grinder")
    cooled_temperature = grinder.produce_lots[0].temperature_c
    service.apply_command(
        experiment.id,
        "update_workspace_widget_liquid_volume",
        {
            "widget_id": "grinder",
            "liquid_entry_id": grinder.liquids[0].id,
            "volume_ml": 0,
        },
    )
    rewarmed = service.apply_command(
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 60000,
        },
    )

    grinder = next(widget for widget in rewarmed.workspace.widgets if widget.id == "grinder")
    assert grinder.produce_lots[0].temperature_c > cooled_temperature
    assert grinder.produce_lots[0].temperature_c <= 20.0


def test_one_kilo_of_dry_ice_does_not_drive_apple_lot_to_dry_ice_temperature() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )
    service.apply_command(
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    updated = None
    exhausted_temperature = None
    for _ in range(3600):
        updated = service.apply_command(
            experiment.id,
            "advance_workspace_cryogenics",
            {
                "elapsed_ms": 1000,
            },
        )
        grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
        if grinder.liquids[0].volume_ml == 0.0:
            exhausted_temperature = grinder.produce_lots[0].temperature_c
            break

    assert exhausted_temperature is not None
    assert exhausted_temperature > -5.0
    assert exhausted_temperature < 0.0


def test_sampling_bag_label_can_be_applied_and_edited() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    labeled = service.apply_command(
        experiment.id,
        "apply_sample_label_to_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )
    updated = service.apply_command(
        experiment.id,
        "update_workbench_tool_sample_label_text",
        {
            "slot_id": "station_1",
            "sample_label_text": "LOT-2026-041",
        },
    )

    labeled_slot = next(slot for slot in labeled.workbench.slots if slot.id == "station_1")
    updated_slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert labeled_slot.tool is not None
    assert labeled_slot.tool.sample_label_text == ""
    assert updated_slot.tool is not None
    assert updated_slot.tool.sample_label_text == "LOT-2026-041"
    assert updated.audit_log[-1] == "Sample label updated to LOT-2026-041 on Sealed sampling bag."


def test_sampling_bag_label_can_be_discarded_to_trash_and_restored() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "sealed_sampling_bag"},
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_2", "tool_id": "sealed_sampling_bag"},
    )
    service.apply_command(
        experiment.id,
        "apply_sample_label_to_workbench_tool",
        {"slot_id": "station_1"},
    )
    service.apply_command(
        experiment.id,
        "update_workbench_tool_sample_label_text",
        {"slot_id": "station_1", "sample_label_text": "LOT-2026-041"},
    )

    discarded = service.apply_command(
        experiment.id,
        "discard_sample_label_from_workbench_tool",
        {"slot_id": "station_1"},
    )
    restored = service.apply_command(
        experiment.id,
        "restore_trashed_sample_label_to_workbench_tool",
        {
            "target_slot_id": "station_2",
            "trash_sample_label_id": discarded.trash.sample_labels[0].id,
        },
    )

    discarded_slot = next(slot for slot in discarded.workbench.slots if slot.id == "station_1")
    restored_slot = next(slot for slot in restored.workbench.slots if slot.id == "station_2")
    assert discarded_slot.tool is not None
    assert discarded_slot.tool.sample_label_text is None
    assert len(discarded.trash.sample_labels) == 1
    assert discarded.trash.sample_labels[0].sample_label_text == "LOT-2026-041"
    assert restored_slot.tool is not None
    assert restored_slot.tool.sample_label_text == "LOT-2026-041"
    assert restored.trash.sample_labels == []


def test_sampling_bag_label_can_be_discarded_from_palette() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "discard_sample_label_from_palette",
        {"sample_label_id": "sampling_bag_label"},
    )

    assert len(updated.trash.sample_labels) == 1
    assert updated.trash.sample_labels[0].origin_label == "Palette"
    assert updated.trash.sample_labels[0].sample_label_text == ""


def test_sampling_bag_label_can_move_between_sampling_bags() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "sealed_sampling_bag"},
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_2", "tool_id": "sealed_sampling_bag"},
    )
    service.apply_command(
        experiment.id,
        "apply_sample_label_to_workbench_tool",
        {"slot_id": "station_1"},
    )
    service.apply_command(
        experiment.id,
        "update_workbench_tool_sample_label_text",
        {"slot_id": "station_1", "sample_label_text": "LOT-2026-041"},
    )

    moved = service.apply_command(
        experiment.id,
        "move_sample_label_between_workbench_tools",
        {"source_slot_id": "station_1", "target_slot_id": "station_2"},
    )

    source_slot = next(slot for slot in moved.workbench.slots if slot.id == "station_1")
    target_slot = next(slot for slot in moved.workbench.slots if slot.id == "station_2")
    assert source_slot.tool is not None
    assert source_slot.tool.sample_label_text is None
    assert target_slot.tool is not None
    assert target_slot.tool.sample_label_text == "LOT-2026-041"


def test_add_produce_lot_to_sampling_bag_moves_it_out_of_basket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert len(slot.tool.produce_lots) == 1
    assert slot.tool.produce_lots[0].label == "Apple lot 1"
    assert slot.tool.produce_lots[0].unit_count == 12
    assert slot.tool.produce_lots[0].total_mass_g == 2450.0
    assert updated.workspace.produce_lots == []
    assert updated.audit_log[-1] == "Apple lot 1 added to Sealed sampling bag."


def test_add_produce_lot_to_cutting_board_moves_it_out_of_basket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert len(slot.tool.produce_lots) == 1
    assert slot.tool.produce_lots[0].label == "Apple lot 1"
    assert slot.tool.produce_lots[0].is_contaminated is False
    assert updated.workspace.produce_lots == []
    assert updated.audit_log[-1] == "Apple lot 1 added to Cutting board."


def test_add_produce_lot_directly_to_empty_station_marks_it_contaminated() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is None
    assert len(slot.surface_produce_lots) == 1
    assert slot.surface_produce_lots[0].label == "Apple lot 1"
    assert slot.surface_produce_lots[0].is_contaminated is True
    assert updated.workspace.produce_lots == []
    assert (
        updated.audit_log[-1]
        == "Apple lot 1 placed directly on Station 1 and marked contaminated."
    )


def test_add_produce_lot_requires_a_sampling_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )

    with pytest.raises(ValueError, match="50 mL centrifuge tube does not accept produce."):
        service.apply_command(
            experiment.id,
            "add_produce_lot_to_workbench_tool",
            {
                "slot_id": "station_1",
                "produce_lot_id": created.workspace.produce_lots[0].id,
            },
        )


def test_sampling_bag_accepts_only_one_produce_lot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    first_lot = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    second_lot = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )
    service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": first_lot.workspace.produce_lots[0].id,
        },
    )

    with pytest.raises(ValueError, match="Sealed sampling bag already contains a produce lot."):
        service.apply_command(
            experiment.id,
            "add_produce_lot_to_workbench_tool",
            {
                "slot_id": "station_1",
                "produce_lot_id": second_lot.workspace.produce_lots[0].id,
            },
        )


def test_discard_produce_lot_from_sampling_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )
    service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )

    updated = service.apply_command(
        experiment.id,
        "discard_produce_lot_from_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.produce_lots == []
    assert updated.workspace.produce_lots == []
    assert len(updated.trash.produce_lots) == 1
    assert updated.trash.produce_lots[0].origin_label == "Sealed sampling bag"
    assert updated.trash.produce_lots[0].produce_lot.label == "Apple lot 1"
    assert updated.audit_log[-1] == "Apple lot 1 discarded from Sealed sampling bag."


def test_discard_produce_lot_from_basket_moves_it_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "discard_workspace_produce_lot",
        {
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )

    assert updated.workspace.produce_lots == []
    assert len(updated.trash.produce_lots) == 1
    assert updated.trash.produce_lots[0].origin_label == "Produce basket"
    assert updated.audit_log[-1] == "Apple lot 1 discarded from Produce basket."


def test_restore_trashed_produce_lot_to_sampling_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    discarded = service.apply_command(
        experiment.id,
        "discard_workspace_produce_lot",
        {
            "produce_lot_id": created.workspace.produce_lots[0].id,
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "restore_trashed_produce_lot_to_workbench_tool",
        {
            "target_slot_id": "station_1",
            "trash_produce_lot_id": discarded.trash.produce_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.produce_lots[0].label == "Apple lot 1"
    assert updated.trash.produce_lots == []


def test_discard_tool_from_palette_adds_it_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "discard_tool_from_palette",
        {
            "tool_id": "sealed_sampling_bag",
        },
    )

    assert len(updated.trash.tools) == 1
    assert updated.trash.tools[0].origin_label == "Palette"
    assert updated.trash.tools[0].tool.tool_type == "sample_bag"


def test_discard_workspace_widget_from_palette_marks_it_trashed() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "discard_workspace_widget",
        {
            "widget_id": "rack",
        },
    )

    widget = next(widget for widget in updated.workspace.widgets if widget.id == "rack")
    assert widget.is_present is False
    assert widget.is_trashed is True
    assert updated.audit_log[-1] == "Autosampler rack added to trash."


def test_workbench_slot_commands_add_and_remove_empty_stations() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    added = service.apply_command(
        experiment.id,
        "add_workbench_slot",
        {},
    )

    assert [slot.id for slot in added.workbench.slots] == [
        "station_1",
        "station_2",
        "station_3",
    ]
    assert added.audit_log[-1] == "Station 3 added to workbench."

    removed = service.apply_command(
        experiment.id,
        "remove_workbench_slot",
        {
            "slot_id": "station_3",
        },
    )

    assert [slot.id for slot in removed.workbench.slots] == [
        "station_1",
        "station_2",
    ]
    assert removed.audit_log[-1] == "Station 3 removed from workbench."


def test_remove_workbench_slot_requires_an_empty_station() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    with pytest.raises(ValueError, match="Station 1 must be empty before it can be removed."):
        service.apply_command(
            experiment.id,
            "remove_workbench_slot",
            {
                "slot_id": "station_1",
            },
        )


def test_remove_liquid_from_workbench_tool_updates_tool_contents() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
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

    liquid_id = updated.workbench.slots[0].tool.liquids[0].id
    updated = service.apply_command(
        experiment.id,
        "remove_liquid_from_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_entry_id": liquid_id,
        },
    )

    assert updated.workbench.slots[0].tool is not None
    assert updated.workbench.slots[0].tool.liquids == []
    assert updated.audit_log[-1] == "Acetonitrile removed from 50 mL centrifuge tube."


def test_move_tool_between_workbench_slots_updates_positions() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service = ExperimentService()
    experiment = service.create_experiment()
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "move_tool_between_workbench_slots",
        {
            "source_slot_id": "station_1",
            "target_slot_id": "station_2",
        },
    )

    assert updated.workbench.slots[0].tool is None
    assert updated.workbench.slots[1].tool is not None
    assert updated.workbench.slots[1].tool.label == "Autosampler vial"
    assert updated.audit_log[-1] == "Autosampler vial moved from Station 1 to Station 2."


def test_discard_workbench_tool_removes_it_from_station() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "discard_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    assert updated.workbench.slots[0].tool is None
    assert len(updated.trash.tools) == 1
    assert updated.trash.tools[0].origin_label == "Station 1"
    assert updated.trash.tools[0].tool.label == "Autosampler vial"
    assert updated.audit_log[-1] == "Autosampler vial discarded from Station 1."


def test_workspace_widget_commands_manage_presence_and_position() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    added = service.apply_command(
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "rack",
            "anchor": "top-left",
            "offset_x": 480,
            "offset_y": 420,
        },
    )
    rack_widget = next(widget for widget in added.workspace.widgets if widget.id == "rack")
    assert rack_widget.is_present is True
    assert rack_widget.is_trashed is False
    assert rack_widget.anchor == "top-left"
    assert rack_widget.offset_x == 480
    assert rack_widget.offset_y == 420
    assert added.audit_log[-1] == "Autosampler rack added to workspace."

    moved = service.apply_command(
        experiment.id,
        "move_workspace_widget",
        {
            "widget_id": "rack",
            "anchor": "top-right",
            "offset_x": 120,
            "offset_y": 460,
        },
    )
    rack_widget = next(widget for widget in moved.workspace.widgets if widget.id == "rack")
    assert rack_widget.anchor == "top-right"
    assert rack_widget.offset_x == 120
    assert rack_widget.offset_y == 460
    assert moved.audit_log[-1] == "Autosampler rack moved in workspace."

    discarded = service.apply_command(
        experiment.id,
        "discard_workspace_widget",
        {
            "widget_id": "rack",
        },
    )
    rack_widget = next(widget for widget in discarded.workspace.widgets if widget.id == "rack")
    assert rack_widget.is_present is False
    assert rack_widget.is_trashed is True
    assert discarded.audit_log[-1] == "Autosampler rack removed from workspace."


def test_non_trashable_workspace_widget_cannot_be_discarded() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Produce basket cannot be discarded."):
        service.apply_command(
            experiment.id,
            "discard_workspace_widget",
            {
                "widget_id": "basket",
            },
        )


def test_create_produce_lot_adds_apple_lot_to_basket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    assert len(updated.workspace.produce_lots) == 1
    assert updated.workspace.produce_lots[0].produce_type == "apple"
    assert updated.workspace.produce_lots[0].label == "Apple lot 1"
    assert updated.workspace.produce_lots[0].unit_count == 12
    assert updated.workspace.produce_lots[0].total_mass_g == 2450.0
    assert updated.workspace.produce_lots[0].cut_state == "whole"
    assert updated.audit_log[-1] == "Apple lot 1 created in Produce basket."


def test_cut_workbench_produce_lot_on_cutting_board_marks_lot_as_cut() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_lots[0].id
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    updated = service.apply_command(
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.produce_lots[0].cut_state == "cut"
    assert updated.audit_log[-1] == "Apple lot 1 cut on Cutting board."


def test_cut_workbench_surface_produce_lot_marks_lot_as_cut() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.apply_command(
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_lots[0].id
    service.apply_command(
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    updated = service.apply_command(
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.surface_produce_lots[0].cut_state == "cut"
    assert slot.surface_produce_lots[0].is_contaminated is True
    assert updated.audit_log[-1] == "Apple lot 1 cut on Station 1."


def test_create_produce_lot_rejects_unknown_produce_type() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Unsupported produce type"):
        service.apply_command(
            experiment.id,
            "create_produce_lot",
            {
                "produce_type": "pear",
            },
        )


def test_place_tool_in_rack_slot_creates_a_vial_directly_from_the_palette() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.apply_command(
        experiment.id,
        "place_tool_in_rack_slot",
        {
            "rack_slot_id": "rack_slot_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    assert updated.rack.slots[0].tool is not None
    assert updated.rack.slots[0].tool.label == "Autosampler vial"
    assert updated.workbench.slots[0].tool is None
    assert updated.audit_log[-1] == "Autosampler vial placed in Position 1."


def test_restore_trashed_tool_to_workbench_slot_restores_saved_tool_state() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
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
    discarded = service.apply_command(
        experiment.id,
        "discard_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    restored = service.apply_command(
        experiment.id,
        "restore_trashed_tool_to_workbench_slot",
        {
            "trash_tool_id": discarded.trash.tools[0].id,
            "target_slot_id": "station_2",
        },
    )

    assert restored.workbench.slots[1].tool is not None
    assert restored.workbench.slots[1].tool.label == "Autosampler vial"
    assert restored.workbench.slots[1].tool.liquids[0].volume_ml == 2.0
    assert restored.trash.tools == []
    assert restored.audit_log[-1] == "Autosampler vial restored from trash to Station 2."


def test_place_workbench_tool_in_rack_slot_moves_vial_into_rack() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )

    assert updated.workbench.slots[0].tool is None
    assert updated.rack.slots[0].tool is not None
    assert updated.rack.slots[0].tool.label == "Autosampler vial"
    assert updated.audit_log[-1] == "Autosampler vial moved from Station 1 to Position 1."


def test_remove_rack_tool_to_workbench_slot_moves_vial_back_to_bench() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    service.apply_command(
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "remove_rack_tool_to_workbench_slot",
        {
            "rack_slot_id": "rack_slot_1",
            "target_slot_id": "station_2",
        },
    )

    assert updated.rack.slots[0].tool is None
    assert updated.workbench.slots[1].tool is not None
    assert updated.workbench.slots[1].tool.label == "Autosampler vial"
    assert updated.audit_log[-1] == "Autosampler vial moved from Position 1 to Station 2."


def test_discard_rack_tool_removes_it_from_rack() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    service.apply_command(
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )

    updated = service.apply_command(
        experiment.id,
        "discard_rack_tool",
        {
            "rack_slot_id": "rack_slot_1",
        },
    )

    assert updated.rack.slots[0].tool is None
    assert len(updated.trash.tools) == 1
    assert updated.trash.tools[0].origin_label == "Position 1"
    assert updated.trash.tools[0].tool.label == "Autosampler vial"
    assert updated.audit_log[-1] == "Autosampler vial discarded from Position 1."


def test_restore_trashed_tool_to_rack_slot_restores_vial_to_rack() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    service.apply_command(
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )
    discarded = service.apply_command(
        experiment.id,
        "discard_rack_tool",
        {
            "rack_slot_id": "rack_slot_1",
        },
    )

    restored = service.apply_command(
        experiment.id,
        "restore_trashed_tool_to_rack_slot",
        {
            "trash_tool_id": discarded.trash.tools[0].id,
            "rack_slot_id": "rack_slot_2",
        },
    )

    assert restored.rack.slots[1].tool is not None
    assert restored.rack.slots[1].tool.label == "Autosampler vial"
    assert restored.trash.tools == []
    assert restored.audit_log[-1] == "Autosampler vial restored from trash to Position 2."


def test_add_liquid_uses_remaining_capacity_for_small_tools() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
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
    assert slot.tool.liquids[0].volume_ml == 2.0
    assert (
        updated.audit_log[-1]
        == "Acetonitrile added to Autosampler vial at 2 mL (remaining capacity)."
    )


def test_get_experiment_raises_for_unknown_id() -> None:
    service = ExperimentService()

    with pytest.raises(KeyError):
        service.get_experiment("missing")


def test_apply_command_raises_for_unknown_experiment() -> None:
    service = ExperimentService()

    with pytest.raises(KeyError):
        service.apply_command("missing", "place_tool_on_workbench", {})


def test_add_liquid_requires_a_placed_tool() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Place a tool on Station 1 before adding liquids."):
        service.apply_command(
            experiment.id,
            "add_liquid_to_workbench_tool",
            {
                "slot_id": "station_1",
                "liquid_id": "acetonitrile_extraction",
            },
        )


def test_remove_liquid_requires_a_known_tool_and_liquid() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Place a tool on Station 1 before editing liquids."):
        service.apply_command(
            experiment.id,
            "remove_liquid_from_workbench_tool",
            {
                "slot_id": "station_1",
                "liquid_entry_id": "bench_liquid_missing",
            },
        )

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )

    with pytest.raises(ValueError, match="Unknown workbench liquid"):
        service.apply_command(
            experiment.id,
            "remove_liquid_from_workbench_tool",
            {
                "slot_id": "station_1",
                "liquid_entry_id": "bench_liquid_missing",
            },
        )


def test_move_tool_requires_a_source_tool_and_empty_target() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Place a tool on Station 1 before moving it."):
        service.apply_command(
            experiment.id,
            "move_tool_between_workbench_slots",
            {
                "source_slot_id": "station_1",
                "target_slot_id": "station_2",
            },
        )


def test_rack_commands_require_vials_present_and_compatible() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Place a tool on Station 1 before moving it into the rack."):
        service.apply_command(
            experiment.id,
            "place_workbench_tool_in_rack_slot",
            {
                "source_slot_id": "station_1",
                "rack_slot_id": "rack_slot_1",
            },
        )

    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "beaker_rinse",
        },
    )
    with pytest.raises(ValueError, match="Only autosampler vials can be placed in the rack."):
        service.apply_command(
            experiment.id,
            "place_workbench_tool_in_rack_slot",
            {
                "source_slot_id": "station_1",
                "rack_slot_id": "rack_slot_1",
            },
        )

    service = ExperimentService()
    experiment = service.create_experiment()
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    service.apply_command(
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_2",
            "tool_id": "sample_vial_lcms",
        },
    )

    with pytest.raises(ValueError, match="Position 1 already contains a vial"):
        service.apply_command(
            experiment.id,
            "place_workbench_tool_in_rack_slot",
            {
                "source_slot_id": "station_2",
                "rack_slot_id": "rack_slot_1",
            },
        )

    with pytest.raises(
        ValueError, match="Place a vial in Position 2 before moving it back to the bench."
    ):
        service.apply_command(
            experiment.id,
            "remove_rack_tool_to_workbench_slot",
            {
                "rack_slot_id": "rack_slot_2",
                "target_slot_id": "station_1",
            },
        )

    service = ExperimentService()
    experiment = service.create_experiment()
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    service.apply_command(
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_2",
            "tool_id": "beaker_rinse",
        },
    )

    with pytest.raises(ValueError, match="Station 2 already contains a tool"):
        service.apply_command(
            experiment.id,
            "move_tool_between_workbench_slots",
            {
                "source_slot_id": "station_1",
                "target_slot_id": "station_2",
            },
        )


def test_update_volume_rounds_float_noise_in_audit_log() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()
    service.apply_command(
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

    liquid_id = updated.workbench.slots[0].tool.liquids[0].id
    updated = service.apply_command(
        experiment.id,
        "update_workbench_liquid_volume",
        {
            "slot_id": "station_1",
            "liquid_entry_id": liquid_id,
            "volume_ml": 22.799999999999,
        },
    )

    assert updated.audit_log[-1] == "Acetonitrile adjusted to 22.8 mL in 50 mL centrifuge tube."
