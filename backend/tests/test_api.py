from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
import pytest

from app.api.experiments import experiment_service
from app.core.config import Settings, settings
from app.main import app


def _create_experiment(client: TestClient) -> str:
    created = client.post("/experiments")
    assert created.status_code == 200
    return created.json()["id"]


def test_settings_defaults_are_exposed() -> None:
    configured = Settings()

    assert configured.app_name == "Betalab Simulation API"
    assert configured.app_version == "0.1.0"
    assert settings.app_name == configured.app_name


def test_healthcheck_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_fetch_experiment_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)
        fetched = client.get(f"/experiments/{experiment_id}")

    assert fetched.status_code == 200
    assert fetched.json()["id"] == experiment_id
    assert "last_simulation_at" in fetched.json()
    assert fetched.json()["snapshot_version"] >= 1
    assert fetched.json()["workbench"]["slots"][0]["tool"] is None
    assert fetched.json()["rack"]["slots"][0]["tool"] is None
    assert fetched.json()["trash"]["tools"] == []
    assert fetched.json()["workspace"]["widgets"][0]["id"] == "workbench"


def test_get_experiment_returns_404_for_unknown_id() -> None:
    with TestClient(app) as client:
        response = client.get("/experiments/missing")

    assert response.status_code == 404
    assert response.json() == {"detail": "Experiment not found"}


def test_workbench_routes_round_trip_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        added_slot = client.post(f"/experiments/{experiment_id}/workbench/slots")
        placed = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "centrifuge_tube_50ml"},
        )
        tool_id = placed.json()["workbench"]["slots"][0]["tool"]["id"]
        added_liquid = client.post(
            f"/experiments/{experiment_id}/workbench/tools/{tool_id}/liquids",
            json={"liquid_id": "acetonitrile_extraction", "volume_ml": 7.5},
        )
        liquid_id = added_liquid.json()["workbench"]["slots"][0]["tool"]["liquids"][0]["id"]
        updated_liquid = client.patch(
            f"/experiments/{experiment_id}/workbench/tools/{tool_id}/liquids/{liquid_id}",
            json={"volume_ml": 8.5},
        )
        moved = client.post(
            f"/experiments/{experiment_id}/workbench/tools/{tool_id}/move-to-slot",
            json={"target_slot_id": "station_2"},
        )
        removed_liquid = client.delete(
            f"/experiments/{experiment_id}/workbench/tools/{tool_id}/liquids/{liquid_id}"
        )
        removed_slot = client.delete(f"/experiments/{experiment_id}/workbench/slots/station_3")

    assert added_slot.status_code == 200
    assert [slot["id"] for slot in added_slot.json()["workbench"]["slots"]] == [
        "station_1",
        "station_2",
        "station_3",
    ]
    assert added_liquid.status_code == 200
    assert added_liquid.json()["workbench"]["slots"][0]["tool"]["liquids"][0]["volume_ml"] == 7.5
    assert updated_liquid.status_code == 200
    assert updated_liquid.json()["workbench"]["slots"][0]["tool"]["liquids"][0]["volume_ml"] == 8.5
    assert moved.status_code == 200
    assert moved.json()["workbench"]["slots"][1]["tool"]["id"] == tool_id
    assert removed_liquid.status_code == 200
    assert removed_liquid.json()["workbench"]["slots"][1]["tool"]["liquids"] == []
    assert removed_slot.status_code == 200
    assert [slot["id"] for slot in removed_slot.json()["workbench"]["slots"]] == [
        "station_1",
        "station_2",
    ]


def test_workbench_close_route_projects_powder_when_co2_is_still_present() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        created = client.post(
            f"/experiments/{experiment_id}/workspace/produce-lots",
            json={"produce_type": "apple"},
        )
        produce_lot_id = created.json()["workspace"]["produce_lots"][0]["id"]
        placed = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "hdpe_storage_jar_2l"},
        )
        tool_id = placed.json()["workbench"]["slots"][0]["tool"]["id"]
        client.post(
            f"/experiments/{experiment_id}/workbench/tools/{tool_id}/add-produce-lot",
            json={"produce_lot_id": produce_lot_id},
        )

        experiment_state = experiment_service._experiments[experiment_id]
        stored_lot = experiment_state.workbench.slots[0].tool.produce_lots[0]
        stored_lot.cut_state = "ground"
        stored_lot.total_mass_g = 1000.0
        stored_lot.residual_co2_mass_g = 18.0

        closed = client.post(f"/experiments/{experiment_id}/workbench/tools/{tool_id}/close")

    assert closed.status_code == 200
    tool = closed.json()["workbench"]["slots"][0]["tool"]
    assert tool["is_sealed"] is False
    assert tool["closure_fault"] == "pressure_pop"
    assert tool["produce_lots"][0]["total_mass_g"] == 800.0
    assert tool["produce_lots"][0]["residual_co2_mass_g"] == pytest.approx(14.4, abs=0.05)


