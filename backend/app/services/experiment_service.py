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
    Workbench,
    WorkbenchLiquid,
    WorkbenchSlot,
    WorkbenchTool,
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
        if scenario_id == "pesticides_workbench":
            experiment = Experiment(
                id=new_id("experiment"),
                scenario_id=scenario_id,
                status=ExperimentStatus.PREPARING,
                molecule=_default_molecule(),
                containers={},
                rack=Rack(positions={}),
                workbench=Workbench(
                    slots=[
                        WorkbenchSlot(id="station_1", label="Station 1"),
                        WorkbenchSlot(id="station_2", label="Station 2"),
                        WorkbenchSlot(id="station_3", label="Station 3"),
                        WorkbenchSlot(id="station_4", label="Station 4"),
                    ]
                ),
                audit_log=["Experiment created", "Start by dragging an extraction tool onto the bench."],
            )
            self._experiments[experiment.id] = experiment
            return self._to_schema(experiment)

        molecule = _default_molecule()
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
            "place_tool_on_workbench": self._place_tool_on_workbench,
            "add_liquid_to_workbench_tool": self._add_liquid_to_workbench_tool,
            "update_workbench_liquid_volume": self._update_workbench_liquid_volume,
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

    def _place_tool_on_workbench(self, experiment: Experiment, payload: dict) -> None:
        workbench = _require_workbench(experiment)
        slot = _find_workbench_slot(workbench, payload["slot_id"])
        if slot.tool is not None:
            raise ValueError(f"{slot.label} already contains a tool")

        tool_catalog_entry = _get_workbench_tool_definition(payload["tool_id"])
        slot.tool = WorkbenchTool(
            id=new_id("bench_tool"),
            tool_id=tool_catalog_entry["id"],
            label=tool_catalog_entry["name"],
            subtitle=tool_catalog_entry["subtitle"],
            accent=tool_catalog_entry["accent"],
            tool_type=tool_catalog_entry["tool_type"],
            capacity_ml=tool_catalog_entry["capacity_ml"],
            accepts_liquids=True,
        )
        experiment.audit_log.append(f"{slot.tool.label} placed on {slot.label}.")

    def _add_liquid_to_workbench_tool(self, experiment: Experiment, payload: dict) -> None:
        workbench = _require_workbench(experiment)
        slot = _find_workbench_slot(workbench, payload["slot_id"])
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before adding liquids.")

        liquid_catalog_entry = _get_workbench_liquid_definition(payload["liquid_id"])
        current_volume = sum(liquid.volume_ml for liquid in slot.tool.liquids)
        remaining_capacity = max(slot.tool.capacity_ml - current_volume, 0)

        if remaining_capacity <= 0:
            raise ValueError(f"{slot.tool.label} is already full.")

        volume_to_add = min(liquid_catalog_entry["transfer_volume_ml"], remaining_capacity)
        existing_liquid = next(
            (liquid for liquid in slot.tool.liquids if liquid.liquid_id == liquid_catalog_entry["id"]),
            None,
        )
        had_existing_liquid = existing_liquid is not None

        if existing_liquid is None:
            slot.tool.liquids.append(
                WorkbenchLiquid(
                    id=new_id("bench_liquid"),
                    liquid_id=liquid_catalog_entry["id"],
                    name=liquid_catalog_entry["name"],
                    volume_ml=volume_to_add,
                    accent=liquid_catalog_entry["accent"],
                )
            )
            updated_volume = volume_to_add
        else:
            existing_liquid.volume_ml += volume_to_add
            updated_volume = existing_liquid.volume_ml

        if volume_to_add < liquid_catalog_entry["transfer_volume_ml"]:
            if had_existing_liquid:
                experiment.audit_log.append(
                    f"{liquid_catalog_entry['name']} increased to {updated_volume:g} mL in {slot.tool.label} (remaining capacity)."
                )
            else:
                experiment.audit_log.append(
                    f"{liquid_catalog_entry['name']} added to {slot.tool.label} at {updated_volume:g} mL (remaining capacity)."
                )
        elif not had_existing_liquid:
            experiment.audit_log.append(f"{liquid_catalog_entry['name']} added to {slot.tool.label}.")
        else:
            experiment.audit_log.append(
                f"{liquid_catalog_entry['name']} increased to {updated_volume:g} mL in {slot.tool.label}."
            )

    def _update_workbench_liquid_volume(self, experiment: Experiment, payload: dict) -> None:
        workbench = _require_workbench(experiment)
        slot = _find_workbench_slot(workbench, payload["slot_id"])
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before editing liquids.")

        liquid_entry = next(
            (liquid for liquid in slot.tool.liquids if liquid.id == payload["liquid_entry_id"]),
            None,
        )
        if liquid_entry is None:
            raise ValueError("Unknown workbench liquid")

        requested_volume = max(float(payload["volume_ml"]), 0.0)
        occupied_by_others = sum(
            liquid.volume_ml for liquid in slot.tool.liquids if liquid.id != liquid_entry.id
        )
        max_allowed_volume = max(slot.tool.capacity_ml - occupied_by_others, 0.0)
        next_volume = min(requested_volume, max_allowed_volume)
        liquid_entry.volume_ml = round(next_volume, 3)
        experiment.audit_log.append(
            f"{liquid_entry.name} adjusted to {liquid_entry.volume_ml:g} mL in {slot.tool.label}."
        )

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
            "workbench": asdict(experiment.workbench) if experiment.workbench is not None else None,
            "audit_log": experiment.audit_log,
        }
        return ExperimentSchema.model_validate(experiment_data)


