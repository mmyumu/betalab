from __future__ import annotations

from dataclasses import dataclass

from app.domain.models import Experiment, TrashToolEntry, WorkbenchTool, WorkspaceWidget, new_id
from app.domain.rules import can_tool_be_sealed
from app.services.domain_services.base import ExperimentRuntime, WriteDomainService
from app.services.helpers.lookups import (
    find_rack_slot,
    find_trash_tool,
    find_workbench_slot,
    find_workspace_widget,
)
from app.services.helpers.workbench import build_workbench_tool
from app.services.physical_simulation_service import PhysicalSimulationService

_ANALYTICAL_BALANCE_MAX_G = 220.0
_ANALYTICAL_BALANCE_TARGET_MIN_G = 9.8
_ANALYTICAL_BALANCE_TARGET_MAX_G = 10.2
physical_simulation_service = PhysicalSimulationService()
_TARE_BY_TOOL_TYPE_G: dict[str, float] = {
    "volumetric_flask": 140.0,
    "amber_bottle": 95.0,
    "sample_vial": 1.5,
    "beaker": 68.0,
    "centrifuge_tube": 12.0,
    "cleanup_tube": 7.0,
    "cutting_board": 320.0,
    "sample_bag": 36.0,
    "storage_jar": 180.0,
}


@dataclass(frozen=True, slots=True)
class EmptyRequest:
    pass


@dataclass(frozen=True, slots=True)
class MoveWorkbenchToolToAnalyticalBalanceRequest:
    source_slot_id: str


@dataclass(frozen=True, slots=True)
class PlaceToolOnAnalyticalBalanceRequest:
    tool_id: str


@dataclass(frozen=True, slots=True)
class MoveRackToolToAnalyticalBalanceRequest:
    rack_slot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedToolToAnalyticalBalanceRequest:
    trash_tool_id: str


@dataclass(frozen=True, slots=True)
class MoveGrossBalanceToolToAnalyticalBalanceRequest:
    pass


@dataclass(frozen=True, slots=True)
class MoveAnalyticalBalanceToolToWorkbenchRequest:
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class MoveAnalyticalBalanceToolToRackRequest:
    rack_slot_id: str


class AnalyticalBalanceServiceBase(WriteDomainService[object]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _find_analytical_balance_widget(self, experiment: Experiment) -> WorkspaceWidget:
        widget = find_workspace_widget(experiment.workspace, "analytical_balance")
        if widget.widget_type != "analytical_balance":
            raise ValueError(f"{widget.label} is not an analytical balance.")
        return widget

    def _validate_balance_empty(self, widget: WorkspaceWidget) -> None:
        if widget.tool is not None:
            raise ValueError(f"{widget.label} already contains a tool.")

    def _require_balance_tool(self, experiment: Experiment) -> WorkbenchTool:
        widget = self._find_analytical_balance_widget(experiment)
        if widget.tool is None:
            raise ValueError(f"{widget.label} does not contain a tube.")
        return widget.tool

    def _validate_supported_tool(self, tool: WorkbenchTool) -> None:
        if tool.tool_type == "cutting_board":
            raise ValueError("The analytical balance cannot accept the cutting board (too heavy).")

    def _calculate_tool_mass_g(self, tool: WorkbenchTool) -> float:
        produce_mass_g = sum(lot.total_mass_g for lot in tool.produce_lots)
        liquid_mass_g = sum(liquid.volume_ml for liquid in tool.liquids)
        return round(
            _TARE_BY_TOOL_TYPE_G.get(tool.tool_type, 0.0)
            + produce_mass_g
            + liquid_mass_g
            + tool.powder_mass_g,
            3,
        )

    def _place_tool_on_balance(
        self,
        experiment: Experiment,
        tool: WorkbenchTool,
        *,
        action_verb: str = "placed on",
    ) -> None:
        self._validate_supported_tool(tool)
        widget = self._find_analytical_balance_widget(experiment)
        self._validate_balance_empty(widget)
        widget.tool = tool
        experiment.audit_log.append(f"{tool.label} {action_verb} {widget.label}.")

    def _take_tool_from_balance(self, experiment: Experiment) -> WorkbenchTool:
        widget = self._find_analytical_balance_widget(experiment)
        if widget.tool is None:
            raise ValueError(f"{widget.label} does not contain a tube.")
        removed_tool = widget.tool
        widget.tool = None
        return removed_tool


class MoveWorkbenchToolToAnalyticalBalanceService(AnalyticalBalanceServiceBase):
    def _run(
        self, experiment: Experiment, request: MoveWorkbenchToolToAnalyticalBalanceRequest
    ) -> None:
        source_slot = find_workbench_slot(experiment.workbench, request.source_slot_id)
        if source_slot.tool is None:
            raise ValueError(f"Place a tool on {source_slot.label} before moving it.")
        moved_tool = source_slot.tool
        source_slot.tool = None
        self._place_tool_on_balance(experiment, moved_tool, action_verb="moved to")


class PlaceToolOnAnalyticalBalanceService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: PlaceToolOnAnalyticalBalanceRequest) -> None:
        tool = build_workbench_tool(request.tool_id)
        self._place_tool_on_balance(experiment, tool)


class MoveRackToolToAnalyticalBalanceService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: MoveRackToolToAnalyticalBalanceRequest) -> None:
        rack_slot = find_rack_slot(experiment.rack, request.rack_slot_id)
        if rack_slot.tool is None:
            raise ValueError(f"{rack_slot.label} does not contain a tool.")
        moved_tool = rack_slot.tool
        rack_slot.tool = None
        self._place_tool_on_balance(experiment, moved_tool, action_verb="moved to")


