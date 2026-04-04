import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.services.experiment_repository import SqliteExperimentRepository
from app.services.experiment_service import ExperimentService
from app.services.received_sample_generation import (
    SAMPLE_BAG_TARE_MASS_G,
)


def apply_command(
    service: ExperimentService,
    experiment_id: str,
    command_type: str,
    payload: dict,
):
    handlers = {
        "add_workbench_slot": lambda: service.add_workbench_slot(experiment_id),
        "remove_workbench_slot": lambda: service.remove_workbench_slot(experiment_id, payload["slot_id"]),
        "place_tool_on_workbench": lambda: service.place_tool_on_workbench(
            experiment_id, payload["slot_id"], payload["tool_id"]
        ),
        "move_tool_between_workbench_slots": lambda: service.move_tool_between_workbench_slots(
            experiment_id, payload["source_slot_id"], payload["target_slot_id"]
        ),
        "discard_workbench_tool": lambda: service.discard_workbench_tool(experiment_id, payload["slot_id"]),
        "discard_tool_from_palette": lambda: service.discard_tool_from_palette(experiment_id, payload["tool_id"]),
        "discard_sample_label_from_palette": lambda: service.discard_sample_label_from_palette(
            experiment_id, payload["sample_label_id"]
        ),
        "restore_trashed_tool_to_workbench_slot": lambda: service.restore_trashed_tool_to_workbench_slot(
            experiment_id, payload["trash_tool_id"], payload["target_slot_id"]
        ),
        "add_workspace_widget": lambda: service.add_workspace_widget(
            experiment_id,
            payload["widget_id"],
            payload["anchor"],
            payload["offset_x"],
            payload["offset_y"],
        ),
        "move_workspace_widget": lambda: service.move_workspace_widget(
            experiment_id,
            payload["widget_id"],
            payload["anchor"],
            payload["offset_x"],
            payload["offset_y"],
        ),
        "discard_workspace_widget": lambda: service.discard_workspace_widget(experiment_id, payload["widget_id"]),
        "add_liquid_to_workspace_widget": lambda: service.add_liquid_to_workspace_widget(
            experiment_id,
            payload["widget_id"],
            payload["liquid_id"],
            payload.get("volume_ml"),
        ),
        "update_workspace_widget_liquid_volume": lambda: service.update_workspace_widget_liquid_volume(
            experiment_id,
            payload["widget_id"],
            payload["liquid_entry_id"],
            payload["volume_ml"],
        ),
        "remove_liquid_from_workspace_widget": lambda: service.remove_liquid_from_workspace_widget(
            experiment_id,
            payload["widget_id"],
            payload["liquid_entry_id"],
        ),
        "start_grinder_cycle": lambda: service.start_grinder_cycle(experiment_id, payload["widget_id"]),
        "complete_grinder_cycle": lambda: service.complete_grinder_cycle(experiment_id, payload["widget_id"]),
        "advance_workspace_cryogenics": lambda: service.advance_workspace_cryogenics(
            experiment_id, payload["elapsed_ms"]
        ),
        "add_workspace_produce_lot_to_widget": lambda: service.add_workspace_produce_lot_to_widget(
            experiment_id, payload["widget_id"], payload["produce_lot_id"]
        ),
        "move_workbench_produce_lot_to_widget": lambda: service.move_workbench_produce_lot_to_widget(
            experiment_id,
            payload["widget_id"],
            payload["source_slot_id"],
            payload["produce_lot_id"],
        ),
        "restore_trashed_produce_lot_to_widget": lambda: service.restore_trashed_produce_lot_to_widget(
            experiment_id, payload["trash_produce_lot_id"], payload["widget_id"]
        ),
        "create_produce_lot": lambda: service.create_produce_lot(experiment_id, payload["produce_type"]),
        "place_received_bag_on_workbench": lambda: service.place_received_bag_on_workbench(
            experiment_id, payload["target_slot_id"]
        ),
        "discard_basket_tool": lambda: service.discard_basket_tool(experiment_id),
        "record_gross_weight": lambda: service.record_gross_weight(
            experiment_id,
            payload.get("measured_gross_mass_g"),
        ),
        "set_gross_mass_offset": lambda: service.set_gross_mass_offset(
            experiment_id,
            payload["gross_mass_offset_g"],
        ),
        "create_lims_reception": lambda: service.create_lims_reception(
            experiment_id,
            payload["orchard_name"],
            payload["harvest_date"],
            payload["indicative_mass_g"],
            payload.get("measured_gross_mass_g"),
            payload.get("measured_sample_mass_g"),
        ),
        "print_lims_label": lambda: service.print_lims_label(experiment_id),
        "discard_printed_lims_label": lambda: service.discard_printed_lims_label(experiment_id),
        "apply_printed_lims_label": lambda: service.apply_printed_lims_label(
            experiment_id, payload["slot_id"]
        ),
        "apply_printed_lims_label_to_basket_bag": lambda: service.apply_printed_lims_label_to_basket_bag(
            experiment_id
        ),
        "create_debug_produce_lot_on_workbench": lambda: service.create_debug_produce_lot_on_workbench(
            experiment_id,
            payload["preset_id"],
            payload["target_slot_id"],
            payload.get("total_mass_g"),
            payload.get("temperature_c"),
            payload.get("residual_co2_mass_g"),
        ),
        "create_debug_produce_lot_to_widget": lambda: service.create_debug_produce_lot_to_widget(
            experiment_id,
            payload["preset_id"],
            payload["widget_id"],
            payload.get("total_mass_g"),
            payload.get("temperature_c"),
            payload.get("residual_co2_mass_g"),
        ),
        "discard_workspace_produce_lot": lambda: service.discard_workspace_produce_lot(
            experiment_id, payload["produce_lot_id"]
        ),
        "move_widget_produce_lot_to_workbench_tool": lambda: service.move_widget_produce_lot_to_workbench_tool(
            experiment_id,
            payload["widget_id"],
            payload["produce_lot_id"],
            payload["target_slot_id"],
        ),
        "discard_widget_produce_lot": lambda: service.discard_widget_produce_lot(
            experiment_id, payload["widget_id"], payload["produce_lot_id"]
        ),
        "place_tool_in_rack_slot": lambda: service.place_tool_in_rack_slot(
            experiment_id, payload["rack_slot_id"], payload["tool_id"]
        ),
        "place_workbench_tool_in_rack_slot": lambda: service.place_workbench_tool_in_rack_slot(
            experiment_id, payload["source_slot_id"], payload["rack_slot_id"]
        ),
        "move_rack_tool_between_slots": lambda: service.move_rack_tool_between_slots(
            experiment_id, payload["source_rack_slot_id"], payload["target_rack_slot_id"]
        ),
        "remove_rack_tool_to_workbench_slot": lambda: service.remove_rack_tool_to_workbench_slot(
            experiment_id, payload["rack_slot_id"], payload["target_slot_id"]
        ),
        "discard_rack_tool": lambda: service.discard_rack_tool(experiment_id, payload["rack_slot_id"]),
        "restore_trashed_tool_to_rack_slot": lambda: service.restore_trashed_tool_to_rack_slot(
            experiment_id, payload["trash_tool_id"], payload["rack_slot_id"]
        ),
        "add_liquid_to_workbench_tool": lambda: service.add_liquid_to_workbench_tool(
            experiment_id, payload["slot_id"], payload["liquid_id"], payload.get("volume_ml")
        ),
        "add_produce_lot_to_workbench_tool": lambda: service.add_produce_lot_to_workbench_tool(
            experiment_id, payload["slot_id"], payload["produce_lot_id"]
        ),
        "discard_produce_lot_from_workbench_tool": lambda: service.discard_produce_lot_from_workbench_tool(
            experiment_id, payload["slot_id"], payload["produce_lot_id"]
        ),
        "cut_workbench_produce_lot": lambda: service.cut_workbench_produce_lot(
            experiment_id, payload["slot_id"], payload["produce_lot_id"]
        ),
        "move_produce_lot_between_workbench_tools": lambda: service.move_produce_lot_between_workbench_tools(
            experiment_id,
            payload["source_slot_id"],
            payload["target_slot_id"],
            payload["produce_lot_id"],
        ),
        "restore_trashed_produce_lot_to_workbench_tool": lambda: service.restore_trashed_produce_lot_to_workbench_tool(
            experiment_id, payload["trash_produce_lot_id"], payload["target_slot_id"]
        ),
        "remove_liquid_from_workbench_tool": lambda: service.remove_liquid_from_workbench_tool(
            experiment_id, payload["slot_id"], payload["liquid_entry_id"]
        ),
        "update_workbench_liquid_volume": lambda: service.update_workbench_liquid_volume(
            experiment_id, payload["slot_id"], payload["liquid_entry_id"], payload["volume_ml"]
        ),
        "apply_sample_label_to_workbench_tool": lambda: service.apply_sample_label_to_workbench_tool(
            experiment_id, payload["slot_id"]
        ),
        "update_workbench_tool_sample_label_text": lambda: service.update_workbench_tool_sample_label_text(
            experiment_id, payload["slot_id"], payload["sample_label_text"]
        ),
        "close_workbench_tool": lambda: service.close_workbench_tool(experiment_id, payload["slot_id"]),
        "move_sample_label_between_workbench_tools": lambda: service.move_sample_label_between_workbench_tools(
            experiment_id, payload["source_slot_id"], payload["target_slot_id"]
        ),
        "discard_sample_label_from_workbench_tool": lambda: service.discard_sample_label_from_workbench_tool(
            experiment_id, payload["slot_id"]
        ),
        "restore_trashed_sample_label_to_workbench_tool": lambda: service.restore_trashed_sample_label_to_workbench_tool(
            experiment_id, payload["trash_sample_label_id"], payload["target_slot_id"]
        ),
    }
    return handlers[command_type]()


