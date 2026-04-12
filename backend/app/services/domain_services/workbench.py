from __future__ import annotations

import random
from dataclasses import dataclass

from app.domain.models import (
    Experiment,
    PowderFraction,
    TrashProduceLotEntry,
    TrashSampleLabelEntry,
    TrashToolEntry,
    WorkbenchLiquid,
    WorkbenchSlot,
    WorkbenchTool,
    new_id,
)
from app.domain.rules import can_tool_accept_liquids, can_tool_be_sealed, can_tool_receive_contents
from app.domain.workbench_catalog import get_workbench_liquid_definition
from app.services.domain_services.base import ExperimentRuntime, WriteDomainService
from app.services.helpers.lookups import (
    build_manual_label,
    find_tool_label,
    find_trash_sample_label,
    find_trash_tool,
    find_workbench_slot,
    format_volume,
    round_volume,
)
from app.services.helpers.workbench import (
    build_workbench_tool,
    find_produce_lot_in_slot,
    find_tool_liquid,
    get_next_workbench_slot_index,
    pop_tool_label,
    require_slot_tool,
)
from app.services.physical_simulation_service import PhysicalSimulationService
from app.services.transfer import (
    ProduceLotTransferService,
    TrashProduceLotSource,
    WorkbenchProduceLotSource,
    WorkbenchProduceLotTarget,
    WorkspaceProduceLotSource,
)

physical_simulation_service = PhysicalSimulationService()
produce_lot_transfer_service = ProduceLotTransferService()
SPATULA_CAPACITY_G = 5.0


def _pour_fractions_proportional(
    source: list[PowderFraction],
    dest: list[PowderFraction],
    ratio: float,
    target_tool: WorkbenchTool,
) -> None:
    """Transfer `ratio` of each source fraction into dest and apply target contact impurity."""
    for fraction in source:
        to_transfer = round(fraction.mass_g * ratio, 3)
        if to_transfer <= 0:
            continue
        transferred_impurity_mg = round(fraction.impurity_mass_mg * ratio, 6)
        fraction.mass_g = round(max(fraction.mass_g - to_transfer, 0.0), 3)
        fraction.impurity_mass_mg = round(max(fraction.impurity_mass_mg - transferred_impurity_mg, 0.0), 6)
        exposure_container_ids = list(fraction.exposure_container_ids)
        if not exposure_container_ids or exposure_container_ids[-1] != target_tool.id:
            exposure_container_ids.append(target_tool.id)
        contact_impurity_mg = round(to_transfer * target_tool.contact_impurity_mg_per_g, 6)
        existing = next(
            (
                f
                for f in dest
                if f.source_lot_id == fraction.source_lot_id
                and f.exposure_container_ids == exposure_container_ids
            ),
            None,
        )
        if existing:
            existing.mass_g = round(existing.mass_g + to_transfer, 3)
            existing.impurity_mass_mg = round(existing.impurity_mass_mg + transferred_impurity_mg + contact_impurity_mg, 6)
        else:
            dest.append(
                PowderFraction(
                    id=new_id("powder"),
                    source_lot_id=fraction.source_lot_id,
                    mass_g=to_transfer,
                    impurity_mass_mg=round(transferred_impurity_mg + contact_impurity_mg, 6),
                    exposure_container_ids=exposure_container_ids,
                )
            )


def _split_fraction(fraction: PowderFraction, ratio: float) -> PowderFraction | None:
    taken_mass_g = round(fraction.mass_g * ratio, 3)
    if taken_mass_g <= 0:
        return None

    taken_impurity_mg = round(fraction.impurity_mass_mg * ratio, 6)
    fraction.mass_g = round(max(fraction.mass_g - taken_mass_g, 0.0), 3)
    fraction.impurity_mass_mg = round(max(fraction.impurity_mass_mg - taken_impurity_mg, 0.0), 6)
    return PowderFraction(
        id=new_id("powder"),
        source_lot_id=fraction.source_lot_id,
        mass_g=taken_mass_g,
        impurity_mass_mg=taken_impurity_mg,
        exposure_container_ids=list(fraction.exposure_container_ids),
    )


@dataclass(frozen=True, slots=True)
class EmptyWorkbenchRequest:
    pass


@dataclass(frozen=True, slots=True)
class WorkbenchSlotRequest:
    slot_id: str