class RestoreTrashedToolToAnalyticalBalanceService(AnalyticalBalanceServiceBase):
    def _run(
        self, experiment: Experiment, request: RestoreTrashedToolToAnalyticalBalanceRequest
    ) -> None:
        trashed_tool = find_trash_tool(experiment.trash, request.trash_tool_id)
        self._place_tool_on_balance(experiment, trashed_tool.tool, action_verb="restored to")
        experiment.trash.tools = [
            entry for entry in experiment.trash.tools if entry.id != trashed_tool.id
        ]


class MoveGrossBalanceToolToAnalyticalBalanceService(AnalyticalBalanceServiceBase):
    def _run(
        self, experiment: Experiment, request: MoveGrossBalanceToolToAnalyticalBalanceRequest
    ) -> None:
        gross_balance = find_workspace_widget(experiment.workspace, "gross_balance")
        if gross_balance.tool is None:
            raise ValueError("Gross balance does not contain a tool.")
        moved_tool = gross_balance.tool
        gross_balance.tool = None
        experiment.lims_reception.measured_gross_mass_g = None
        self._place_tool_on_balance(experiment, moved_tool, action_verb="moved to")


class MoveAnalyticalBalanceToolToWorkbenchService(AnalyticalBalanceServiceBase):
    def _run(
        self, experiment: Experiment, request: MoveAnalyticalBalanceToolToWorkbenchRequest
    ) -> None:
        target_slot = find_workbench_slot(experiment.workbench, request.target_slot_id)
        if target_slot.tool is not None or target_slot.surface_produce_lots:
            raise ValueError(f"{target_slot.label} already contains a tool")
        moved_tool = self._take_tool_from_balance(experiment)
        target_slot.tool = moved_tool
        experiment.audit_log.append(
            f"{moved_tool.label} moved from Analytical balance to {target_slot.label}."
        )


class MoveAnalyticalBalanceToolToRackService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: MoveAnalyticalBalanceToolToRackRequest) -> None:
        target_slot = find_rack_slot(experiment.rack, request.rack_slot_id)
        if target_slot.tool is not None:
            raise ValueError(f"{target_slot.label} already contains a tool")
        moved_tool = self._take_tool_from_balance(experiment)
        target_slot.tool = moved_tool
        experiment.audit_log.append(
            f"{moved_tool.label} moved from Analytical balance to {target_slot.label}."
        )


class DiscardAnalyticalBalanceToolService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: EmptyRequest) -> None:
        discarded_tool = self._take_tool_from_balance(experiment)
        experiment.trash.tools.append(
            TrashToolEntry(
                id=new_id("trash_tool"),
                origin_label="Analytical balance",
                tool=discarded_tool,
            )
        )
        experiment.audit_log.append(f"{discarded_tool.label} discarded from Analytical balance.")


class TareAnalyticalBalanceService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: EmptyRequest) -> None:
        widget = self._find_analytical_balance_widget(experiment)
        measured_mass_g = (
            self._calculate_tool_mass_g(widget.tool) if widget.tool is not None else 0.0
        )
        experiment.analytical_balance.tare_mass_g = measured_mass_g
        experiment.audit_log.append(f"Analytical balance tared at {measured_mass_g:.3f} g.")


class OpenAnalyticalBalanceToolService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: EmptyRequest) -> None:
        tool = self._require_balance_tool(experiment)
        if not can_tool_be_sealed(tool.tool_type):
            raise ValueError(f"{tool.label} does not support sealing.")

        vent_event = physical_simulation_service.vent_opened_tool(tool)
        tool.is_sealed = False
        tool.closure_fault = None
        if vent_event is not None and vent_event.lost_mass_g > 0:
            experiment.audit_log.append(
                f"{tool.label} vented at {vent_event.pressure_bar:.3f} bar on Analytical balance; "
                f"{vent_event.lost_mass_g:.3f} g of powder was lost."
            )
            return

        experiment.audit_log.append(f"{tool.label} opened on Analytical balance.")


class CloseAnalyticalBalanceToolService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: EmptyRequest) -> None:
        tool = self._require_balance_tool(experiment)
        if not can_tool_be_sealed(tool.tool_type):
            raise ValueError(f"{tool.label} does not support sealing.")

        tool.is_sealed = True
        tool.closure_fault = None
        tool.internal_pressure_bar = max(tool.internal_pressure_bar, 1.0)
        experiment.audit_log.append(f"{tool.label} sealed on Analytical balance.")


class RecordAnalyticalSampleMassService(AnalyticalBalanceServiceBase):
    def _run(self, experiment: Experiment, request: EmptyRequest) -> None:
        tool = self._require_balance_tool(experiment)
        measured_mass_g = self._calculate_tool_mass_g(tool)
        if measured_mass_g > _ANALYTICAL_BALANCE_MAX_G:
            raise ValueError("ERR_OVER: OVERLOAD : Retirez l'objet immediatement du plateau.")

        tare_mass_g = experiment.analytical_balance.tare_mass_g
        if tare_mass_g is None:
            raise ValueError(
                "ERR_TARE: Erreur de tare : le contenant semble trop lourd ou non remis a zero."
            )

        net_mass_g = round(measured_mass_g - tare_mass_g, 3)
        if (
            net_mass_g < _ANALYTICAL_BALANCE_TARGET_MIN_G
            or net_mass_g > _ANALYTICAL_BALANCE_TARGET_MAX_G
        ):
            raise ValueError("ERR_RANGE: Masse hors specifications. Ajustez la quantite de poudre.")

        experiment.lims_reception.measured_sample_mass_g = net_mass_g
        experiment.audit_log.append(f"Analytical sample mass recorded at {net_mass_g:.3f} g.")