def test_create_experiment_starts_with_received_bag_and_empty_workbench() -> None:
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
        "lims",
        "gross_balance",
        "workbench",
        "trash",
        "rack",
        "instrument",
        "basket",
        "grinder",
    ]
    assert experiment.workspace.widgets[0].is_present is True
    assert experiment.workspace.widgets[1].is_present is False
    assert experiment.workspace.widgets[2].is_present is True
    assert experiment.workspace.widgets[3].is_present is True
    assert experiment.workspace.widgets[4].is_present is False
    assert experiment.workspace.widgets[5].is_present is False
    assert experiment.workspace.widgets[6].is_present is True
    assert experiment.workspace.widgets[7].is_present is False
    assert experiment.workspace.widgets[3].anchor == "top-left"
    assert experiment.workspace.widgets[3].offset_x == 1276
    assert experiment.workspace.widgets[3].offset_y == 24
    assert all(widget.is_trashed is False for widget in experiment.workspace.widgets)
    assert experiment.workspace.produce_basket_lots == []
    assert experiment.basket_tool is not None
    assert experiment.basket_tool.tool_type == "sample_bag"
    assert experiment.basket_tool.is_sealed is True
    assert experiment.basket_tool.field_label_text is not None
    match = re.match(
        r"^(?P<orchard>.+) • Harvest (?P<harvest_date>\d{4}-\d{2}-\d{2}) • Approx\. (?P<mass>\d+\.\d{2}) kg$",
        experiment.basket_tool.field_label_text,
    )
    assert match is not None
    harvest_date = date.fromisoformat(match.group("harvest_date"))
    assert date.today() - timedelta(days=10) <= harvest_date <= date.today() - timedelta(days=1)
    assert len(experiment.basket_tool.produce_lots) == 1
    assert experiment.lims_reception.status == "awaiting_reception"
    assert experiment.lims_reception.lab_sample_code is None
    assert experiment.audit_log[-1] == "Receive the grower bag, weigh it, then register it in the LIMS."


def test_workbench_commands_place_tool_merge_liquid_and_edit_volume() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )
    updated = apply_command(service, 
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

    updated = apply_command(service, 
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

    updated = apply_command(service,
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


def test_reception_flow_moves_bag_registers_lims_and_applies_ticket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "place_received_bag_on_workbench",
        {"target_slot_id": "station_1"},
    )

    assert updated.basket_tool is None
    assert updated.workbench.slots[0].tool is not None
    assert updated.workbench.slots[0].tool.tool_type == "sample_bag"
    expected_gross_mass_g = round(
        updated.workbench.slots[0].tool.produce_lots[0].total_mass_g + SAMPLE_BAG_TARE_MASS_G,
        1,
    )

    updated = apply_command(service, experiment.id, "record_gross_weight", {})
    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(expected_gross_mass_g)

    updated = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Verger Saint-Martin",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
            "measured_gross_mass_g": expected_gross_mass_g,
            "measured_sample_mass_g": 10.0,
        },
    )
    assert updated.lims_reception.lab_sample_code is not None
    assert updated.lims_reception.lab_sample_code.startswith("APP-2026-")
    assert updated.lims_reception.status == "awaiting_label_application"
    assert updated.lims_reception.measured_sample_mass_g == pytest.approx(10.0)

    updated = apply_command(service, experiment.id, "print_lims_label", {})
    assert updated.lims_reception.printed_label_ticket is not None
    assert (
        updated.lims_reception.printed_label_ticket.sample_code
        == updated.lims_reception.lab_sample_code
    )
    assert updated.lims_reception.printed_label_ticket.received_date

    updated = apply_command(
        service,
        experiment.id,
        "apply_printed_lims_label",
        {"slot_id": "station_1"},
    )
    assert updated.lims_reception.printed_label_ticket is None
    assert updated.lims_reception.status == "received"
    assert updated.workbench.slots[0].tool is not None
    assert (
        updated.workbench.slots[0].tool.sample_label_text
        == updated.lims_reception.lab_sample_code
    )
    assert (
        updated.workbench.slots[0].tool.sample_label_received_date
        is not None
    )


def test_create_lims_reception_allows_manual_entry_before_gross_weight() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
        },
    )

    assert updated.lims_reception.lab_sample_code is not None
    assert updated.lims_reception.status == "awaiting_label_application"
    assert updated.lims_reception.measured_gross_mass_g is None


def test_create_lims_reception_records_precise_sample_mass() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
            "measured_sample_mass_g": 10.0,
        },
    )

    assert updated.lims_reception.measured_gross_mass_g is None
    assert updated.lims_reception.measured_sample_mass_g == pytest.approx(10.0)


def test_printed_lims_label_can_be_applied_to_basket_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
            "measured_gross_mass_g": None,
        },
    )
    updated = apply_command(service, experiment.id, "print_lims_label", {})
    updated = apply_command(service, experiment.id, "apply_printed_lims_label_to_basket_bag", {})

    assert updated.basket_tool is not None
    assert updated.basket_tool.sample_label_text == updated.lims_reception.lab_sample_code
    assert updated.basket_tool.sample_label_received_date is not None
    assert updated.lims_reception.printed_label_ticket is None
    assert updated.lims_reception.status == "received"


def test_record_gross_weight_uses_explicit_measured_mass() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "record_gross_weight",
        {"measured_gross_mass_g": 36.0},
    )

    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(36.0)


def test_set_gross_mass_offset_updates_reception_state() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "set_gross_mass_offset",
        {"gross_mass_offset_g": -35},
    )

    assert updated.lims_reception.gross_mass_offset_g == -35
    assert updated.audit_log[-1] == "Gross balance container offset set to -35 g."


def test_print_lims_label_requires_reception_entry() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Create the LIMS reception entry before printing a label."):
        apply_command(service, experiment.id, "print_lims_label", {})


def test_print_lims_label_requires_current_ticket_to_be_removed_first() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
        },
    )
    assert updated.lims_reception.lab_sample_code is not None

    updated = apply_command(service, experiment.id, "print_lims_label", {})
    assert updated.lims_reception.printed_label_ticket is not None

    with pytest.raises(
        ValueError,
        match="Remove the current printed ticket from the LIMS before printing another label.",
    ):
        apply_command(service, experiment.id, "print_lims_label", {})


def test_print_lims_label_can_reprint_after_ticket_leaves_lims() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(
        service,
        experiment.id,
        "place_received_bag_on_workbench",
        {"target_slot_id": "station_1"},
    )
    apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
        },
    )
    apply_command(service, experiment.id, "print_lims_label", {})
    updated = apply_command(
        service,
        experiment.id,
        "apply_printed_lims_label",
        {"slot_id": "station_1"},
    )
    assert updated.lims_reception.printed_label_ticket is None

    updated = apply_command(service, experiment.id, "print_lims_label", {})
    assert updated.lims_reception.printed_label_ticket is not None


def test_print_lims_label_can_reprint_after_ticket_is_discarded_from_lims() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
        },
    )
    updated = apply_command(service, experiment.id, "print_lims_label", {})
    assert updated.lims_reception.printed_label_ticket is not None


def test_discard_printed_lims_label_moves_ticket_to_trash_sample_labels() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
        },
    )
    apply_command(service, experiment.id, "print_lims_label", {})

    updated = apply_command(service, experiment.id, "discard_printed_lims_label", {})

    assert updated.lims_reception.printed_label_ticket is None
    assert len(updated.trash.sample_labels) == 1
    assert updated.trash.sample_labels[0].origin_label == "LIMS terminal"
    assert updated.trash.sample_labels[0].sample_label_text == "APP-2026-0001"