def test_debug_produce_preset_route_spawns_powder_on_workbench() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)
        placed = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "hdpe_storage_jar_2l"},
        )
        assert placed.status_code == 200

        spawned = client.post(
            f"/experiments/{experiment_id}/debug/produce-presets/apple_powder_residual_co2/spawn-on-workbench",
            json={"target_slot_id": "station_1"},
        )

    assert spawned.status_code == 200
    tool = spawned.json()["workbench"]["slots"][0]["tool"]
    assert tool["produce_lots"][0]["cut_state"] == "ground"
    assert tool["produce_lots"][0]["residual_co2_mass_g"] == 18.0
    assert tool["produce_lots"][0]["temperature_c"] == -62.0


def test_workbench_sample_label_routes_round_trip_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        first_bag = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "sealed_sampling_bag"},
        )
        second_bag = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_2/place-tool",
            json={"tool_id": "sealed_sampling_bag"},
        )
        first_tool_id = first_bag.json()["workbench"]["slots"][0]["tool"]["id"]
        second_tool_id = second_bag.json()["workbench"]["slots"][1]["tool"]["id"]
        labeled = client.post(f"/experiments/{experiment_id}/workbench/tools/{first_tool_id}/sample-label")
        updated = client.patch(
            f"/experiments/{experiment_id}/workbench/tools/{first_tool_id}/sample-label",
            json={"sample_label_text": "LOT-2026-041"},
        )
        moved = client.post(
            f"/experiments/{experiment_id}/workbench/tools/{first_tool_id}/sample-label/move-to-tool",
            json={"target_tool_id": second_tool_id},
        )
        discarded = client.delete(f"/experiments/{experiment_id}/workbench/tools/{second_tool_id}/sample-label")
        trash_entry_id = discarded.json()["trash"]["sample_labels"][0]["id"]
        restored = client.post(
            f"/experiments/{experiment_id}/trash/sample-labels/{trash_entry_id}/restore-to-workbench-tool",
            json={"target_tool_id": first_tool_id},
        )

    assert labeled.status_code == 200
    assert updated.status_code == 200
    assert updated.json()["workbench"]["slots"][0]["tool"]["sample_label_text"] == "LOT-2026-041"
    assert moved.status_code == 200
    assert moved.json()["workbench"]["slots"][1]["tool"]["sample_label_text"] == "LOT-2026-041"
    assert discarded.status_code == 200
    assert discarded.json()["trash"]["sample_labels"][0]["sample_label_text"] == "LOT-2026-041"
    assert restored.status_code == 200
    assert restored.json()["workbench"]["slots"][0]["tool"]["sample_label_text"] == "LOT-2026-041"


def test_palette_and_rack_routes_round_trip_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        discarded_from_palette = client.post(
            f"/experiments/{experiment_id}/palette/tools/discard",
            json={"tool_id": "sealed_sampling_bag"},
        )
        discarded_label = client.post(f"/experiments/{experiment_id}/palette/sample-labels/discard")
        placed_on_bench = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "sample_vial_lcms"},
        )
        tool_id = placed_on_bench.json()["workbench"]["slots"][0]["tool"]["id"]
        placed_in_rack = client.post(
            f"/experiments/{experiment_id}/rack/slots/rack_slot_1/place-tool-from-workbench",
            json={"source_slot_id": "station_1"},
        )
        moved_in_rack = client.post(
            f"/experiments/{experiment_id}/rack/tools/{tool_id}/move-to-slot",
            json={"target_rack_slot_id": "rack_slot_2"},
        )
        returned_to_bench = client.post(
            f"/experiments/{experiment_id}/rack/tools/{tool_id}/move-to-workbench-slot",
            json={"target_slot_id": "station_2"},
        )
        placed_from_palette = client.post(
            f"/experiments/{experiment_id}/rack/slots/rack_slot_1/place-tool-from-palette",
            json={"tool_id": "sample_vial_lcms"},
        )

    assert discarded_from_palette.status_code == 200
    assert discarded_from_palette.json()["trash"]["tools"][0]["origin_label"] == "Palette"
    assert discarded_label.status_code == 200
    assert len(discarded_label.json()["trash"]["sample_labels"]) == 1
    assert placed_in_rack.status_code == 200
    assert placed_in_rack.json()["rack"]["slots"][0]["tool"]["id"] == tool_id
    assert moved_in_rack.status_code == 200
    assert moved_in_rack.json()["rack"]["slots"][1]["tool"]["id"] == tool_id
    assert returned_to_bench.status_code == 200
    assert returned_to_bench.json()["workbench"]["slots"][1]["tool"]["id"] == tool_id
    assert placed_from_palette.status_code == 200
    assert placed_from_palette.json()["rack"]["slots"][0]["tool"]["label"] == "Autosampler vial"


