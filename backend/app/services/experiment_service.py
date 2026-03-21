from __future__ import annotations

from dataclasses import asdict

from app.domain.models import (
    Container,
    ContainerKind,
    ContentPortion,
    Experiment,
    ExperimentStatus,
    Molecule,
    Rack,
    Run,
    RunResult,
    Transition,
    new_id,
)
from app.schemas.experiment import ExperimentSchema
from app.services.simulation_service import simulate_transition_result


class ExperimentNotFoundError(KeyError):
    pass


class ExperimentService:
    def __init__(self) -> None:
        self._experiments: dict[str, Experiment] = {}

    def create_experiment(self, scenario_id: str) -> ExperimentSchema:
        molecule = Molecule(
            id="mol_caffeine_like",
            name="Molecule A",
            retention_time_min=1.35,
            response_factor=180.0,
            expected_ion_ratio=0.62,
            transitions=[
                Transition(id="tr_1", q1_mz=301.2, q3_mz=123.1, relative_response=1.0),
                Transition(id="tr_2", q1_mz=301.2, q3_mz=145.1, relative_response=0.62),
            ],
        )
        containers = {
            "stock_analyte": Container(
                id="stock_analyte",
                kind=ContainerKind.STOCK_BOTTLE,
                label="Stock analyte",
                capacity_ml=1000,
                current_volume_ml=1000,
            ),
            "solvent_a": Container(
                id="solvent_a",
                kind=ContainerKind.SOLVENT_BOTTLE,
                label="Solvent A",
                capacity_ml=1000,
                current_volume_ml=1000,
            ),
            "matrix_blank": Container(
                id="matrix_blank",
                kind=ContainerKind.MATRIX_BOTTLE,
                label="Matrix blank",
                capacity_ml=1000,
                current_volume_ml=1000,
            ),
            "flask_std_1": Container(
                id="flask_std_1",
                kind=ContainerKind.FLASK,
                label="Std 1",
                capacity_ml=100,
            ),
            "flask_std_2": Container(
                id="flask_std_2",
                kind=ContainerKind.FLASK,
                label="Std 2",
                capacity_ml=100,
            ),
            "flask_sample": Container(
                id="flask_sample",
                kind=ContainerKind.FLASK,
                label="Sample",
                capacity_ml=100,
            ),
        }
        experiment = Experiment(
            id=new_id("experiment"),
            scenario_id=scenario_id,
            status=ExperimentStatus.PREPARING,
            molecule=molecule,
            containers=containers,
            rack=Rack(positions={"A1": None, "A2": None, "A3": None}),
            audit_log=["Experiment created"],
        )
        self._experiments[experiment.id] = experiment
        return self._to_schema(experiment)

    def get_experiment(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)
        return self._to_schema(experiment)

    def apply_command(
        self, experiment_id: str, command_type: str, payload: dict
    ) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)

        handlers = {
            "create_flask": self._create_flask,
            "add_liquid": self._add_liquid,
            "transfer_to_vial": self._transfer_to_vial,
            "place_vial_in_rack": self._place_vial_in_rack,
            "run_sequence": self._run_sequence,
        }
        handler = handlers[command_type]
        handler(experiment, payload)
        return self._to_schema(experiment)

    def _create_flask(self, experiment: Experiment, payload: dict) -> None:
        label = payload["label"]
        container_id = new_id("flask")
        experiment.containers[container_id] = Container(
            id=container_id,
            kind=ContainerKind.FLASK,
            label=label,
            capacity_ml=float(payload.get("capacity_ml", 100)),
        )
        experiment.audit_log.append(f"Created flask {label}")

    def _add_liquid(self, experiment: Experiment, payload: dict) -> None:
        target = experiment.containers[payload["target_id"]]
        source = experiment.containers[payload["source_id"]]
        volume_ml = float(payload["volume_ml"])
        analyte_concentration = float(payload.get("analyte_concentration_ng_ml", 0.0))
        matrix_effect_factor = float(payload.get("matrix_effect_factor", 1.0))

        if target.current_volume_ml + volume_ml > target.capacity_ml:
            raise ValueError("Container capacity exceeded")

        target.contents.append(
            ContentPortion(
                source_id=source.id,
                source_type=source.kind.value,
                name=source.label,
                volume_ml=volume_ml,
                analyte_concentration_ng_ml=analyte_concentration,
                matrix_effect_factor=matrix_effect_factor,
            )
        )
        target.current_volume_ml += volume_ml
        experiment.audit_log.append(f"Added {volume_ml} mL from {source.label} to {target.label}")

    def _transfer_to_vial(self, experiment: Experiment, payload: dict) -> None:
        source = experiment.containers[payload["source_id"]]
        label = payload["label"]
        transfer_volume_ml = float(payload.get("volume_ml", 1.0))

        if transfer_volume_ml > source.current_volume_ml:
            raise ValueError("Transfer volume exceeds source volume")

        vial_id = new_id("vial")
        vial = Container(
            id=vial_id,
            kind=ContainerKind.VIAL,
            label=label,
            capacity_ml=2.0,
            current_volume_ml=transfer_volume_ml,
            contents=[
                ContentPortion(
                    source_id=portion.source_id,
                    source_type=portion.source_type,
                    name=portion.name,
                    volume_ml=portion.volume_ml * (transfer_volume_ml / source.current_volume_ml),
                    analyte_concentration_ng_ml=portion.analyte_concentration_ng_ml,
                    matrix_effect_factor=portion.matrix_effect_factor,
                )
                for portion in source.contents
            ],
        )
        experiment.containers[vial_id] = vial
        experiment.audit_log.append(
            f"Transferred {transfer_volume_ml} mL from {source.label} to vial {label}"
        )

    def _place_vial_in_rack(self, experiment: Experiment, payload: dict) -> None:
        position = payload["position"]
        vial_id = payload["vial_id"]
        if position not in experiment.rack.positions:
            raise ValueError("Unknown rack position")
        experiment.rack.positions[position] = vial_id
        experiment.audit_log.append(f"Placed vial {vial_id} in rack position {position}")

    def _run_sequence(self, experiment: Experiment, payload: dict) -> None:
        experiment.status = ExperimentStatus.RUNNING
        experiment.runs.clear()
        for position, vial_id in experiment.rack.positions.items():
            if vial_id is None:
                continue
            vial = experiment.containers[vial_id]
            analyte_concentration = _compute_container_concentration(vial)
            matrix_effect_factor = _compute_matrix_effect(vial)
            transition_results = [
                simulate_transition_result(
                    molecule=experiment.molecule,
                    transition=transition,
                    concentration_ng_ml=analyte_concentration,
                    matrix_effect_factor=matrix_effect_factor,
                )
                for transition in experiment.molecule.transitions
            ]
            run = Run(
                id=new_id("run"),
                source_vial_id=vial_id,
                sample_type="sample" if "sample" in vial.label.lower() else "standard",
                status="completed",
                result=RunResult(
                    observed_retention_time=experiment.molecule.retention_time_min,
                    transition_results=transition_results,
                    estimated_concentration_ng_ml=round(analyte_concentration, 3),
                    warnings=[],
                ),
            )
            experiment.runs.append(run)
            experiment.audit_log.append(f"Completed run for rack position {position}")
        experiment.status = ExperimentStatus.COMPLETED

    def _to_schema(self, experiment: Experiment) -> ExperimentSchema:
        containers = {}
        for container_id, container in experiment.containers.items():
            container_data = asdict(container)
            container_data["kind"] = container.kind.value
            container_data["analyte_concentration_ng_ml"] = _compute_container_concentration(container)
            container_data["matrix_effect_factor"] = _compute_matrix_effect(container)
            containers[container_id] = container_data

        experiment_data = {
            "id": experiment.id,
            "scenario_id": experiment.scenario_id,
            "status": experiment.status.value,
            "molecule": asdict(experiment.molecule),
            "containers": containers,
            "rack": {"positions": experiment.rack.positions},
            "runs": [asdict(run) for run in experiment.runs],
            "audit_log": experiment.audit_log,
        }
        return ExperimentSchema.model_validate(experiment_data)


def _compute_container_concentration(container: Container) -> float:
    if container.current_volume_ml <= 0:
        return 0.0
    analyte_mass = sum(portion.volume_ml * portion.analyte_concentration_ng_ml for portion in container.contents)
    return round(analyte_mass / container.current_volume_ml, 3)


def _compute_matrix_effect(container: Container) -> float:
    if not container.contents:
        return 1.0
    total = sum(portion.matrix_effect_factor for portion in container.contents)
    return round(total / len(container.contents), 3)