def test_print_lims_label_can_target_a_selected_existing_entry() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    first = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "Martin Orchard",
            "harvest_date": "2026-03-29",
            "indicative_mass_g": 2500.0,
        },
    )
    second = apply_command(
        service,
        experiment.id,
        "create_lims_reception",
        {
            "orchard_name": "North Orchard",
            "harvest_date": "2026-03-30",
            "indicative_mass_g": 3000.0,
        },
    )

    first_entry_id = first.lims_entries[0].id
    assert first_entry_id is not None
    assert second.lims_reception.lab_sample_code == "APP-2026-0002"

    updated = service.print_lims_label(experiment.id, first_entry_id)

    assert updated.lims_reception.lab_sample_code == "APP-2026-0001"
    assert updated.lims_reception.printed_label_ticket is not None
    assert updated.lims_reception.printed_label_ticket.sample_code == "APP-2026-0001"


def test_discard_basket_tool_moves_received_sampling_bag_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service, experiment.id, "discard_basket_tool", {})

    assert updated.basket_tool is None
    assert len(updated.trash.tools) == 1
    assert updated.trash.tools[0].origin_label == "Produce basket"
    assert updated.trash.tools[0].tool.tool_type == "sample_bag"
    assert updated.audit_log[-1] == "Sealed sampling bag discarded from Produce basket."


def test_create_produce_lot_recreates_a_sealed_received_sampling_bag_when_basket_is_empty() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, experiment.id, "discard_basket_tool", {})
    updated = apply_command(service, experiment.id, "create_produce_lot", {"produce_type": "apple"})

    assert updated.basket_tool is not None
    assert updated.basket_tool.tool_type == "sample_bag"
    assert updated.basket_tool.is_sealed is True


def test_workbench_liquid_can_be_added_with_an_explicit_dosed_volume() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )

    first_addition = apply_command(service, 
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
            "volume_ml": 7.5,
        },
    )
    updated = apply_command(service, 
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
            "volume_ml": 1.25,
        },
    )

    first_slot = next(slot for slot in first_addition.workbench.slots if slot.id == "station_1")
    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert first_slot.tool is not None
    assert slot.tool is not None
    assert first_slot.tool.liquids[0].volume_ml == 7.5
    assert slot.tool.liquids[0].volume_ml == 8.75
    assert updated.audit_log[-1] == "Acetonitrile increased to 8.75 mL in 50 mL centrifuge tube."


def test_place_sealed_sampling_bag_on_workbench() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service, 
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


def test_workbench_liquid_is_removed_when_volume_is_updated_to_zero() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )
    added = apply_command(service,
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
        },
    )

    assert added.workbench.slots[0].tool is not None
    liquid_id = added.workbench.slots[0].tool.liquids[0].id
    updated = apply_command(service,
        experiment.id,
        "update_workbench_liquid_volume",
        {
            "slot_id": "station_1",
            "liquid_entry_id": liquid_id,
            "volume_ml": 0,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.liquids == []
    assert updated.audit_log[-1] == "Acetonitrile removed from 50 mL centrifuge tube."


def test_place_cutting_board_on_workbench() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    moved = apply_command(service, 
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    updated = apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert moved.workspace.produce_basket_lots == []
    assert len(grinder.produce_lots) == 1
    assert grinder.produce_lots[0].produce_type == "apple"
    assert len(grinder.liquids) == 1
    assert grinder.liquids[0].liquid_id == "dry_ice_pellets"
    assert grinder.liquids[0].volume_ml == 1000.0
    assert updated.audit_log[-1] == "Dry ice pellets added to Cryogenic grinder."


def test_grinder_dry_ice_mass_can_be_edited() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    added = apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    liquid_id = next(widget for widget in added.workspace.widgets if widget.id == "grinder").liquids[0].id
    updated = apply_command(service, 
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


def test_grinder_dry_ice_is_removed_when_volume_is_updated_to_zero() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    added = apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    liquid_id = next(widget for widget in added.workspace.widgets if widget.id == "grinder").liquids[0].id
    updated = apply_command(service,
        experiment.id,
        "update_workspace_widget_liquid_volume",
        {
            "widget_id": "grinder",
            "liquid_entry_id": liquid_id,
            "volume_ml": 0,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert grinder.liquids == []
    assert updated.audit_log[-1] == "Dry ice pellets removed from Cryogenic grinder."


def test_grinder_dry_ice_can_be_removed() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    added = apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    liquid_id = next(widget for widget in added.workspace.widgets if widget.id == "grinder").liquids[0].id
    updated = apply_command(service, 
        experiment.id,
        "remove_liquid_from_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_entry_id": liquid_id,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert grinder.liquids == []
    assert updated.audit_log[-1] == "Dry ice pellets removed from Cryogenic grinder."


def test_grinder_dry_ice_disappears_after_sublimation_reaches_zero() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 0.01,
        },
    )

    experiment_state = service._experiments[experiment.id]
    experiment_state.last_simulation_at -= timedelta(seconds=1)

    updated = service.get_experiment(experiment.id)
    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert grinder.liquids == []


def test_complete_grinder_cycle_transforms_loaded_lot_into_ground_result() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service, 
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service, 
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 1000,
        },
    )
    updated = apply_command(service, 
        experiment.id,
        "complete_grinder_cycle",
        {
            "widget_id": "grinder",
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert grinder.produce_lots[0].cut_state == "ground"
    assert grinder.produce_lots[0].homogeneity_score is None
    assert grinder.produce_lots[0].grind_quality_label is None
    assert updated.audit_log[-1] == "Apple lot 1 ground in Cryogenic grinder."


def test_start_grinder_cycle_marks_the_grinder_as_running() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    cooled = apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )
    grinder_before = next(widget for widget in cooled.workspace.widgets if widget.id == "grinder")
    apply_command(service,
        experiment.id,
        "update_workspace_widget_liquid_volume",
        {
            "widget_id": "grinder",
            "liquid_entry_id": grinder_before.liquids[0].id,
            "volume_ml": 400,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].temperature_c = -75.0

    started = apply_command(service,
        experiment.id,
        "start_grinder_cycle",
        {
            "widget_id": "grinder",
        },
    )

    grinder = next(widget for widget in started.workspace.widgets if widget.id == "grinder")
    assert grinder.grinder_run_duration_ms == 30000.0
    assert grinder.grinder_run_remaining_ms == 30000.0
    assert started.audit_log[-1] == "Apple lot 1 grinding started in Cryogenic grinder."


def test_start_grinder_cycle_rejects_produce_above_minus_twenty_c() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].temperature_c = -15.0

    with pytest.raises(ValueError, match="not cold enough"):
        apply_command(service,
            experiment.id,
            "start_grinder_cycle",
            {
                "widget_id": "grinder",
            },
        )


def test_active_grinder_cycle_warms_the_sample_and_consumes_dry_ice_until_completion() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 400,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].temperature_c = -75.0

    apply_command(service,
        experiment.id,
        "start_grinder_cycle",
        {
            "widget_id": "grinder",
        },
    )
    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=15)
    mid_cycle = service.get_experiment(experiment.id)

    mid_grinder = next(widget for widget in mid_cycle.workspace.widgets if widget.id == "grinder")
    assert mid_grinder.produce_lots[0].temperature_c > -75.0
    assert mid_grinder.produce_lots[0].temperature_c < -69.0
    assert mid_grinder.liquids[0].volume_ml < 391.0
    assert 14999.0 < mid_grinder.grinder_run_remaining_ms <= 15000.0

    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=15)
    finished = service.get_experiment(experiment.id)

    finished_grinder = next(widget for widget in finished.workspace.widgets if widget.id == "grinder")
    assert finished_grinder.produce_lots[0].cut_state == "ground"
    assert finished_grinder.produce_lots[0].residual_co2_mass_g > 0
    assert -66.0 < finished_grinder.produce_lots[0].temperature_c < -64.0
    assert finished_grinder.produce_lots[0].grind_quality_label == "powder_fine"
    assert finished_grinder.produce_lots[0].homogeneity_score is not None
    assert finished_grinder.produce_lots[0].homogeneity_score > 0.9
    assert finished_grinder.liquids == []
    assert finished_grinder.grinder_run_duration_ms == 0.0
    assert finished_grinder.grinder_run_remaining_ms == 0.0
    assert finished.audit_log[-1] == "Apple lot 1 ground in Cryogenic grinder."


def test_active_grinder_cycle_scores_warmer_runs_as_coarser_results() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 400,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].temperature_c = -30.0

    apply_command(service,
        experiment.id,
        "start_grinder_cycle",
        {
            "widget_id": "grinder",
        },
    )
    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=30)
    finished = service.get_experiment(experiment.id)

    grinder = next(widget for widget in finished.workspace.widgets if widget.id == "grinder")
    produce_lot = grinder.produce_lots[0]
    assert produce_lot.cut_state == "ground"
    assert produce_lot.grind_quality_label == "coarse"
    assert produce_lot.homogeneity_score is not None
    assert 0.25 < produce_lot.homogeneity_score < 0.4


