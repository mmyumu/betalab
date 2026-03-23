from app.core.config import Settings, settings
from app.main import app


def test_settings_defaults_are_exposed() -> None:
    configured = Settings()

    assert configured.app_name == "Betalab Simulation API"
    assert configured.app_version == "0.1.0"
    assert settings.app_name == configured.app_name


def test_healthcheck_returns_ok() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_fetch_experiment_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]
        fetched = client.get(f"/experiments/{experiment_id}")

    assert created.status_code == 200
    assert created.json()["workbench"]["slots"][0]["tool"] is None
    assert created.json()["rack"]["slots"][0]["tool"] is None
    assert created.json()["trash"]["tools"] == []
    assert created.json()["workspace"]["widgets"][0]["id"] == "workbench"
    assert fetched.status_code == 200
    assert fetched.json()["id"] == experiment_id


def test_get_experiment_returns_404_for_unknown_id() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        response = client.get("/experiments/missing")

    assert response.status_code == 404
    assert response.json() == {"detail": "Experiment not found"}


def test_apply_command_returns_400_for_invalid_payload() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        response = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "add_liquid_to_workbench_tool",
                "payload": {
                    "slot_id": "station_1",
                    "liquid_id": "acetonitrile_extraction",
                },
            },
        )

    assert response.status_code == 400
    assert response.json() == {"detail": "Place a tool on Station 1 before adding liquids."}


def test_apply_command_returns_404_for_unknown_experiment() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        response = client.post(
            "/experiments/missing/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {},
            },
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Experiment not found"}


def test_apply_command_returns_422_for_unknown_command_type() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        response = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "unsupported",
                "payload": {},
            },
        )

    assert response.status_code == 422


def test_pesticide_workbench_commands_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        placed = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "sample_vial_lcms",
                },
            },
        )
        added = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "add_liquid_to_workbench_tool",
                "payload": {
                    "slot_id": "station_1",
                    "liquid_id": "acetonitrile_extraction",
                },
            },
        )

    assert created.status_code == 200
    assert placed.status_code == 200
    assert placed.json()["workbench"]["slots"][0]["tool"]["label"] == "Autosampler vial"
    assert added.status_code == 200
    assert added.json()["workbench"]["slots"][0]["tool"]["liquids"][0]["volume_ml"] == 2.0


def test_move_tool_between_workbench_slots_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "sample_vial_lcms",
                },
            },
        )
        moved = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "move_tool_between_workbench_slots",
                "payload": {
                    "source_slot_id": "station_1",
                    "target_slot_id": "station_2",
                },
            },
        )

    assert moved.status_code == 200
    assert moved.json()["workbench"]["slots"][0]["tool"] is None
    assert moved.json()["workbench"]["slots"][1]["tool"]["label"] == "Autosampler vial"


def test_rack_commands_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "sample_vial_lcms",
                },
            },
        )
        loaded = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_workbench_tool_in_rack_slot",
                "payload": {
                    "source_slot_id": "station_1",
                    "rack_slot_id": "rack_slot_1",
                },
            },
        )
        removed = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "remove_rack_tool_to_workbench_slot",
                "payload": {
                    "rack_slot_id": "rack_slot_1",
                    "target_slot_id": "station_2",
                },
            },
        )

    assert loaded.status_code == 200
    assert loaded.json()["workbench"]["slots"][0]["tool"] is None
    assert loaded.json()["rack"]["slots"][0]["tool"]["label"] == "Autosampler vial"
    assert removed.status_code == 200
    assert removed.json()["rack"]["slots"][0]["tool"] is None
    assert removed.json()["workbench"]["slots"][1]["tool"]["label"] == "Autosampler vial"