def test_trash_tool_restore_routes_round_trip_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        placed = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "sample_vial_lcms"},
        )
        tool_id = placed.json()["workbench"]["slots"][0]["tool"]["id"]
        discarded = client.post(f"/experiments/{experiment_id}/workbench/tools/{tool_id}/discard")
        trash_entry_id = discarded.json()["trash"]["tools"][0]["id"]
        restored_to_bench = client.post(
            f"/experiments/{experiment_id}/trash/tools/{trash_entry_id}/restore-to-workbench",
            json={"target_slot_id": "station_2"},
        )
        restored_tool_id = restored_to_bench.json()["workbench"]["slots"][1]["tool"]["id"]
        discarded_again = client.post(f"/experiments/{experiment_id}/workbench/tools/{restored_tool_id}/discard")
        second_entry_id = discarded_again.json()["trash"]["tools"][0]["id"]
        restored_to_rack = client.post(
            f"/experiments/{experiment_id}/trash/tools/{second_entry_id}/restore-to-rack",
            json={"rack_slot_id": "rack_slot_1"},
        )

    assert restored_to_bench.status_code == 200
    assert restored_to_bench.json()["workbench"]["slots"][1]["tool"]["label"] == "Autosampler vial"
    assert restored_to_rack.status_code == 200
    assert restored_to_rack.json()["rack"]["slots"][0]["tool"]["label"] == "Autosampler vial"
    assert restored_to_rack.json()["trash"]["tools"] == []


def test_workspace_routes_round_trip_over_http() -> None:
    created_at = datetime(2026, 3, 28, 19, 0, tzinfo=timezone.utc)
    warmed_at = created_at + timedelta(seconds=10)
    original_now_fn = experiment_service._now_fn
    experiment_service._now_fn = lambda: created_at

    try:
        with TestClient(app) as client:
            experiment_id = _create_experiment(client)

            added_widget = client.post(
                f"/experiments/{experiment_id}/workspace/widgets",
                json={"widget_id": "grinder", "anchor": "top-right", "offset_x": 0, "offset_y": 420},
            )
            moved_widget = client.post(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/move",
                json={"anchor": "top-left", "offset_x": 100, "offset_y": 460},
            )
            produce_created = client.post(
                f"/experiments/{experiment_id}/workspace/produce-lots",
                json={"produce_type": "apple"},
            )
            produce_lot_id = produce_created.json()["workspace"]["produce_lots"][0]["id"]
            produce_loaded = client.post(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/add-produce-lot",
                json={"produce_lot_id": produce_lot_id},
            )
            added_liquid = client.post(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/liquids",
                json={"liquid_id": "dry_ice_pellets", "volume_ml": 275.25},
            )
            liquid_id = added_liquid.json()["workspace"]["widgets"][5]["liquids"][0]["id"]
            updated_liquid = client.patch(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/liquids/{liquid_id}",
                json={"volume_ml": 125.5},
            )
            experiment_service._now_fn = lambda: warmed_at
            advanced = client.get(f"/experiments/{experiment_id}")
            removed_liquid = client.delete(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/liquids/{liquid_id}"
            )
            discarded_widget = client.post(f"/experiments/{experiment_id}/workspace/widgets/grinder/discard")
    finally:
        experiment_service._now_fn = original_now_fn

    assert added_widget.status_code == 200
    assert next(widget for widget in added_widget.json()["workspace"]["widgets"] if widget["id"] == "grinder")[
        "is_present"
    ] is True
    assert moved_widget.status_code == 200
    assert next(widget for widget in moved_widget.json()["workspace"]["widgets"] if widget["id"] == "grinder")[
        "anchor"
    ] == "top-left"
    assert produce_loaded.status_code == 200
    assert produce_loaded.json()["workspace"]["produce_lots"] == []
    assert updated_liquid.status_code == 200
    assert updated_liquid.json()["workspace"]["widgets"][5]["liquids"][0]["volume_ml"] == 125.5
    assert advanced.status_code == 200
    assert advanced.json()["workspace"]["widgets"][5]["produce_lots"][0]["temperature_c"] < 20.0
    assert removed_liquid.status_code == 200
    assert removed_liquid.json()["workspace"]["widgets"][5]["liquids"] == []
    assert discarded_widget.status_code == 200
    assert next(widget for widget in discarded_widget.json()["workspace"]["widgets"] if widget["id"] == "grinder")[
        "is_trashed"
    ] is True