def test_active_grinder_cycle_jams_if_the_sample_warms_above_minus_ten_c() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 10,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].temperature_c = -20.0

    apply_command(service,
        experiment.id,
        "start_grinder_cycle",
        {
            "widget_id": "grinder",
        },
    )
    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=30)
    jammed = service.get_experiment(experiment.id)

    grinder = next(widget for widget in jammed.workspace.widgets if widget.id == "grinder")
    assert grinder.grinder_fault == "motor_jammed"
    assert grinder.grinder_run_duration_ms == 0.0
    assert grinder.grinder_run_remaining_ms == 0.0
    assert grinder.produce_lots[0].cut_state == "waste"
    assert grinder.produce_lots[0].homogeneity_score == 0.0
    assert grinder.produce_lots[0].grind_quality_label == "waste"
    assert grinder.liquids == []
    assert grinder.produce_lots[0].temperature_c >= -10.0
    assert jammed.trash.produce_lots == []
    assert jammed.audit_log[-1] == "Apple lot 1 jammed Cryogenic grinder motor and became waste."


def test_jammed_grinder_waste_can_be_moved_to_a_workbench_tool() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "cut_workbench_produce_lot",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "move_workbench_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "source_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 10,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].temperature_c = -20.0

    apply_command(service,
        experiment.id,
        "start_grinder_cycle",
        {
            "widget_id": "grinder",
        },
    )
    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=30)
    service.get_experiment(experiment.id)

    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_2",
            "tool_id": "sealed_sampling_bag",
        },
    )

    moved = apply_command(service,
        experiment.id,
        "move_widget_produce_lot_to_workbench_tool",
        {
            "widget_id": "grinder",
            "produce_lot_id": produce_lot_id,
            "target_slot_id": "station_2",
        },
    )
    station_2 = next(slot for slot in moved.workbench.slots if slot.id == "station_2")
    assert station_2.tool is not None
    assert station_2.tool.produce_lots[0].cut_state == "waste"


def test_grinder_dry_ice_can_be_added_with_an_explicit_dosed_mass() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )

    first_addition = apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 250.0,
        },
    )
    updated = apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
            "volume_ml": 125.5,
        },
    )

    first_grinder = next(widget for widget in first_addition.workspace.widgets if widget.id == "grinder")
    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert first_grinder.liquids[0].volume_ml == 250.0
    assert grinder.liquids[0].volume_ml == 375.5
    assert updated.audit_log[-1] == "Dry ice pellets increased in Cryogenic grinder."


def test_workspace_cryogenics_cools_produce_and_consumes_dry_ice() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 1000,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert 13.0 < grinder.produce_lots[0].temperature_c < 14.0
    assert 897.0 < grinder.liquids[0].volume_ml < 898.0
    assert updated.audit_log[-1] == "Dry ice pellets added to Cryogenic grinder."


def test_workspace_cryogenics_warms_produce_back_up_when_dry_ice_is_gone() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    apply_command(service, 
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )
    cooled = apply_command(service, 
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 60000,
        },
    )

    grinder = next(widget for widget in cooled.workspace.widgets if widget.id == "grinder")
    cooled_temperature = grinder.produce_lots[0].temperature_c
    rewarmed = apply_command(service, 
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 60000,
        },
    )

    grinder = next(widget for widget in rewarmed.workspace.widgets if widget.id == "grinder")
    assert grinder.produce_lots[0].temperature_c > cooled_temperature
    assert grinder.produce_lots[0].temperature_c <= 20.0


def test_workspace_cryogenics_warms_cold_produce_after_it_leaves_grinder() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service,
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    apply_command(service,
        experiment.id,
        "add_liquid_to_workspace_widget",
        {
            "widget_id": "grinder",
            "liquid_id": "dry_ice_pellets",
        },
    )
    cooled = apply_command(service,
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 60000,
        },
    )

    grinder = next(widget for widget in cooled.workspace.widgets if widget.id == "grinder")
    cooled_temperature = grinder.produce_lots[0].temperature_c
    assert cooled_temperature < 20.0

    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )
    moved = apply_command(service,
        experiment.id,
        "move_widget_produce_lot_to_workbench_tool",
        {
            "widget_id": "grinder",
            "produce_lot_id": grinder.produce_lots[0].id,
            "target_slot_id": "station_1",
        },
    )
    advanced = apply_command(service,
        experiment.id,
        "advance_workspace_cryogenics",
        {
            "elapsed_ms": 60000,
        },
    )

    moved_slot = next(slot for slot in moved.workbench.slots if slot.id == "station_1")
    advanced_slot = next(slot for slot in advanced.workbench.slots if slot.id == "station_1")
    assert moved_slot.tool is not None
    assert advanced_slot.tool is not None
    assert moved_slot.tool.produce_lots[0].temperature_c == pytest.approx(cooled_temperature, abs=0.01)
    assert advanced_slot.tool.produce_lots[0].temperature_c > moved_slot.tool.produce_lots[0].temperature_c
    assert advanced_slot.tool.produce_lots[0].temperature_c <= 20.0


def test_one_kilo_of_dry_ice_does_not_drive_apple_lot_to_dry_ice_temperature() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "add_workspace_widget",
        {
            "widget_id": "grinder",
            "anchor": "top-right",
            "offset_x": 0,
            "offset_y": 420,
        },
    )
    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    apply_command(service, 
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
        updated = apply_command(service, 
            experiment.id,
            "advance_workspace_cryogenics",
            {
                "elapsed_ms": 1000,
            },
        )
        grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
        if grinder.liquids == []:
            exhausted_temperature = grinder.produce_lots[0].temperature_c
            break

    assert exhausted_temperature is not None
    assert exhausted_temperature > -5.0
    assert exhausted_temperature < 0.0


def test_sampling_bag_label_can_be_applied_and_edited() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    labeled = apply_command(service, 
        experiment.id,
        "apply_sample_label_to_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )
    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "sealed_sampling_bag"},
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_2", "tool_id": "sealed_sampling_bag"},
    )
    apply_command(service, 
        experiment.id,
        "apply_sample_label_to_workbench_tool",
        {"slot_id": "station_1"},
    )
    apply_command(service, 
        experiment.id,
        "update_workbench_tool_sample_label_text",
        {"slot_id": "station_1", "sample_label_text": "LOT-2026-041"},
    )

    discarded = apply_command(service, 
        experiment.id,
        "discard_sample_label_from_workbench_tool",
        {"slot_id": "station_1"},
    )
    restored = apply_command(service, 
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

    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "sealed_sampling_bag"},
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_2", "tool_id": "sealed_sampling_bag"},
    )
    apply_command(service, 
        experiment.id,
        "apply_sample_label_to_workbench_tool",
        {"slot_id": "station_1"},
    )
    apply_command(service, 
        experiment.id,
        "update_workbench_tool_sample_label_text",
        {"slot_id": "station_1", "sample_label_text": "LOT-2026-041"},
    )

    moved = apply_command(service, 
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

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert len(slot.tool.produce_lots) == 1
    assert slot.tool.produce_lots[0].label == "Apple lot 1"
    assert slot.tool.produce_lots[0].unit_count == 12
    assert slot.tool.produce_lots[0].total_mass_g == 2450.0
    assert updated.workspace.produce_basket_lots == []
    assert updated.audit_log[-1] == "Apple lot 1 added to Sealed sampling bag."


def test_add_produce_lot_to_cutting_board_moves_it_out_of_basket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert len(slot.tool.produce_lots) == 1
    assert slot.tool.produce_lots[0].label == "Apple lot 1"
    assert slot.tool.produce_lots[0].is_contaminated is False
    assert updated.workspace.produce_basket_lots == []
    assert updated.audit_log[-1] == "Apple lot 1 added to Cutting board."


def test_add_produce_lot_directly_to_empty_station_marks_it_contaminated() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is None
    assert len(slot.surface_produce_lots) == 1
    assert slot.surface_produce_lots[0].label == "Apple lot 1"
    assert slot.surface_produce_lots[0].is_contaminated is True
    assert updated.workspace.produce_basket_lots == []
    assert (
        updated.audit_log[-1]
        == "Apple lot 1 placed directly on Station 1 and marked contaminated."
    )


def test_add_produce_lot_requires_a_sampling_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )

    with pytest.raises(ValueError, match="50 mL centrifuge tube does not accept produce."):
        apply_command(service, 
            experiment.id,
            "add_produce_lot_to_workbench_tool",
            {
                "slot_id": "station_1",
                "produce_lot_id": created.workspace.produce_basket_lots[0].id,
            },
        )


