from __future__ import annotations

from app.domain.models import ContainerLabel, WorkbenchLiquid, WorkbenchSlot, WorkbenchTool, new_id
from app.domain.workbench_catalog import get_workbench_tool_definition
from app.services.helpers.lookups import find_tool_label


def require_slot_tool(slot: WorkbenchSlot, action: str) -> WorkbenchTool:
    if slot.tool is None:
        raise ValueError(f"Place a tool on {slot.label} before {action}.")
    return slot.tool


def find_tool_liquid(tool: WorkbenchTool, liquid_entry_id: str) -> WorkbenchLiquid:
    liquid_entry = next(
        (liquid for liquid in tool.liquids if liquid.id == liquid_entry_id),
        None,
    )
    if liquid_entry is None:
        raise ValueError("Unknown workbench liquid")
    return liquid_entry


def pop_tool_label(tool: WorkbenchTool, label_id: str) -> ContainerLabel:
    label = find_tool_label(tool, label_id)
    tool.labels = [entry for entry in tool.labels if entry.id != label.id]
    return label


def find_produce_lot_in_slot(slot: WorkbenchSlot, produce_lot_id: str):
    if slot.tool is not None and slot.tool.produce_lots:
        produce_lot = next(
            (lot for lot in slot.tool.produce_lots if lot.id == produce_lot_id),
            None,
        )
        if produce_lot is not None:
            return produce_lot, slot.tool.label

    produce_lot = next(
        (lot for lot in slot.surface_produce_lots if lot.id == produce_lot_id),
        None,
    )
    if produce_lot is None:
        raise ValueError("Unknown produce lot")

    return produce_lot, slot.label


def get_next_workbench_slot_index(slots: list[WorkbenchSlot]) -> int:
    existing_indices = []
    for slot in slots:
        if slot.id.startswith("station_"):
            suffix = slot.id.removeprefix("station_")
            if suffix.isdigit():
                existing_indices.append(int(suffix))

    return (max(existing_indices) if existing_indices else 0) + 1


def build_workbench_tool(tool_id: str) -> WorkbenchTool:
    tool_definition = get_workbench_tool_definition(tool_id)
    return WorkbenchTool(
        id=new_id("bench_tool"),
        tool_id=tool_definition.id,
        label=tool_definition.name,
        subtitle=tool_definition.subtitle,
        accent=tool_definition.accent,
        tool_type=tool_definition.tool_type,
        capacity_ml=tool_definition.capacity_ml,
        is_sealed=False,
        closure_fault=None,
        labels=[],
        produce_lots=[],
        liquids=[],
        powder_fractions=[],
    )