@dataclass(frozen=True, slots=True)
class PlaceToolOnWorkbenchRequest:
    slot_id: str
    tool_id: str


@dataclass(frozen=True, slots=True)
class MoveToolBetweenWorkbenchSlotsRequest:
    source_slot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedToolToWorkbenchSlotRequest:
    trash_tool_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class DiscardToolFromPaletteRequest:
    tool_id: str


@dataclass(frozen=True, slots=True)
class DiscardSampleLabelFromPaletteRequest:
    sample_label_id: str


@dataclass(frozen=True, slots=True)
class AddLiquidToWorkbenchToolRequest:
    slot_id: str
    liquid_id: str
    volume_ml: float | None = None


@dataclass(frozen=True, slots=True)
class WorkbenchLiquidRequest:
    slot_id: str
    liquid_entry_id: str


@dataclass(frozen=True, slots=True)
class UpdateWorkbenchLiquidVolumeRequest:
    slot_id: str
    liquid_entry_id: str
    volume_ml: float


@dataclass(frozen=True, slots=True)
class AddProduceLotToWorkbenchToolRequest:
    slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class WorkbenchProduceLotRequest:
    slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class MoveProduceLotBetweenWorkbenchToolsRequest:
    source_slot_id: str
    target_slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedProduceLotToWorkbenchToolRequest:
    trash_produce_lot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class UpdateWorkbenchToolSampleLabelTextRequest:
    slot_id: str
    label_id: str
    sample_label_text: str


@dataclass(frozen=True, slots=True)
class MoveSampleLabelBetweenWorkbenchToolsRequest:
    source_slot_id: str
    target_slot_id: str
    label_id: str


@dataclass(frozen=True, slots=True)
class WorkbenchSampleLabelRequest:
    slot_id: str
    label_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedSampleLabelToWorkbenchToolRequest:
    trash_sample_label_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class PourSpatulaIntoWorkbenchToolRequest:
    slot_id: str
    delta_mass_g: float