def test_sampling_bag_accepts_only_one_produce_lot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    first_lot = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    second_lot = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": first_lot.workspace.produce_basket_lots[0].id,
        },
    )

    with pytest.raises(ValueError, match="Sealed sampling bag already contains a produce lot."):
        apply_command(service, 
            experiment.id,
            "add_produce_lot_to_workbench_tool",
            {
                "slot_id": "station_1",
                "produce_lot_id": second_lot.workspace.produce_basket_lots[0].id,
            },
        )


def test_discard_produce_lot_from_sampling_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "discard_produce_lot_from_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.produce_lots == []
    assert updated.workspace.produce_basket_lots == []
    assert len(updated.trash.produce_lots) == 1
    assert updated.trash.produce_lots[0].origin_label == "Sealed sampling bag"
    assert updated.trash.produce_lots[0].produce_lot.label == "Apple lot 1"
    assert updated.audit_log[-1] == "Apple lot 1 discarded from Sealed sampling bag."


def test_discard_produce_lot_from_basket_moves_it_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "discard_workspace_produce_lot",
        {
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    assert updated.workspace.produce_basket_lots == []
    assert len(updated.trash.produce_lots) == 1
    assert updated.trash.produce_lots[0].origin_label == "Produce basket"
    assert updated.audit_log[-1] == "Apple lot 1 discarded from Produce basket."


def test_discard_workbench_surface_produce_lot_preserves_structured_origin() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(
        service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    placed_on_surface = apply_command(
        service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    discarded = apply_command(
        service,
        experiment.id,
        "discard_produce_lot_from_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": placed_on_surface.workbench.slots[0].surface_produce_lots[0].id,
        },
    )

    trashed_entry = discarded.trash.produce_lots[0]
    assert trashed_entry.origin_label == "Station 1"
    assert trashed_entry.origin is not None
    assert trashed_entry.origin.kind == "workbench_surface"
    assert trashed_entry.origin.location_id == "station_1"
    assert trashed_entry.origin.location_label == "Station 1"
    assert trashed_entry.origin.container_id is None


def test_move_grinder_produce_lot_to_workbench_tool() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service, 
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": produce_lot_id,
        },
    )
    service._experiments[experiment.id].workspace.widgets[-1].produce_lots[0].residual_co2_mass_g = 18.0
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "move_widget_produce_lot_to_workbench_tool",
        {
            "widget_id": "grinder",
            "target_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    station_1 = next(slot for slot in updated.workbench.slots if slot.id == "station_1")

    assert grinder.produce_lots == []
    assert station_1.tool is not None
    assert [lot.id for lot in station_1.tool.produce_lots] == [produce_lot_id]
    assert station_1.tool.produce_lots[0].residual_co2_mass_g == pytest.approx(18.0, abs=0.03)
    assert updated.audit_log[-1] == "Apple lot 1 moved from Cryogenic grinder to Sealed sampling bag."


def test_move_grinder_ground_produce_lot_to_open_storage_jar() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(
        service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(
        service,
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": produce_lot_id,
        },
    )
    experiment_state = service._experiments[experiment.id]
    experiment_state.workspace.widgets[-1].produce_lots[0].cut_state = "ground"
    experiment_state.workspace.widgets[-1].produce_lots[0].residual_co2_mass_g = 18.0
    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )

    updated = apply_command(
        service,
        experiment.id,
        "move_widget_produce_lot_to_workbench_tool",
        {
            "widget_id": "grinder",
            "target_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    station_1 = next(slot for slot in updated.workbench.slots if slot.id == "station_1")

    assert grinder.produce_lots == []
    assert station_1.tool is not None
    assert station_1.tool.tool_id == "hdpe_storage_jar_2l"
    assert [lot.id for lot in station_1.tool.produce_lots] == [produce_lot_id]
    assert station_1.tool.produce_lots[0].cut_state == "ground"
    assert station_1.tool.produce_lots[0].residual_co2_mass_g == pytest.approx(18.0, abs=0.03)
    assert updated.audit_log[-1] == "Apple lot 1 moved from Cryogenic grinder to Wide-neck HDPE jar."


def test_ground_lot_continues_degassing_after_transfer_out_of_grinder() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": produce_lot_id,
        },
    )
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    experiment_state = service._experiments[experiment.id]
    grinder = experiment_state.workspace.widgets[-1]
    grinder.produce_lots[0].cut_state = "ground"
    grinder.produce_lots[0].residual_co2_mass_g = 2.0

    apply_command(service,
        experiment.id,
        "move_widget_produce_lot_to_workbench_tool",
        {
            "widget_id": "grinder",
            "target_slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    experiment_state.last_simulation_at -= timedelta(seconds=30)
    updated = service.get_experiment(experiment.id)
    station_1 = next(slot for slot in updated.workbench.slots if slot.id == "station_1")

    assert station_1.tool is not None
    assert station_1.tool.produce_lots[0].residual_co2_mass_g < 2.0


def test_close_storage_jar_with_residual_co2_seals_it_and_traps_pressure_state() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    stored_tool = service._experiments[experiment.id].workbench.slots[0].tool
    assert stored_tool is not None
    stored_lot = stored_tool.produce_lots[0]
    stored_lot.cut_state = "ground"
    stored_lot.residual_co2_mass_g = 18.0
    stored_lot.total_mass_g = 1000.0

    updated = apply_command(service,
        experiment.id,
        "close_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.is_sealed is True
    assert slot.tool.closure_fault is None
    assert slot.tool.internal_pressure_bar == pytest.approx(1.0, abs=0.01)
    assert slot.tool.trapped_co2_mass_g == pytest.approx(0.0, abs=0.01)
    assert slot.tool.produce_lots[0].total_mass_g == pytest.approx(1000.0, abs=0.01)
    assert slot.tool.produce_lots[0].residual_co2_mass_g == pytest.approx(18.0, abs=0.01)
    assert updated.audit_log[-1] == "Wide-neck HDPE jar sealed on Station 1."


def test_sealed_storage_jar_with_residual_co2_pops_during_physics_tick() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, experiment.id, "create_produce_lot", {"produce_type": "apple"})
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "hdpe_storage_jar_2l"},
    )
    apply_command(
        service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {"slot_id": "station_1", "produce_lot_id": produce_lot_id},
    )

    stored_tool = service._experiments[experiment.id].workbench.slots[0].tool
    assert stored_tool is not None
    stored_lot = stored_tool.produce_lots[0]
    stored_lot.cut_state = "ground"
    stored_lot.residual_co2_mass_g = 18.0
    stored_lot.total_mass_g = 1000.0
    stored_lot.homogeneity_score = 0.96

    apply_command(service, experiment.id, "close_workbench_tool", {"slot_id": "station_1"})
    service._experiments[experiment.id].last_simulation_at -= timedelta(minutes=2)
    updated = service.get_experiment(experiment.id)

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.is_sealed is False
    assert slot.tool.closure_fault == "pressure_pop"
    assert slot.tool.internal_pressure_bar == pytest.approx(1.0, abs=0.01)
    assert slot.tool.trapped_co2_mass_g == pytest.approx(0.0, abs=0.01)
    assert slot.tool.produce_lots[0].total_mass_g < 1000.0
    assert slot.tool.produce_lots[0].residual_co2_mass_g < 18.0
    assert slot.tool.produce_lots[0].homogeneity_score == pytest.approx(0.25, abs=0.001)
    assert updated.audit_log[-1].startswith("Wide-neck HDPE jar popped open on Station 1 at ")


