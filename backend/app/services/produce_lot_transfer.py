from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.domain.models import Experiment, ProduceLot
from app.domain.rules import can_tool_accept_produce, can_tool_receive_contents
from app.services.command_handlers.support import (
    find_trash_produce_lot,
    find_workbench_slot,
    find_workspace_produce_lot,
    find_workspace_widget,
)


@dataclass(frozen=True, slots=True)
class ProduceLotRemoval:
    produce_lot: ProduceLot
    source_label: str


@dataclass(frozen=True, slots=True)
class ProduceLotPlacement:
    target_label: str
    location_label: str
    contamination_applied: bool = False


@dataclass(frozen=True, slots=True)
class ProduceLotTransferResult:
    produce_lot: ProduceLot
    source_label: str
    target_label: str
    location_label: str
    contamination_applied: bool = False


class ProduceLotSource(Protocol):
    def remove(self, experiment: Experiment) -> ProduceLotRemoval: ...


class ProduceLotTarget(Protocol):
    def validate(self, experiment: Experiment) -> None: ...

    def place(self, experiment: Experiment, produce_lot: ProduceLot) -> ProduceLotPlacement: ...


class ProduceLotTransferService:
    def transfer(
        self,
        experiment: Experiment,
        source: ProduceLotSource,
        target: ProduceLotTarget,
    ) -> ProduceLotTransferResult:
        target.validate(experiment)
        removal = source.remove(experiment)
        placement = target.place(experiment, removal.produce_lot)
        return ProduceLotTransferResult(
            produce_lot=removal.produce_lot,
            source_label=removal.source_label,
            target_label=placement.target_label,
            location_label=placement.location_label,
            contamination_applied=placement.contamination_applied,
        )


@dataclass(frozen=True, slots=True)
class WorkspaceProduceLotSource:
    produce_lot_id: str

    def remove(self, experiment: Experiment) -> ProduceLotRemoval:
        produce_lot = find_workspace_produce_lot(experiment.workspace, self.produce_lot_id)
        experiment.workspace.produce_lots = [
            lot for lot in experiment.workspace.produce_lots if lot.id != produce_lot.id
        ]
        return ProduceLotRemoval(produce_lot=produce_lot, source_label="Produce basket")


@dataclass(frozen=True, slots=True)
class WorkbenchProduceLotSource:
    slot_id: str
    produce_lot_id: str

    def remove(self, experiment: Experiment) -> ProduceLotRemoval:
        slot = find_workbench_slot(experiment.workbench, self.slot_id)
        produce_lot = None
        source_label = slot.label

        if slot.tool is not None:
            produce_lot = next((lot for lot in slot.tool.produce_lots if lot.id == self.produce_lot_id), None)
            if produce_lot is not None:
                slot.tool.produce_lots = [lot for lot in slot.tool.produce_lots if lot.id != produce_lot.id]
                source_label = slot.tool.label

        if produce_lot is None:
            produce_lot = next((lot for lot in slot.surface_produce_lots if lot.id == self.produce_lot_id), None)
            if produce_lot is None:
                raise ValueError("Unknown produce lot")
            slot.surface_produce_lots = [lot for lot in slot.surface_produce_lots if lot.id != produce_lot.id]

        return ProduceLotRemoval(produce_lot=produce_lot, source_label=source_label)


@dataclass(frozen=True, slots=True)
class GrinderProduceLotSource:
    widget_id: str
    produce_lot_id: str

    def remove(self, experiment: Experiment) -> ProduceLotRemoval:
        widget = _find_grinder_widget(experiment, self.widget_id)
        produce_lot = next((lot for lot in widget.produce_lots if lot.id == self.produce_lot_id), None)
        if produce_lot is None:
            raise ValueError("Unknown produce lot")

        widget.produce_lots = [lot for lot in widget.produce_lots if lot.id != produce_lot.id]
        return ProduceLotRemoval(produce_lot=produce_lot, source_label=widget.label)


@dataclass(frozen=True, slots=True)
class TrashProduceLotSource:
    trash_produce_lot_id: str

    def remove(self, experiment: Experiment) -> ProduceLotRemoval:
        trashed_produce_lot = find_trash_produce_lot(experiment.trash, self.trash_produce_lot_id)
        experiment.trash.produce_lots = [
            entry for entry in experiment.trash.produce_lots if entry.id != trashed_produce_lot.id
        ]
        return ProduceLotRemoval(
            produce_lot=trashed_produce_lot.produce_lot,
            source_label=trashed_produce_lot.origin_label,
        )


@dataclass(frozen=True, slots=True)
class GrinderProduceLotTarget:
    widget_id: str

    def validate(self, experiment: Experiment) -> None:
        widget = _find_grinder_widget(experiment, self.widget_id)
        if widget.produce_lots:
            raise ValueError(f"{widget.label} already contains a produce lot.")

    def place(self, experiment: Experiment, produce_lot: ProduceLot) -> ProduceLotPlacement:
        widget = _find_grinder_widget(experiment, self.widget_id)
        widget.produce_lots.append(produce_lot)
        return ProduceLotPlacement(target_label=widget.label, location_label=widget.label)


@dataclass(frozen=True, slots=True)
class WorkbenchProduceLotTarget:
    slot_id: str
    allowed_tool_types: frozenset[str] | None = None

    def validate(self, experiment: Experiment) -> None:
        slot = find_workbench_slot(experiment.workbench, self.slot_id)
        if slot.tool is None:
            if slot.surface_produce_lots:
                raise ValueError(f"{slot.label} already contains a produce lot.")
            return

        if self.allowed_tool_types is None:
            if not can_tool_accept_produce(slot.tool.tool_type):
                raise ValueError(f"{slot.tool.label} does not accept produce.")
        elif slot.tool.tool_type not in self.allowed_tool_types:
            raise ValueError(f"{slot.tool.label} does not accept produce.")

        if not can_tool_receive_contents(slot.tool.tool_type, slot.tool.is_sealed):
            raise ValueError(f"Open {slot.tool.label} before adding produce.")

        if slot.tool.produce_lots:
            raise ValueError(f"{slot.tool.label} already contains a produce lot.")

    def place(self, experiment: Experiment, produce_lot: ProduceLot) -> ProduceLotPlacement:
        slot = find_workbench_slot(experiment.workbench, self.slot_id)
        if slot.tool is None:
            slot.surface_produce_lots.append(produce_lot)
            produce_lot.is_contaminated = True
            return ProduceLotPlacement(
                target_label=slot.label,
                location_label=slot.label,
                contamination_applied=True,
            )

        slot.tool.produce_lots.append(produce_lot)
        return ProduceLotPlacement(
            target_label=slot.tool.label,
            location_label=f"{slot.tool.label} on {slot.label}",
        )


def _find_grinder_widget(experiment: Experiment, widget_id: str):
    widget = find_workspace_widget(experiment.workspace, widget_id)
    if widget.id != "grinder" or widget.widget_type != "cryogenic_grinder":
        raise ValueError(f"{widget.label} does not accept grinder contents.")
    return widget
