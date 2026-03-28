from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CreateProduceLotCommand:
    produce_type: str


@dataclass(frozen=True, slots=True)
class AddWorkspaceProduceLotToWidgetCommand:
    widget_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class MoveWorkbenchProduceLotToWidgetCommand:
    widget_id: str
    source_slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedProduceLotToWidgetCommand:
    trash_produce_lot_id: str
    widget_id: str


@dataclass(frozen=True, slots=True)
class DiscardWorkspaceProduceLotCommand:
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class MoveWidgetProduceLotToWorkbenchToolCommand:
    widget_id: str
    produce_lot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class DiscardWidgetProduceLotCommand:
    widget_id: str
    produce_lot_id: str
