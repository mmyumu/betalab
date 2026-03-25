from __future__ import annotations

from app.domain.models import (
    ProduceLot,
    Rack,
    RackSlot,
    Trash,
    TrashProduceLotEntry,
    TrashToolEntry,
    Workspace,
    WorkspaceWidget,
    Workbench,
    WorkbenchSlot,
)


def find_workbench_slot(workbench: Workbench, slot_id: str) -> WorkbenchSlot:
    slot = next((entry for entry in workbench.slots if entry.id == slot_id), None)
    if slot is None:
        raise ValueError("Unknown workbench slot")
    return slot


def find_rack_slot(rack: Rack, slot_id: str) -> RackSlot:
    slot = next((entry for entry in rack.slots if entry.id == slot_id), None)
    if slot is None:
        raise ValueError("Unknown rack slot")
    return slot


def find_trash_tool(trash: Trash, trash_tool_id: str) -> TrashToolEntry:
    tool = next((entry for entry in trash.tools if entry.id == trash_tool_id), None)
    if tool is None:
        raise ValueError("Unknown trash tool")
    return tool


def find_trash_produce_lot(trash: Trash, trash_produce_lot_id: str) -> TrashProduceLotEntry:
    produce_lot = next((entry for entry in trash.produce_lots if entry.id == trash_produce_lot_id), None)
    if produce_lot is None:
        raise ValueError("Unknown trash produce lot")
    return produce_lot


def find_workspace_widget(workspace: Workspace, widget_id: str) -> WorkspaceWidget:
    widget = next((entry for entry in workspace.widgets if entry.id == widget_id), None)
    if widget is None:
        raise ValueError("Unknown workspace widget")
    return widget


def find_workspace_produce_lot(workspace: Workspace, produce_lot_id: str) -> ProduceLot:
    produce_lot = next((entry for entry in workspace.produce_lots if entry.id == produce_lot_id), None)
    if produce_lot is None:
        raise ValueError("Unknown produce lot")
    return produce_lot


def round_volume(volume_ml: float) -> float:
    return round(volume_ml, 3)


def format_volume(volume_ml: float) -> str:
    return f"{round_volume(volume_ml):g}"
