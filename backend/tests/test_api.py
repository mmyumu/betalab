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
