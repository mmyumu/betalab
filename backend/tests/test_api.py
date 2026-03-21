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
        created = client.post("/experiments", json={"scenario_id": "lcmsms_single_analyte"})
        experiment_id = created.json()["id"]
        fetched = client.get(f"/experiments/{experiment_id}")

    assert created.status_code == 200
    assert created.json()["scenario_id"] == "lcmsms_single_analyte"
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
        created = client.post("/experiments", json={"scenario_id": "lcmsms_single_analyte"})
        experiment_id = created.json()["id"]

        response = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "place_vial_in_rack",
                "payload": {
                    "position": "B9",
                    "vial_id": "vial_missing",
                },
            },
        )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unknown rack position"}


def test_apply_command_returns_404_for_unknown_experiment() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        response = client.post(
            "/experiments/missing/commands",
            json={
                "type": "run_sequence",
                "payload": {},
            },
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Experiment not found"}


def test_apply_command_returns_422_for_unknown_command_type() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        created = client.post("/experiments", json={"scenario_id": "lcmsms_single_analyte"})
        experiment_id = created.json()["id"]

        response = client.post(
            f"/experiments/{experiment_id}/commands",
            json={
                "type": "unsupported",
                "payload": {},
            },
        )

    assert response.status_code == 422
