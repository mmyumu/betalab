from __future__ import annotations

from app.domain.models import Experiment, ProduceLot, new_id
from app.services.commands import (
    CreateDebugProduceLotOnWorkbenchCommand,
    CreateDebugProduceLotToWidgetCommand,
)
from app.services.produce_lot_transfer import GrinderProduceLotTarget, WorkbenchProduceLotTarget


def create_debug_produce_lot_on_workbench(
    experiment: Experiment,
    command: CreateDebugProduceLotOnWorkbenchCommand,
) -> None:
    produce_lot = _build_debug_produce_lot(command.preset_id)
    target = WorkbenchProduceLotTarget(slot_id=command.target_slot_id)
    target.validate(experiment)
    placement = target.place(experiment, produce_lot)
    experiment.audit_log.append(
        f"Debug preset {produce_lot.label} spawned on {placement.target_label}."
    )


def create_debug_produce_lot_to_widget(
    experiment: Experiment,
    command: CreateDebugProduceLotToWidgetCommand,
) -> None:
    produce_lot = _build_debug_produce_lot(command.preset_id)
    target = GrinderProduceLotTarget(widget_id=command.widget_id)
    target.validate(experiment)
    placement = target.place(experiment, produce_lot)
    experiment.audit_log.append(
        f"Debug preset {produce_lot.label} spawned in {placement.target_label}."
    )


def _build_debug_produce_lot(preset_id: str) -> ProduceLot:
    if preset_id == "apple_powder_residual_co2":
        return ProduceLot(
            id=new_id("produce"),
            label="Apple powder lot",
            produce_type="apple",
            total_mass_g=850.0,
            unit_count=None,
            cut_state="ground",
            temperature_c=-62.0,
            grind_quality_label="powder_fine",
            homogeneity_score=0.96,
            residual_co2_mass_g=18.0,
        )

    raise ValueError("Unknown debug produce preset")