def test_discard_commands_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "sample_vial_lcms",
                },
            },
        )
        discarded_bench_tool = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "discard_workbench_tool",
                "payload": {
                    "slot_id": "station_1",
                },
            },
        )

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "sample_vial_lcms",
                },
            },
        )
        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_workbench_tool_in_rack_slot",
                "payload": {
                    "source_slot_id": "station_1",
                    "rack_slot_id": "rack_slot_1",
                },
            },
        )
        discarded_rack_tool = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "discard_rack_tool",
                "payload": {
                    "rack_slot_id": "rack_slot_1",
                },
            },
        )

    assert discarded_bench_tool.status_code == 200
    assert discarded_bench_tool.json()["workbench"]["slots"][0]["tool"] is None
    assert discarded_bench_tool.json()["trash"]["tools"][0]["tool"]["label"] == "Autosampler vial"
    assert discarded_rack_tool.status_code == 200
    assert discarded_rack_tool.json()["rack"]["slots"][0]["tool"] is None
    assert len(discarded_rack_tool.json()["trash"]["tools"]) == 2


def test_restore_trash_commands_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "sample_vial_lcms",
                },
            },
        )
        discarded = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "discard_workbench_tool",
                "payload": {
                    "slot_id": "station_1",
                },
            },
        )
        trash_tool_id = discarded.json()["trash"]["tools"][0]["id"]
        restored_to_bench = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "restore_trashed_tool_to_workbench_slot",
                "payload": {
                    "trash_tool_id": trash_tool_id,
                    "target_slot_id": "station_2",
                },
            },
        )

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "discard_workbench_tool",
                "payload": {
                    "slot_id": "station_2",
                },
            },
        )
        trashed_again = client.get(f"/experiments/{experiment_id}")
        second_trash_tool_id = trashed_again.json()["trash"]["tools"][0]["id"]
        restored_to_rack = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "restore_trashed_tool_to_rack_slot",
                "payload": {
                    "trash_tool_id": second_trash_tool_id,
                    "rack_slot_id": "rack_slot_1",
                },
            },
        )

    assert restored_to_bench.status_code == 200
    assert restored_to_bench.json()["workbench"]["slots"][1]["tool"]["label"] == "Autosampler vial"
    assert restored_to_bench.json()["trash"]["tools"] == []
    assert restored_to_rack.status_code == 200
    assert restored_to_rack.json()["rack"]["slots"][0]["tool"]["label"] == "Autosampler vial"
    assert restored_to_rack.json()["trash"]["tools"] == []


def test_workspace_widget_commands_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        added = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "add_workspace_widget",
                "payload": {
                    "widget_id": "rack",
                    "x": 480,
                    "y": 420,
                },
            },
        )
        moved = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "move_workspace_widget",
                "payload": {
                    "widget_id": "rack",
                    "x": 520,
                    "y": 460,
                },
            },
        )
        discarded = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "discard_workspace_widget",
                "payload": {
                    "widget_id": "rack",
                },
            },
        )

    assert added.status_code == 200
    assert next(widget for widget in added.json()["workspace"]["widgets"] if widget["id"] == "rack")[
        "is_present"
    ] is True
    assert moved.status_code == 200
    assert next(widget for widget in moved.json()["workspace"]["widgets"] if widget["id"] == "rack")[
        "x"
    ] == 520
    assert discarded.status_code == 200
    assert next(
        widget for widget in discarded.json()["workspace"]["widgets"] if widget["id"] == "rack"
    )["is_present"] is False


def test_remove_liquid_round_trip_over_http() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments")
        experiment_id = created.json()["id"]

        client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_tool_on_workbench",
                "payload": {
                    "slot_id": "station_1",
                    "tool_id": "centrifuge_tube_50ml",
                },
            },
        )
        added = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "add_liquid_to_workbench_tool",
                "payload": {
                    "slot_id": "station_1",
                    "liquid_id": "acetonitrile_extraction",
                },
            },
        )
        liquid_id = added.json()["workbench"]["slots"][0]["tool"]["liquids"][0]["id"]
        removed = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "remove_liquid_from_workbench_tool",
                "payload": {
                    "slot_id": "station_1",
                    "liquid_entry_id": liquid_id,
                },
            },
        )

    assert removed.status_code == 200
    assert removed.json()["workbench"]["slots"][0]["tool"]["liquids"] == []