def _default_molecule() -> Molecule:
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
    return molecule


def _require_workbench(experiment: Experiment) -> Workbench:
    if experiment.workbench is None:
        raise ValueError("Experiment has no workbench")
    return experiment.workbench


def _find_workbench_slot(workbench: Workbench, slot_id: str) -> WorkbenchSlot:
    slot = next((entry for entry in workbench.slots if entry.id == slot_id), None)
    if slot is None:
        raise ValueError("Unknown workbench slot")
    return slot


def _get_workbench_tool_definition(tool_id: str) -> dict[str, object]:
    tool_catalog = {
        "centrifuge_tube_50ml": {
            "id": "centrifuge_tube_50ml",
            "name": "50 mL centrifuge tube",
            "subtitle": "QuEChERS extraction",
            "accent": "amber",
            "tool_type": "centrifuge_tube",
            "capacity_ml": 50.0,
        },
        "cleanup_tube_dspe": {
            "id": "cleanup_tube_dspe",
            "name": "d-SPE cleanup tube",
            "subtitle": "Matrix cleanup",
            "accent": "emerald",
            "tool_type": "cleanup_tube",
            "capacity_ml": 15.0,
        },
        "sample_vial_lcms": {
            "id": "sample_vial_lcms",
            "name": "Autosampler vial",
            "subtitle": "Injection ready",
            "accent": "sky",
            "tool_type": "sample_vial",
            "capacity_ml": 2.0,
        },
        "beaker_rinse": {
            "id": "beaker_rinse",
            "name": "Bench beaker",
            "subtitle": "Temporary holding",
            "accent": "rose",
            "tool_type": "beaker",
            "capacity_ml": 100.0,
        },
    }
    try:
        return tool_catalog[tool_id]
    except KeyError as exc:
        raise ValueError("Unknown workbench tool") from exc


def _get_workbench_liquid_definition(liquid_id: str) -> dict[str, object]:
    liquid_catalog = {
        "acetonitrile_extraction": {
            "id": "acetonitrile_extraction",
            "name": "Acetonitrile",
            "accent": "amber",
            "transfer_volume_ml": 10.0,
        },
        "apple_extract": {
            "id": "apple_extract",
            "name": "Apple extract",
            "accent": "rose",
            "transfer_volume_ml": 10.0,
        },
        "ultrapure_water_rinse": {
            "id": "ultrapure_water_rinse",
            "name": "Ultrapure water",
            "accent": "sky",
            "transfer_volume_ml": 5.0,
        },
    }
    try:
        return liquid_catalog[liquid_id]
    except KeyError as exc:
        raise ValueError("Unknown workbench liquid") from exc


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