def test_experiment_stream_pushes_updated_snapshots() -> None:
    created_at = datetime(2026, 3, 28, 19, 0, tzinfo=timezone.utc)
    warmed_at = created_at + timedelta(seconds=10)
    original_now_fn = experiment_service._now_fn
    experiment_service._now_fn = lambda: created_at

    try:
        with TestClient(app) as client:
            experiment_id = _create_experiment(client)
            client.post(
                f"/experiments/{experiment_id}/workspace/widgets",
                json={"widget_id": "grinder", "anchor": "top-right", "offset_x": 0, "offset_y": 420},
            )
            produced = client.post(
                f"/experiments/{experiment_id}/workspace/produce-lots",
                json={"produce_type": "apple"},
            )
            produce_lot_id = produced.json()["workspace"]["produce_lots"][0]["id"]
            client.post(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/add-produce-lot",
                json={"produce_lot_id": produce_lot_id},
            )
            client.post(
                f"/experiments/{experiment_id}/workspace/widgets/grinder/liquids",
                json={"liquid_id": "dry_ice_pellets", "volume_ml": 500},
            )
            experiment_service._now_fn = lambda: warmed_at

            with client.websocket_connect(f"/experiments/{experiment_id}/stream") as websocket:
                snapshot = websocket.receive_json()
    finally:
        experiment_service._now_fn = original_now_fn

    assert snapshot["id"] == experiment_id
    assert snapshot["snapshot_version"] >= 1
    assert snapshot["workspace"]["widgets"][5]["produce_lots"][0]["temperature_c"] < 20.0


