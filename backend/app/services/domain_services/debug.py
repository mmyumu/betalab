from __future__ import annotations

from dataclasses import dataclass

from app.domain.models import Experiment, ProduceLot, new_id
from app.services.domain_services.base import ExperimentRuntime, WriteDomainService
from app.services.domain_services.gross_balance import GrossBalanceProduceLotTarget
from app.services.transfer import GrinderProduceLotTarget, WorkbenchProduceLotTarget


@dataclass(frozen=True, slots=True)
class CreateDebugProduceLotOnWorkbenchRequest:
    preset_id: str
    target_slot_id: str
    total_mass_g: float | None = None
    temperature_c: float | None = None
    residual_co2_mass_g: float | None = None


@dataclass(frozen=True, slots=True)
class CreateDebugProduceLotToWidgetRequest:
    preset_id: str
    widget_id: str
    total_mass_g: float | None = None
    temperature_c: float | None = None
    residual_co2_mass_g: float | None = None


class CreateDebugProduceLotOnWorkbenchService(
    WriteDomainService[CreateDebugProduceLotOnWorkbenchRequest]
):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: CreateDebugProduceLotOnWorkbenchRequest) -> None:
        produce_lot = _build_debug_produce_lot(
            request.preset_id,
            total_mass_g=request.total_mass_g,
            temperature_c=request.temperature_c,
            residual_co2_mass_g=request.residual_co2_mass_g,
        )
        target = WorkbenchProduceLotTarget(slot_id=request.target_slot_id)
        target.validate(experiment)
        placement = target.place(experiment, produce_lot)
        experiment.audit_log.append(f"Debug preset {produce_lot.label} spawned on {placement.target_label}.")


class CreateDebugProduceLotToWidgetService(WriteDomainService[CreateDebugProduceLotToWidgetRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: CreateDebugProduceLotToWidgetRequest) -> None:
        produce_lot = _build_debug_produce_lot(
            request.preset_id,
            total_mass_g=request.total_mass_g,
            temperature_c=request.temperature_c,
            residual_co2_mass_g=request.residual_co2_mass_g,
        )
        if request.widget_id == "gross_balance":
            target = GrossBalanceProduceLotTarget()
        else:
            target = GrinderProduceLotTarget(widget_id=request.widget_id)
        target.validate(experiment)
        placement = target.place(experiment, produce_lot)
        experiment.audit_log.append(f"Debug preset {produce_lot.label} spawned in {placement.target_label}.")


def _build_debug_produce_lot(
    preset_id: str,
    *,
    total_mass_g: float | None = None,
    temperature_c: float | None = None,
    residual_co2_mass_g: float | None = None,
) -> ProduceLot:
    if preset_id == "apple_powder_residual_co2":
        return ProduceLot(
            id=new_id("produce"),
            label="Apple powder lot",
            produce_type="apple",
            total_mass_g=total_mass_g if total_mass_g is not None else 2450.0,
            unit_count=None,
            cut_state="ground",
            temperature_c=temperature_c if temperature_c is not None else -62.0,
            grind_quality_label="powder_fine",
            homogeneity_score=0.96,
            residual_co2_mass_g=(
                residual_co2_mass_g if residual_co2_mass_g is not None else 18.0
            ),
        )

    raise ValueError("Unknown debug produce preset")