class AddWorkbenchSlotService(WriteDomainService[EmptyWorkbenchRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: EmptyWorkbenchRequest) -> None:
        next_index = get_next_workbench_slot_index(experiment.workbench.slots)
        experiment.workbench.slots.append(
            WorkbenchSlot(
                id=f"station_{next_index}",
                label=f"Station {next_index}",
            )
        )
        experiment.audit_log.append(f"Station {next_index} added to workbench.")


class RemoveWorkbenchSlotService(WriteDomainService[WorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSlotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        if slot.tool is not None or slot.surface_produce_lots:
            raise ValueError(f"{slot.label} must be empty before it can be removed.")

        experiment.workbench.slots = [existing_slot for existing_slot in experiment.workbench.slots if existing_slot.id != slot.id]
        experiment.audit_log.append(f"{slot.label} removed from workbench.")


class PlaceToolOnWorkbenchService(WriteDomainService[PlaceToolOnWorkbenchRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: PlaceToolOnWorkbenchRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        if slot.tool is not None or slot.surface_produce_lots:
            raise ValueError(f"{slot.label} already contains a tool")

        slot.tool = build_workbench_tool(request.tool_id)
        experiment.audit_log.append(f"{slot.tool.label} placed on {slot.label}.")


class MoveToolBetweenWorkbenchSlotsService(WriteDomainService[MoveToolBetweenWorkbenchSlotsRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: MoveToolBetweenWorkbenchSlotsRequest) -> None:
        source_slot = find_workbench_slot(experiment.workbench, request.source_slot_id)
        target_slot = find_workbench_slot(experiment.workbench, request.target_slot_id)

        if source_slot.id == target_slot.id:
            return
        if source_slot.tool is None:
            raise ValueError(f"Place a tool on {source_slot.label} before moving it.")
        if target_slot.tool is not None or target_slot.surface_produce_lots:
            raise ValueError(f"{target_slot.label} already contains a tool")

        moved_tool = source_slot.tool
        source_slot.tool = None
        target_slot.tool = moved_tool
        experiment.audit_log.append(f"{moved_tool.label} moved from {source_slot.label} to {target_slot.label}.")


class DiscardWorkbenchToolService(WriteDomainService[WorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSlotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        if slot.tool is None:
            raise ValueError(f"Place a tool on {slot.label} before discarding it.")

        discarded_tool = slot.tool
        slot.tool = None
        experiment.trash.tools.append(
            TrashToolEntry(
                id=new_id("trash_tool"),
                origin_label=slot.label,
                tool=discarded_tool,
            )
        )
        experiment.audit_log.append(f"{discarded_tool.label} discarded from {slot.label}.")


class DiscardToolFromPaletteService(WriteDomainService[DiscardToolFromPaletteRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: DiscardToolFromPaletteRequest) -> None:
        discarded_tool = build_workbench_tool(request.tool_id)
        experiment.trash.tools.append(
            TrashToolEntry(
                id=new_id("trash_tool"),
                origin_label="Palette",
                tool=discarded_tool,
            )
        )
        experiment.audit_log.append(f"{discarded_tool.label} discarded from Palette.")


class DiscardSampleLabelFromPaletteService(WriteDomainService[DiscardSampleLabelFromPaletteRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: DiscardSampleLabelFromPaletteRequest) -> None:
        experiment.trash.sample_labels.append(
            TrashSampleLabelEntry(
                id=new_id("trash_sample_label"),
                origin_label="Palette",
                label=build_manual_label(text=""),
            )
        )
        experiment.audit_log.append("Manual label discarded from Palette.")


class RestoreTrashedToolToWorkbenchSlotService(WriteDomainService[RestoreTrashedToolToWorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: RestoreTrashedToolToWorkbenchSlotRequest) -> None:
        trashed_tool = find_trash_tool(experiment.trash, request.trash_tool_id)
        target_slot = find_workbench_slot(experiment.workbench, request.target_slot_id)

        if target_slot.tool is not None or target_slot.surface_produce_lots:
            raise ValueError(f"{target_slot.label} already contains a tool")

        target_slot.tool = trashed_tool.tool
        experiment.trash.tools = [entry for entry in experiment.trash.tools if entry.id != trashed_tool.id]
        experiment.audit_log.append(f"{target_slot.tool.label} restored from trash to {target_slot.label}.")


class AddLiquidToWorkbenchToolService(WriteDomainService[AddLiquidToWorkbenchToolRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: AddLiquidToWorkbenchToolRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "adding liquids")
        if not can_tool_accept_liquids(tool.tool_type):
            raise ValueError(f"{tool.label} does not accept liquids.")
        if not can_tool_receive_contents(tool.tool_type, tool.is_sealed):
            raise ValueError(f"Open {tool.label} before adding liquids.")

        liquid_definition = get_workbench_liquid_definition(request.liquid_id)
        current_volume = round_volume(sum(liquid.volume_ml for liquid in tool.liquids))
        remaining_capacity = round_volume(max(tool.capacity_ml - current_volume, 0.0))
        if remaining_capacity <= 0:
            raise ValueError(f"{tool.label} is already full.")

        requested_volume = round_volume(max(float(request.volume_ml or liquid_definition.transfer_volume_ml), 0.0))
        volume_to_add = round_volume(min(requested_volume, remaining_capacity))
        existing_liquid = next(
            (liquid for liquid in tool.liquids if liquid.liquid_id == liquid_definition.id),
            None,
        )

        if existing_liquid is None:
            tool.liquids.append(
                WorkbenchLiquid(
                    id=new_id("bench_liquid"),
                    liquid_id=liquid_definition.id,
                    name=liquid_definition.name,
                    volume_ml=round_volume(volume_to_add),
                    accent=liquid_definition.accent,
                )
            )
            updated_volume = round_volume(volume_to_add)
            existing_liquid_was_present = False
        else:
            existing_liquid.volume_ml = round_volume(existing_liquid.volume_ml + volume_to_add)
            updated_volume = existing_liquid.volume_ml
            existing_liquid_was_present = True

        if volume_to_add < requested_volume:
            if existing_liquid_was_present:
                experiment.audit_log.append(
                    f"{liquid_definition.name} increased to {format_volume(updated_volume)} mL in {tool.label} (remaining capacity)."
                )
            else:
                experiment.audit_log.append(
                    f"{liquid_definition.name} added to {tool.label} at {format_volume(updated_volume)} mL (remaining capacity)."
                )
            return

        if existing_liquid_was_present:
            experiment.audit_log.append(f"{liquid_definition.name} increased to {format_volume(updated_volume)} mL in {tool.label}.")
            return

        experiment.audit_log.append(f"{liquid_definition.name} added to {tool.label}.")


class RemoveLiquidFromWorkbenchToolService(WriteDomainService[WorkbenchLiquidRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchLiquidRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "editing liquids")
        liquid_entry = find_tool_liquid(tool, request.liquid_entry_id)
        tool.liquids = [liquid for liquid in tool.liquids if liquid.id != request.liquid_entry_id]
        experiment.audit_log.append(f"{liquid_entry.name} removed from {tool.label}.")


class UpdateWorkbenchLiquidVolumeService(WriteDomainService[UpdateWorkbenchLiquidVolumeRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: UpdateWorkbenchLiquidVolumeRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "editing liquids")
        liquid_entry = find_tool_liquid(tool, request.liquid_entry_id)

        requested_volume = round_volume(max(float(request.volume_ml), 0.0))
        occupied_by_others = sum(liquid.volume_ml for liquid in tool.liquids if liquid.id != liquid_entry.id)
        max_allowed_volume = round_volume(max(tool.capacity_ml - occupied_by_others, 0.0))
        liquid_entry.volume_ml = round_volume(min(requested_volume, max_allowed_volume))
        if liquid_entry.volume_ml <= 0:
            tool.liquids = [liquid for liquid in tool.liquids if liquid.id != request.liquid_entry_id]
            experiment.audit_log.append(f"{liquid_entry.name} removed from {tool.label}.")
            return

        experiment.audit_log.append(f"{liquid_entry.name} adjusted to {format_volume(liquid_entry.volume_ml)} mL in {tool.label}.")


class AddProduceLotToWorkbenchToolService(WriteDomainService[AddProduceLotToWorkbenchToolRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: AddProduceLotToWorkbenchToolRequest) -> None:
        transfer = produce_lot_transfer_service.transfer(
            experiment,
            WorkspaceProduceLotSource(produce_lot_id=request.produce_lot_id),
            WorkbenchProduceLotTarget(slot_id=request.slot_id),
        )
        experiment.audit_log.append(
            f"{transfer.entity.label} added to {transfer.target_label}."
            if not transfer.contamination_applied
            else f"{transfer.entity.label} placed directly on {transfer.target_label} and marked contaminated."
        )


class MoveProduceLotBetweenWorkbenchToolsService(WriteDomainService[MoveProduceLotBetweenWorkbenchToolsRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: MoveProduceLotBetweenWorkbenchToolsRequest) -> None:
        if request.source_slot_id == request.target_slot_id:
            return

        transfer = produce_lot_transfer_service.transfer(
            experiment,
            WorkbenchProduceLotSource(
                slot_id=request.source_slot_id,
                produce_lot_id=request.produce_lot_id,
            ),
            WorkbenchProduceLotTarget(slot_id=request.target_slot_id),
        )
        experiment.audit_log.append(f"{transfer.entity.label} moved from {transfer.source_label} to {transfer.target_label}.")


class DiscardProduceLotFromWorkbenchToolService(WriteDomainService[WorkbenchProduceLotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchProduceLotRequest) -> None:
        removal = WorkbenchProduceLotSource(
            slot_id=request.slot_id,
            produce_lot_id=request.produce_lot_id,
        ).remove(experiment)
        experiment.trash.produce_lots.append(
            TrashProduceLotEntry(
                id=new_id("trash_produce_lot"),
                origin_label=removal.source_label,
                produce_lot=removal.entity,
                origin=removal.origin,
            )
        )
        experiment.audit_log.append(f"{removal.entity.label} discarded from {removal.source_label}.")


class CutWorkbenchProduceLotService(WriteDomainService[WorkbenchProduceLotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchProduceLotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        produce_lot, origin_label = find_produce_lot_in_slot(slot, request.produce_lot_id)

        if slot.tool is not None and slot.tool.tool_type != "cutting_board":
            raise ValueError(f"{slot.tool.label} does not support cutting.")
        if produce_lot.cut_state != "whole":
            return

        produce_lot.cut_state = "cut"
        experiment.audit_log.append(f"{produce_lot.label} cut on {origin_label}.")


class RestoreTrashedProduceLotToWorkbenchToolService(WriteDomainService[RestoreTrashedProduceLotToWorkbenchToolRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: RestoreTrashedProduceLotToWorkbenchToolRequest) -> None:
        transfer = produce_lot_transfer_service.transfer(
            experiment,
            TrashProduceLotSource(trash_produce_lot_id=request.trash_produce_lot_id),
            WorkbenchProduceLotTarget(slot_id=request.target_slot_id),
        )
        experiment.audit_log.append(f"{transfer.entity.label} restored from trash to {transfer.location_label}.")


class ApplySampleLabelToWorkbenchToolService(WriteDomainService[WorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSlotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "adding a sample label")
        tool.labels.append(build_manual_label())
        experiment.audit_log.append(f"Manual label applied to {tool.label} on {slot.label}.")


class UpdateWorkbenchToolSampleLabelTextService(WriteDomainService[UpdateWorkbenchToolSampleLabelTextRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: UpdateWorkbenchToolSampleLabelTextRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "editing its sample label")
        label = find_tool_label(tool, request.label_id)
        if label.label_kind != "manual":
            raise ValueError("Only manual labels can be edited.")

        next_text = request.sample_label_text.strip()
        label.text = next_text
        if next_text:
            experiment.audit_log.append(f"Sample label updated to {next_text} on {tool.label}.")
            return

        experiment.audit_log.append(f"Sample label cleared on {tool.label}.")


class MoveSampleLabelBetweenWorkbenchToolsService(WriteDomainService[MoveSampleLabelBetweenWorkbenchToolsRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: MoveSampleLabelBetweenWorkbenchToolsRequest) -> None:
        source_slot = find_workbench_slot(experiment.workbench, request.source_slot_id)
        target_slot = find_workbench_slot(experiment.workbench, request.target_slot_id)

        if source_slot.id == target_slot.id:
            return
        source_tool = require_slot_tool(source_slot, "moving its sample label")
        target_tool = require_slot_tool(target_slot, "adding a sample label")
        label = pop_tool_label(source_tool, request.label_id)
        target_tool.labels.append(label)
        experiment.audit_log.append(f"Label moved from {source_tool.label} on {source_slot.label} to {target_tool.label} on {target_slot.label}.")


class DiscardSampleLabelFromWorkbenchToolService(WriteDomainService[WorkbenchSampleLabelRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSampleLabelRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "removing its sample label")
        label = pop_tool_label(tool, request.label_id)
        experiment.trash.sample_labels.append(
            TrashSampleLabelEntry(
                id=new_id("trash_sample_label"),
                origin_label=tool.label,
                label=label,
            )
        )
        experiment.audit_log.append(f"Label discarded from {tool.label}.")


class RestoreTrashedSampleLabelToWorkbenchToolService(WriteDomainService[RestoreTrashedSampleLabelToWorkbenchToolRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: RestoreTrashedSampleLabelToWorkbenchToolRequest) -> None:
        trashed_sample_label = find_trash_sample_label(experiment.trash, request.trash_sample_label_id)
        target_slot = find_workbench_slot(experiment.workbench, request.target_slot_id)

        target_tool = require_slot_tool(target_slot, "adding a sample label")
        target_tool.labels.append(trashed_sample_label.label)
        experiment.trash.sample_labels = [entry for entry in experiment.trash.sample_labels if entry.id != trashed_sample_label.id]
        experiment.audit_log.append(f"Label restored from trash to {target_tool.label} on {target_slot.label}.")


class CloseWorkbenchToolService(WriteDomainService[WorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSlotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "sealing it")
        if not can_tool_be_sealed(tool.tool_type):
            raise ValueError(f"{tool.label} cannot be sealed.")

        tool.is_sealed = True
        tool.closure_fault = None
        tool.internal_pressure_bar = max(tool.internal_pressure_bar, 1.0)
        experiment.audit_log.append(f"{tool.label} sealed on {slot.label}.")


class OpenWorkbenchToolService(WriteDomainService[WorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSlotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "opening it")
        if not can_tool_be_sealed(tool.tool_type):
            raise ValueError(f"{tool.label} cannot be opened.")

        vent_event = physical_simulation_service.vent_opened_tool(tool)
        tool.is_sealed = False
        tool.closure_fault = None
        if vent_event is not None and vent_event.lost_mass_g > 0:
            experiment.audit_log.append(
                f"{tool.label} vented at {format_volume(vent_event.pressure_bar)} bar on {slot.label}; {format_volume(vent_event.lost_mass_g)} g of powder was lost."
            )
            return

        experiment.audit_log.append(f"{tool.label} opened on {slot.label}.")


class LoadSpatulaFromWorkbenchToolService(WriteDomainService[WorkbenchSlotRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: WorkbenchSlotRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "loading the spatula")
        if tool.tool_type in {"cutting_board", "sample_vial", "cleanup_tube"}:
            raise ValueError("The spatula cannot be loaded from this container.")
        if tool.is_sealed:
            raise ValueError(f"Open {tool.label} before loading the spatula.")
        if experiment.spatula.is_loaded and sum(f.mass_g for f in experiment.spatula.loaded_fractions) > 0:
            raise ValueError("Empty the spatula before loading it again.")

        total_powder_g = sum(f.mass_g for f in tool.powder_fractions)
        if total_powder_g <= 0:
            raise ValueError(f"{tool.label} is empty.")

        # Normal distribution around 67.5% of capacity (σ = 15%), clamped to [30%, 100%]
        fill_ratio = random.gauss(mu=0.675, sigma=0.15)
        fill_ratio = max(0.30, min(1.0, fill_ratio))
        loaded_mass_g = min(
            SPATULA_CAPACITY_G,
            total_powder_g,
            round(SPATULA_CAPACITY_G * fill_ratio, 3),
        )
        if loaded_mass_g <= 0:
            raise ValueError(f"{tool.label} is empty.")

        # Proportional sampling across fractions
        take_ratio = loaded_mass_g / total_powder_g
        loaded_fractions: list[PowderFraction] = []
        for fraction in tool.powder_fractions:
            extracted_fraction = _split_fraction(fraction, take_ratio)
            if extracted_fraction is None:
                continue
            loaded_fractions.append(extracted_fraction)
        tool.powder_fractions = [f for f in tool.powder_fractions if f.mass_g > 0]

        experiment.spatula.is_loaded = True
        experiment.spatula.loaded_fractions = loaded_fractions
        experiment.spatula.source_tool_id = tool.id
        experiment.audit_log.append(f"Spatula loaded from {tool.label}.")


class PourSpatulaIntoWorkbenchToolService(WriteDomainService[PourSpatulaIntoWorkbenchToolRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: PourSpatulaIntoWorkbenchToolRequest) -> None:
        slot = find_workbench_slot(experiment.workbench, request.slot_id)
        tool = require_slot_tool(slot, "receiving powder")
        if tool.tool_type not in {"sample_vial", "centrifuge_tube"}:
            raise ValueError("The spatula can only pour into an autosampler vial or centrifuge tube.")
        if tool.is_sealed:
            raise ValueError(f"Open {tool.label} before adding powder.")
        total_loaded_g = sum(f.mass_g for f in experiment.spatula.loaded_fractions)
        if not experiment.spatula.is_loaded or total_loaded_g <= 0:
            raise ValueError("Load the spatula before pouring.")

        requested_mass_g = max(float(request.delta_mass_g), 0.0)
        if requested_mass_g <= 0:
            return

        transferred_mass_g = min(requested_mass_g, total_loaded_g)
        transfer_ratio = transferred_mass_g / total_loaded_g
        _pour_fractions_proportional(
            experiment.spatula.loaded_fractions,
            tool.powder_fractions,
            transfer_ratio,
            tool,
        )
        experiment.spatula.loaded_fractions = [f for f in experiment.spatula.loaded_fractions if f.mass_g > 0]
        if not experiment.spatula.loaded_fractions:
            experiment.spatula.is_loaded = False
            experiment.spatula.source_tool_id = None

        experiment.audit_log.append(f"Powder transferred into {tool.label}.")


class DiscardSpatulaService(WriteDomainService[None]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: None) -> None:
        total_loaded_g = sum(f.mass_g for f in experiment.spatula.loaded_fractions)
        if not experiment.spatula.is_loaded or total_loaded_g <= 0:
            raise ValueError("The spatula is already empty.")

        experiment.spatula.is_loaded = False
        experiment.spatula.loaded_fractions = []
        experiment.spatula.source_tool_id = None
        experiment.audit_log.append(f"Spatula discarded ({round(total_loaded_g, 3)} g).")