def test_close_storage_jar_after_degassing_seals_it_safely() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )
    apply_command(service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )

    stored_tool = service._experiments[experiment.id].workbench.slots[0].tool
    assert stored_tool is not None
    stored_lot = stored_tool.produce_lots[0]
    stored_lot.cut_state = "ground"
    stored_lot.residual_co2_mass_g = 0.0

    sealed = apply_command(service,
        experiment.id,
        "close_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    sealed_slot = next(slot for slot in sealed.workbench.slots if slot.id == "station_1")
    assert sealed_slot.tool is not None
    assert sealed_slot.tool.is_sealed is True
    assert sealed_slot.tool.closure_fault is None
    assert sealed.audit_log[-1] == "Wide-neck HDPE jar sealed on Station 1."


def test_add_liquid_to_sealed_centrifuge_tube_fails() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )
    apply_command(
        service,
        experiment.id,
        "close_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    with pytest.raises(ValueError, match="Open 50 mL centrifuge tube before adding liquids."):
        apply_command(
            service,
            experiment.id,
            "add_liquid_to_workbench_tool",
            {
                "slot_id": "station_1",
                "liquid_id": "acetonitrile_extraction",
            },
        )


def test_add_produce_to_sealed_storage_jar_fails() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(
        service,
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )
    apply_command(
        service,
        experiment.id,
        "close_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    with pytest.raises(ValueError, match="Open Wide-neck HDPE jar before adding produce."):
        apply_command(
            service,
            experiment.id,
            "add_produce_lot_to_workbench_tool",
            {
                "slot_id": "station_1",
                "produce_lot_id": created.workspace.produce_basket_lots[0].id,
            },
        )


def test_create_debug_powder_preset_on_workbench() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )

    updated = apply_command(service,
        experiment.id,
        "create_debug_produce_lot_on_workbench",
        {
            "preset_id": "apple_powder_residual_co2",
            "total_mass_g": 2450.0,
            "residual_co2_mass_g": 24.0,
            "temperature_c": -70.0,
            "target_slot_id": "station_1",
        },
    )

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.produce_lots[0].cut_state == "ground"
    assert slot.tool.produce_lots[0].total_mass_g == pytest.approx(2450.0, abs=0.01)
    assert slot.tool.produce_lots[0].residual_co2_mass_g == pytest.approx(24.0, abs=0.01)
    assert slot.tool.produce_lots[0].temperature_c == pytest.approx(-70.0, abs=0.01)
    assert updated.audit_log[-1] == "Debug preset Apple powder lot spawned on Wide-neck HDPE jar."


def test_create_debug_powder_preset_in_grinder() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service,
        experiment.id,
        "create_debug_produce_lot_to_widget",
        {
            "preset_id": "apple_powder_residual_co2",
            "widget_id": "grinder",
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert grinder.produce_lots[0].cut_state == "ground"
    assert grinder.produce_lots[0].total_mass_g == pytest.approx(2450.0, abs=0.01)
    assert grinder.produce_lots[0].residual_co2_mass_g == pytest.approx(18.0, abs=0.01)
    assert grinder.produce_lots[0].temperature_c == pytest.approx(-62.0, abs=0.01)
    assert updated.audit_log[-1] == "Debug preset Apple powder lot spawned in Cryogenic grinder."


def test_create_debug_powder_preset_on_gross_balance() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(
        service,
        experiment.id,
        "create_debug_produce_lot_to_widget",
        {
            "preset_id": "apple_powder_residual_co2",
            "widget_id": "gross_balance",
        },
    )

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.produce_lots[0].cut_state == "ground"
    assert gross_balance.produce_lots[0].total_mass_g == pytest.approx(2450.0, abs=0.01)
    assert gross_balance.produce_lots[0].residual_co2_mass_g == pytest.approx(18.0, abs=0.01)
    assert gross_balance.produce_lots[0].temperature_c == pytest.approx(-62.0, abs=0.01)
    assert updated.audit_log[-1] == "Debug preset Apple powder lot spawned in Gross balance."


def test_move_basket_tool_to_gross_balance_updates_measured_mass() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()
    assert experiment.basket_tool is not None
    expected_mass_g = round(
        experiment.basket_tool.produce_lots[0].total_mass_g + SAMPLE_BAG_TARE_MASS_G,
        1,
    )

    updated = service.move_basket_tool_to_gross_balance(experiment.id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert gross_balance.tool.tool_type == "sample_bag"
    assert updated.basket_tool is None
    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(expected_mass_g, abs=0.01)
    assert updated.audit_log[-1] == "Sealed sampling bag placed on Gross balance."


def test_place_tool_on_gross_balance_estimates_mass_for_empty_vial() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = service.place_tool_on_gross_balance(experiment.id, "sample_vial_lcms")

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert gross_balance.tool.tool_type == "sample_vial"
    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(1.5, abs=0.01)
    assert updated.audit_log[-1] == "Autosampler vial placed on Gross balance."


def test_move_gross_balance_tool_to_rack_rejects_non_vials() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_gross_balance(experiment.id, "beaker_rinse")

    with pytest.raises(ValueError, match="does not fit in the rack"):
        service.move_gross_balance_tool_to_rack(experiment.id, "rack_slot_1")


def test_apply_printed_lims_label_to_gross_balance_bag_consumes_ticket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.move_basket_tool_to_gross_balance(experiment.id)
    created = service.create_lims_reception(
        experiment.id,
        orchard_name="Martin Orchard",
        harvest_date="2026-03-29",
        indicative_mass_g=2500,
        measured_gross_mass_g=None,
        measured_sample_mass_g=None,
    )
    service.print_lims_label(experiment.id, created.lims_reception.id)

    updated = service.apply_printed_lims_label_to_gross_balance_bag(experiment.id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert len(gross_balance.tool.labels) == 1
    assert gross_balance.tool.labels[0].label_kind == "lims"
    assert gross_balance.tool.labels[0].sample_code == updated.lims_entries[0].lab_sample_code
    assert updated.lims_reception.printed_label_ticket is None
    assert updated.lims_entries[0].status == "received"
    assert updated.audit_log[-1] == f"LIMS label {updated.lims_entries[0].lab_sample_code} applied to Sealed sampling bag."


def test_discard_gross_balance_loose_produce_lot_moves_it_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_debug_produce_lot_to_widget(
        experiment.id,
        "apple_powder_residual_co2",
        "gross_balance",
        total_mass_g=10.0,
    )
    produce_lot_id = next(widget for widget in created.workspace.widgets if widget.id == "gross_balance").produce_lots[0].id

    updated = service.discard_gross_balance_produce_lot(experiment.id, produce_lot_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.produce_lots == []
    assert updated.trash.produce_lots[0].produce_lot.id == produce_lot_id
    assert updated.trash.produce_lots[0].origin_label == "Gross balance"
    assert updated.lims_reception.measured_gross_mass_g is None
    assert updated.audit_log[-1] == "Apple powder lot discarded from Gross balance."


def test_discard_gross_balance_tool_produce_lot_preserves_structured_origin() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    service.place_tool_on_gross_balance(experiment.id, "hdpe_storage_jar_2l")
    service.open_gross_balance_tool(experiment.id)
    service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)

    updated = service.discard_gross_balance_produce_lot(experiment.id, produce_lot_id)

    trashed_entry = updated.trash.produce_lots[0]
    assert trashed_entry.origin_label == "Gross balance"
    assert trashed_entry.origin is not None
    assert trashed_entry.origin.kind == "gross_balance_tool"
    assert trashed_entry.origin.location_id == "gross_balance"
    assert trashed_entry.origin.container_label == "Wide-neck HDPE jar"


def test_restore_trashed_produce_lot_to_gross_balance_updates_mass() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_debug_produce_lot_to_widget(
        experiment.id,
        "apple_powder_residual_co2",
        "gross_balance",
        total_mass_g=12.3,
    )
    produce_lot_id = next(widget for widget in created.workspace.widgets if widget.id == "gross_balance").produce_lots[0].id
    discarded = service.discard_gross_balance_produce_lot(experiment.id, produce_lot_id)
    trash_produce_lot_id = discarded.trash.produce_lots[0].id

    updated = service.restore_trashed_produce_lot_to_gross_balance(experiment.id, trash_produce_lot_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.produce_lots[0].id == produce_lot_id
    assert updated.trash.produce_lots == []
    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(12.3, abs=0.01)
    assert updated.audit_log[-1] == "Apple powder lot moved from Gross balance to Gross balance."


def test_move_workbench_tool_to_gross_balance_moves_tool_and_clears_source_slot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_workbench(experiment.id, "station_1", "centrifuge_tube_50ml")

    updated = service.move_workbench_tool_to_gross_balance(experiment.id, "station_1")

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert gross_balance.tool.tool_type == "centrifuge_tube"
    assert updated.workbench.slots[0].tool is None
    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(12.0, abs=0.01)
    assert updated.audit_log[-1] == "50 mL centrifuge tube placed on Gross balance."


def test_move_workbench_tool_to_gross_balance_requires_tool_in_source_slot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Station 1 does not contain a tool"):
        service.move_workbench_tool_to_gross_balance(experiment.id, "station_1")


def test_move_rack_tool_to_gross_balance_moves_tool_and_clears_rack_slot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_in_rack_slot(experiment.id, "rack_slot_1", "sample_vial_lcms")

    updated = service.move_rack_tool_to_gross_balance(experiment.id, "rack_slot_1")

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert gross_balance.tool.tool_type == "sample_vial"
    assert updated.rack.slots[0].tool is None
    assert updated.audit_log[-1] == "Autosampler vial placed on Gross balance."


def test_restore_trashed_tool_to_gross_balance_restores_tool_and_clears_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.discard_tool_from_palette(experiment.id, "sample_vial_lcms")
    trash_tool_id = service.get_experiment(experiment.id).trash.tools[0].id

    updated = service.restore_trashed_tool_to_gross_balance(experiment.id, trash_tool_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert gross_balance.tool.tool_type == "sample_vial"
    assert updated.trash.tools == []
    assert updated.audit_log[-1] == "Autosampler vial restored onto Gross balance."


def test_move_gross_balance_tool_to_workbench_moves_tool_to_empty_slot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_gross_balance(experiment.id, "sample_vial_lcms")

    updated = service.move_gross_balance_tool_to_workbench(experiment.id, "station_1")

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is None
    assert updated.workbench.slots[0].tool is not None
    assert updated.workbench.slots[0].tool.tool_type == "sample_vial"
    assert updated.lims_reception.measured_gross_mass_g is None
    assert updated.audit_log[-1] == "Autosampler vial moved from Gross balance to Station 1."


def test_move_gross_balance_tool_to_workbench_rejects_occupied_slot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_workbench(experiment.id, "station_1", "sample_vial_lcms")
    service.place_tool_on_gross_balance(experiment.id, "centrifuge_tube_50ml")

    with pytest.raises(ValueError, match="Station 1 already contains a tool"):
        service.move_gross_balance_tool_to_workbench(experiment.id, "station_1")


def test_move_gross_balance_tool_to_rack_moves_vial_and_clears_balance() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_gross_balance(experiment.id, "sample_vial_lcms")

    updated = service.move_gross_balance_tool_to_rack(experiment.id, "rack_slot_1")

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is None
    assert updated.rack.slots[0].tool is not None
    assert updated.rack.slots[0].tool.tool_type == "sample_vial"
    assert updated.audit_log[-1] == "Autosampler vial moved from Gross balance to Position 1."


def test_discard_gross_balance_tool_moves_tool_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_gross_balance(experiment.id, "sample_vial_lcms")

    updated = service.discard_gross_balance_tool(experiment.id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is None
    assert updated.trash.tools[0].tool.tool_type == "sample_vial"
    assert updated.trash.tools[0].origin_label == "Gross balance"
    assert updated.audit_log[-1] == "Autosampler vial discarded from Gross balance."


def test_open_gross_balance_tool_rejects_non_sealable_tool() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_gross_balance(experiment.id, "beaker_rinse")

    with pytest.raises(ValueError, match="Bench beaker does not support sealing"):
        service.open_gross_balance_tool(experiment.id)


def test_close_and_open_gross_balance_tool_toggle_seal_state() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    service.place_tool_on_gross_balance(experiment.id, "sample_vial_lcms")
    closed = service.close_gross_balance_tool(experiment.id)
    reopened = service.open_gross_balance_tool(experiment.id)

    gross_balance_closed = next(widget for widget in closed.workspace.widgets if widget.id == "gross_balance")
    gross_balance_open = next(widget for widget in reopened.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance_closed.tool is not None
    assert gross_balance_closed.tool.is_sealed is True
    assert gross_balance_open.tool is not None
    assert gross_balance_open.tool.is_sealed is False
    assert reopened.audit_log[-1] == "Autosampler vial opened on Gross balance."


def test_move_workspace_produce_lot_to_gross_balance_places_loose_produce_and_updates_mass() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id

    updated = service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert updated.workspace.produce_basket_lots == []
    assert gross_balance.produce_lots[0].id == produce_lot_id
    assert updated.lims_reception.measured_gross_mass_g == pytest.approx(2450.0, abs=0.01)
    assert updated.audit_log[-1] == "Apple lot 1 moved from Produce basket to Gross balance."


def test_move_workspace_produce_lot_to_gross_balance_rejects_existing_loose_produce() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    first = service.create_produce_lot(experiment.id, "apple")
    first_id = first.workspace.produce_basket_lots[0].id
    service.move_workspace_produce_lot_to_gross_balance(experiment.id, first_id)
    second = service.create_produce_lot(experiment.id, "apple")
    second_id = second.workspace.produce_basket_lots[0].id

    with pytest.raises(ValueError, match="Gross balance already contains a produce lot"):
        service.move_workspace_produce_lot_to_gross_balance(experiment.id, second_id)


def test_move_workspace_produce_lot_to_gross_balance_rejects_sealed_balance_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    service.move_basket_tool_to_gross_balance(experiment.id)

    with pytest.raises(ValueError, match="Open Sealed sampling bag before adding produce"):
        service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)


def test_move_workspace_produce_lot_to_gross_balance_rejects_tool_without_produce_capacity() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    service.place_tool_on_gross_balance(experiment.id, "sample_vial_lcms")

    with pytest.raises(ValueError, match="Autosampler vial does not accept produce"):
        service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)


def test_move_workspace_produce_lot_to_gross_balance_places_produce_into_open_balance_jar() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    service.place_tool_on_gross_balance(experiment.id, "hdpe_storage_jar_2l")
    service.open_gross_balance_tool(experiment.id)

    updated = service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.tool is not None
    assert gross_balance.tool.produce_lots[0].id == produce_lot_id
    assert updated.audit_log[-1] == "Apple lot 1 moved from Produce basket to Wide-neck HDPE jar."


def test_move_gross_balance_produce_lot_to_workbench_moves_loose_produce_to_target_slot() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)
    service.place_tool_on_workbench(experiment.id, "station_1", "cutting_board_hdpe")

    updated = service.move_gross_balance_produce_lot_to_workbench(experiment.id, "station_1", produce_lot_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    assert gross_balance.produce_lots == []
    assert updated.workbench.slots[0].tool is not None
    assert updated.workbench.slots[0].tool.produce_lots[0].id == produce_lot_id
    assert updated.audit_log[-1] == "Apple lot 1 moved from Gross balance to Cutting board."


def test_move_gross_balance_produce_lot_to_widget_moves_loose_produce_into_grinder() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = service.create_produce_lot(experiment.id, "apple")
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    service.move_workspace_produce_lot_to_gross_balance(experiment.id, produce_lot_id)

    updated = service.move_gross_balance_produce_lot_to_widget(experiment.id, "grinder", produce_lot_id)

    gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
    assert gross_balance.produce_lots == []
    assert grinder.produce_lots[0].id == produce_lot_id
    assert updated.audit_log[-1] == "Apple lot 1 moved from Gross balance to Cryogenic grinder."


def test_discard_gross_balance_tool_requires_tool() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Gross balance does not contain a tool"):
        service.discard_gross_balance_tool(experiment.id)


def test_open_workbench_tool_unseals_a_jar() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )
    apply_command(
        service,
        experiment.id,
        "close_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    updated = service.open_workbench_tool(experiment.id, "station_1")

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.is_sealed is False
    assert slot.tool.closure_fault is None
    assert updated.audit_log[-1] == "Wide-neck HDPE jar opened on Station 1."


def test_opening_pressurized_storage_jar_vents_and_loses_some_powder() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, experiment.id, "create_produce_lot", {"produce_type": "apple"})
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "hdpe_storage_jar_2l"},
    )
    apply_command(
        service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {"slot_id": "station_1", "produce_lot_id": produce_lot_id},
    )

    stored_tool = service._experiments[experiment.id].workbench.slots[0].tool
    assert stored_tool is not None
    stored_lot = stored_tool.produce_lots[0]
    stored_lot.cut_state = "ground"
    stored_lot.residual_co2_mass_g = 18.0
    stored_lot.total_mass_g = 1000.0
    stored_lot.homogeneity_score = 0.96

    apply_command(service, experiment.id, "close_workbench_tool", {"slot_id": "station_1"})
    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=10)
    service.get_experiment(experiment.id)
    updated = service.open_workbench_tool(experiment.id, "station_1")

    slot = next(slot for slot in updated.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.is_sealed is False
    assert slot.tool.closure_fault is None
    assert slot.tool.internal_pressure_bar == pytest.approx(1.0, abs=0.01)
    assert slot.tool.trapped_co2_mass_g == pytest.approx(0.0, abs=0.01)
    assert slot.tool.produce_lots[0].total_mass_g < 1000.0
    assert slot.tool.produce_lots[0].homogeneity_score == pytest.approx(0.55, abs=0.001)
    assert updated.audit_log[-1].startswith("Wide-neck HDPE jar vented at ")


def test_pressure_events_never_improve_existing_homogeneity_score() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, experiment.id, "create_produce_lot", {"produce_type": "apple"})
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(
        service,
        experiment.id,
        "place_tool_on_workbench",
        {"slot_id": "station_1", "tool_id": "hdpe_storage_jar_2l"},
    )
    apply_command(
        service,
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {"slot_id": "station_1", "produce_lot_id": produce_lot_id},
    )

    stored_tool = service._experiments[experiment.id].workbench.slots[0].tool
    assert stored_tool is not None
    stored_lot = stored_tool.produce_lots[0]
    stored_lot.cut_state = "ground"
    stored_lot.residual_co2_mass_g = 18.0
    stored_lot.total_mass_g = 1000.0
    stored_lot.homogeneity_score = 0.18

    apply_command(service, experiment.id, "close_workbench_tool", {"slot_id": "station_1"})
    service._experiments[experiment.id].last_simulation_at -= timedelta(seconds=10)
    service.get_experiment(experiment.id)
    vented = service.open_workbench_tool(experiment.id, "station_1")

    slot = next(slot for slot in vented.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.produce_lots[0].homogeneity_score == pytest.approx(0.18, abs=0.001)


def test_service_can_reload_experiment_state_from_sqlite_snapshot(tmp_path) -> None:
    repository = SqliteExperimentRepository(str(tmp_path / "experiments.sqlite3"))
    first_service = ExperimentService(repository=repository)
    fixed_now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    first_service._now_fn = lambda: fixed_now

    experiment = first_service.create_experiment()
    updated = apply_command(
        first_service,
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "hdpe_storage_jar_2l",
        },
    )

    second_service = ExperimentService(repository=repository)
    second_service._now_fn = lambda: fixed_now
    reloaded = second_service.get_experiment(experiment.id)

    slot = next(slot for slot in reloaded.workbench.slots if slot.id == "station_1")
    assert slot.tool is not None
    assert slot.tool.tool_id == "hdpe_storage_jar_2l"
    assert reloaded.id == updated.id
    assert reloaded.snapshot_version == updated.snapshot_version


def test_service_recovers_if_sqlite_file_is_deleted_while_running(tmp_path) -> None:
    db_path = tmp_path / "experiments.sqlite3"
    service = ExperimentService(repository=SqliteExperimentRepository(str(db_path)))

    created_before_deletion = service.create_experiment()
    assert db_path.exists()

    Path(db_path).unlink()

    created_after_deletion = service.create_experiment()
    listed = service.list_experiments()

    assert db_path.exists()
    assert created_before_deletion.id != created_after_deletion.id
    assert [entry.id for entry in listed] == [created_after_deletion.id]


def test_discard_grinder_produce_lot_moves_it_to_trash() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service, 
        experiment.id,
        "add_workspace_produce_lot_to_widget",
        {
            "widget_id": "grinder",
            "produce_lot_id": produce_lot_id,
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "discard_widget_produce_lot",
        {
            "widget_id": "grinder",
            "produce_lot_id": produce_lot_id,
        },
    )

    grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")

    assert grinder.produce_lots == []
    assert len(updated.trash.produce_lots) == 1
    assert updated.trash.produce_lots[0].origin_label == "Cryogenic grinder"
    assert updated.audit_log[-1] == "Apple lot 1 discarded from Cryogenic grinder."


def test_restore_trashed_produce_lot_to_sampling_bag() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    discarded = apply_command(service, 
        experiment.id,
        "discard_workspace_produce_lot",
        {
            "produce_lot_id": created.workspace.produce_basket_lots[0].id,
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sealed_sampling_bag",
        },
    )

    updated = apply_command(service, 
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

    updated = apply_command(service, 
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

    updated = apply_command(service, 
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

    added = apply_command(service, 
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

    removed = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    with pytest.raises(ValueError, match="Station 1 must be empty before it can be removed."):
        apply_command(service, 
            experiment.id,
            "remove_workbench_slot",
            {
                "slot_id": "station_1",
            },
        )


def test_remove_liquid_from_workbench_tool_updates_tool_contents() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )
    updated = apply_command(service, 
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
        },
    )

    assert updated.workbench.slots[0].tool is not None
    liquid_id = updated.workbench.slots[0].tool.liquids[0].id
    updated = apply_command(service, 
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
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = apply_command(service, 
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

    added = apply_command(service, 
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

    moved = apply_command(service, 
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

    discarded = apply_command(service, 
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
        apply_command(service, 
            experiment.id,
            "discard_workspace_widget",
            {
                "widget_id": "basket",
            },
        )


def test_create_produce_lot_adds_apple_lot_to_basket() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )

    assert len(updated.workspace.produce_basket_lots) == 1
    assert updated.workspace.produce_basket_lots[0].produce_type == "apple"
    assert updated.workspace.produce_basket_lots[0].label == "Apple lot 1"
    assert updated.workspace.produce_basket_lots[0].unit_count == 12
    assert updated.workspace.produce_basket_lots[0].total_mass_g == 2450.0
    assert updated.workspace.produce_basket_lots[0].cut_state == "whole"
    assert updated.audit_log[-1] == "Apple lot 1 created in Produce basket."


def test_cut_workbench_produce_lot_on_cutting_board_marks_lot_as_cut() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "cutting_board_hdpe",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    updated = apply_command(service, 
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

    created = apply_command(service, 
        experiment.id,
        "create_produce_lot",
        {
            "produce_type": "apple",
        },
    )
    produce_lot_id = created.workspace.produce_basket_lots[0].id
    apply_command(service, 
        experiment.id,
        "add_produce_lot_to_workbench_tool",
        {
            "slot_id": "station_1",
            "produce_lot_id": produce_lot_id,
        },
    )

    updated = apply_command(service, 
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
        apply_command(service, 
            experiment.id,
            "create_produce_lot",
            {
                "produce_type": "pear",
            },
        )


def test_place_tool_in_rack_slot_creates_a_vial_directly_from_the_palette() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
        },
    )
    discarded = apply_command(service, 
        experiment.id,
        "discard_workbench_tool",
        {
            "slot_id": "station_1",
        },
    )

    restored = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )

    updated = apply_command(service, 
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


def test_move_rack_tool_between_slots_moves_vial_within_rack() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )

    updated = apply_command(service, 
        experiment.id,
        "move_rack_tool_between_slots",
        {
            "source_rack_slot_id": "rack_slot_1",
            "target_rack_slot_id": "rack_slot_2",
        },
    )

    assert updated.rack.slots[0].tool is None
    assert updated.rack.slots[1].tool is not None
    assert updated.rack.slots[1].tool.label == "Autosampler vial"
    assert updated.audit_log[-1] == "Autosampler vial moved from Position 1 to Position 2."


def test_discard_rack_tool_removes_it_from_rack() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )

    updated = apply_command(service, 
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

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )
    discarded = apply_command(service, 
        experiment.id,
        "discard_rack_tool",
        {
            "rack_slot_id": "rack_slot_1",
        },
    )

    restored = apply_command(service, 
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
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )

    updated = apply_command(service, 
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
        apply_command(service, "missing", "place_tool_on_workbench", {})


def test_add_liquid_requires_a_placed_tool() -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    with pytest.raises(ValueError, match="Place a tool on Station 1 before adding liquids."):
        apply_command(service, 
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
        apply_command(service, 
            experiment.id,
            "remove_liquid_from_workbench_tool",
            {
                "slot_id": "station_1",
                "liquid_entry_id": "bench_liquid_missing",
            },
        )

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )

    with pytest.raises(ValueError, match="Unknown workbench liquid"):
        apply_command(service, 
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
        apply_command(service, 
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
        apply_command(service, 
            experiment.id,
            "place_workbench_tool_in_rack_slot",
            {
                "source_slot_id": "station_1",
                "rack_slot_id": "rack_slot_1",
            },
        )

    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "beaker_rinse",
        },
    )
    with pytest.raises(ValueError, match="Only autosampler vials can be placed in the rack."):
        apply_command(service, 
            experiment.id,
            "place_workbench_tool_in_rack_slot",
            {
                "source_slot_id": "station_1",
                "rack_slot_id": "rack_slot_1",
            },
        )

    service = ExperimentService()
    experiment = service.create_experiment()
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_workbench_tool_in_rack_slot",
        {
            "source_slot_id": "station_1",
            "rack_slot_id": "rack_slot_1",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_2",
            "tool_id": "sample_vial_lcms",
        },
    )

    with pytest.raises(ValueError, match="Position 1 already contains a vial"):
        apply_command(service, 
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
        apply_command(service, 
            experiment.id,
            "remove_rack_tool_to_workbench_slot",
            {
                "rack_slot_id": "rack_slot_2",
                "target_slot_id": "station_1",
            },
        )

    service = ExperimentService()
    experiment = service.create_experiment()
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "sample_vial_lcms",
        },
    )
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_2",
            "tool_id": "beaker_rinse",
        },
    )

    with pytest.raises(ValueError, match="Station 2 already contains a tool"):
        apply_command(service, 
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
    apply_command(service, 
        experiment.id,
        "place_tool_on_workbench",
        {
            "slot_id": "station_1",
            "tool_id": "centrifuge_tube_50ml",
        },
    )
    updated = apply_command(service, 
        experiment.id,
        "add_liquid_to_workbench_tool",
        {
            "slot_id": "station_1",
            "liquid_id": "acetonitrile_extraction",
        },
    )

    assert updated.workbench.slots[0].tool is not None
    liquid_id = updated.workbench.slots[0].tool.liquids[0].id
    updated = apply_command(service, 
        experiment.id,
        "update_workbench_liquid_volume",
        {
            "slot_id": "station_1",
            "liquid_entry_id": liquid_id,
            "volume_ml": 22.799999999999,
        },
    )

    assert updated.audit_log[-1] == "Acetonitrile adjusted to 22.8 mL in 50 mL centrifuge tube."