def test_produce_lot_routes_round_trip_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        created = client.post(
            f"/experiments/{experiment_id}/workspace/produce-lots",
            json={"produce_type": "apple"},
        )
        first_lot_id = created.json()["workspace"]["produce_lots"][0]["id"]
        placed_board = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "cutting_board_hdpe"},
        )
        board_id = placed_board.json()["workbench"]["slots"][0]["tool"]["id"]
        added_to_board = client.post(
            f"/experiments/{experiment_id}/workbench/tools/{board_id}/add-produce-lot",
            json={"produce_lot_id": first_lot_id},
        )
        cut = client.post(
            f"/experiments/{experiment_id}/workbench/produce-lots/{first_lot_id}/cut",
            json={"slot_id": "station_1"},
        )
        discarded_from_board = client.post(
            f"/experiments/{experiment_id}/workbench/produce-lots/{first_lot_id}/discard",
            json={"slot_id": "station_1"},
        )
        trash_entry_id = discarded_from_board.json()["trash"]["produce_lots"][0]["id"]
        restored_to_board = client.post(
            f"/experiments/{experiment_id}/trash/produce-lots/{trash_entry_id}/restore-to-workbench-tool",
            json={"target_slot_id": "station_1"},
        )
        discarded_again = client.post(
            f"/experiments/{experiment_id}/workbench/produce-lots/{first_lot_id}/discard",
            json={"slot_id": "station_1"},
        )
        second_entry_id = discarded_again.json()["trash"]["produce_lots"][0]["id"]
        added_grinder = client.post(
            f"/experiments/{experiment_id}/workspace/widgets",
            json={"widget_id": "grinder", "anchor": "top-right", "offset_x": 0, "offset_y": 420},
        )
        restored_to_widget = client.post(
            f"/experiments/{experiment_id}/trash/produce-lots/{second_entry_id}/restore-to-widget",
            json={"widget_id": "grinder"},
        )
        moved_to_bench = client.post(
            f"/experiments/{experiment_id}/workspace/widgets/grinder/produce-lots/{first_lot_id}/move-to-workbench-tool",
            json={"target_slot_id": "station_2"},
        )
        discarded_from_widget_target = client.post(
            f"/experiments/{experiment_id}/workbench/produce-lots/{first_lot_id}/discard",
            json={"slot_id": "station_2"},
        )
        third_entry_id = discarded_from_widget_target.json()["trash"]["produce_lots"][0]["id"]
        restored_to_widget_again = client.post(
            f"/experiments/{experiment_id}/trash/produce-lots/{third_entry_id}/restore-to-widget",
            json={"widget_id": "grinder"},
        )
        discarded_from_widget = client.post(
            f"/experiments/{experiment_id}/workspace/widgets/grinder/produce-lots/{first_lot_id}/discard"
        )

    assert added_to_board.status_code == 200
    assert cut.status_code == 200
    assert cut.json()["workbench"]["slots"][0]["tool"]["produce_lots"][0]["cut_state"] == "cut"
    assert restored_to_board.status_code == 200
    assert restored_to_board.json()["workbench"]["slots"][0]["tool"]["produce_lots"][0]["id"] == first_lot_id
    assert added_grinder.status_code == 200
    assert restored_to_widget.status_code == 200
    assert restored_to_widget.json()["workspace"]["widgets"][5]["produce_lots"][0]["id"] == first_lot_id
    assert moved_to_bench.status_code == 200
    assert moved_to_bench.json()["workbench"]["slots"][1]["surface_produce_lots"][0]["id"] == first_lot_id
    assert restored_to_widget_again.status_code == 200
    assert discarded_from_widget.status_code == 200
    assert discarded_from_widget.json()["trash"]["produce_lots"][0]["produce_lot"]["id"] == first_lot_id


def test_workspace_move_workbench_produce_lot_to_widget_over_http() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        created = client.post(
            f"/experiments/{experiment_id}/workspace/produce-lots",
            json={"produce_type": "apple"},
        )
        produce_lot_id = created.json()["workspace"]["produce_lots"][0]["id"]
        placed_board = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "cutting_board_hdpe"},
        )
        board_id = placed_board.json()["workbench"]["slots"][0]["tool"]["id"]
        client.post(
            f"/experiments/{experiment_id}/workbench/tools/{board_id}/add-produce-lot",
            json={"produce_lot_id": produce_lot_id},
        )
        client.post(
            f"/experiments/{experiment_id}/workspace/widgets",
            json={"widget_id": "grinder", "anchor": "top-right", "offset_x": 0, "offset_y": 420},
        )
        moved = client.post(
            f"/experiments/{experiment_id}/workspace/widgets/grinder/move-workbench-produce-lot",
            json={"source_slot_id": "station_1", "produce_lot_id": produce_lot_id},
        )

    assert moved.status_code == 200
    assert moved.json()["workspace"]["widgets"][5]["produce_lots"][0]["id"] == produce_lot_id


def test_new_routes_return_expected_http_errors() -> None:
    with TestClient(app) as client:
        experiment_id = _create_experiment(client)

        missing_experiment = client.post(
            "/experiments/missing/workbench/slots/station_1/place-tool",
            json={"tool_id": "sample_vial_lcms"},
        )
        invalid_payload = client.post(
            f"/experiments/{experiment_id}/workbench/slots/station_1/place-tool",
            json={"tool_id": "sample_vial_lcms"},
        )
        invalid_state = client.post(
            f"/experiments/{experiment_id}/workbench/tools/unknown/liquids",
            json={"liquid_id": "acetonitrile_extraction"},
        )
        invalid_shape = client.post(
            f"/experiments/{experiment_id}/workspace/produce-lots",
            json={"produce_type": "pear"},
        )

    assert missing_experiment.status_code == 404
    assert invalid_payload.status_code == 200
    assert invalid_state.status_code == 400
    assert invalid_state.json() == {"detail": "Unknown workbench tool"}
    assert invalid_shape.status_code == 422
