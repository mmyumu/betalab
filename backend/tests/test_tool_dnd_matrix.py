from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pytest

from app.services.experiment_service import ExperimentService

ToolSource = Literal[
    "palette_vial",
    "palette_storage_jar",
    "basket_bag",
    "workbench_vial",
    "workbench_storage_jar",
    "rack_vial",
    "trash_vial",
    "trash_storage_jar",
    "gross_balance_vial",
]
ToolTarget = Literal["empty_workbench", "occupied_workbench", "empty_rack", "occupied_rack", "gross_balance", "trash"]


@dataclass(frozen=True)
class ToolDndCase:
    source: ToolSource
    target: ToolTarget
    allowed: bool


TOOL_DND_CASES: tuple[ToolDndCase, ...] = (
    ToolDndCase("palette_vial", "empty_workbench", True),
    ToolDndCase("palette_vial", "occupied_workbench", False),
    ToolDndCase("palette_vial", "empty_rack", True),
    ToolDndCase("palette_vial", "occupied_rack", False),
    ToolDndCase("palette_vial", "gross_balance", True),
    ToolDndCase("palette_vial", "trash", True),
    ToolDndCase("palette_storage_jar", "empty_workbench", True),
    ToolDndCase("palette_storage_jar", "occupied_workbench", False),
    ToolDndCase("palette_storage_jar", "empty_rack", False),
    ToolDndCase("palette_storage_jar", "occupied_rack", False),
    ToolDndCase("palette_storage_jar", "gross_balance", True),
    ToolDndCase("palette_storage_jar", "trash", True),
    ToolDndCase("basket_bag", "empty_workbench", True),
    ToolDndCase("basket_bag", "occupied_workbench", False),
    ToolDndCase("basket_bag", "empty_rack", False),
    ToolDndCase("basket_bag", "occupied_rack", False),
    ToolDndCase("basket_bag", "gross_balance", True),
    ToolDndCase("basket_bag", "trash", True),
    ToolDndCase("workbench_vial", "empty_workbench", True),
    ToolDndCase("workbench_vial", "occupied_workbench", False),
    ToolDndCase("workbench_vial", "empty_rack", True),
    ToolDndCase("workbench_vial", "occupied_rack", False),
    ToolDndCase("workbench_vial", "gross_balance", True),
    ToolDndCase("workbench_vial", "trash", True),
    ToolDndCase("workbench_storage_jar", "empty_workbench", True),
    ToolDndCase("workbench_storage_jar", "occupied_workbench", False),
    ToolDndCase("workbench_storage_jar", "empty_rack", False),
    ToolDndCase("workbench_storage_jar", "occupied_rack", False),
    ToolDndCase("workbench_storage_jar", "gross_balance", True),
    ToolDndCase("workbench_storage_jar", "trash", True),
    ToolDndCase("rack_vial", "empty_workbench", True),
    ToolDndCase("rack_vial", "occupied_workbench", False),
    ToolDndCase("rack_vial", "empty_rack", True),
    ToolDndCase("rack_vial", "occupied_rack", False),
    ToolDndCase("rack_vial", "gross_balance", True),
    ToolDndCase("rack_vial", "trash", True),
    ToolDndCase("trash_vial", "empty_workbench", True),
    ToolDndCase("trash_vial", "occupied_workbench", False),
    ToolDndCase("trash_vial", "empty_rack", True),
    ToolDndCase("trash_vial", "occupied_rack", False),
    ToolDndCase("trash_vial", "gross_balance", True),
    ToolDndCase("trash_storage_jar", "empty_workbench", True),
    ToolDndCase("trash_storage_jar", "occupied_workbench", False),
    ToolDndCase("trash_storage_jar", "empty_rack", False),
    ToolDndCase("trash_storage_jar", "occupied_rack", False),
    ToolDndCase("trash_storage_jar", "gross_balance", True),
    ToolDndCase("gross_balance_vial", "empty_workbench", True),
    ToolDndCase("gross_balance_vial", "occupied_workbench", False),
    ToolDndCase("gross_balance_vial", "empty_rack", True),
    ToolDndCase("gross_balance_vial", "occupied_rack", False),
    ToolDndCase("gross_balance_vial", "trash", True),
)


def _tool_id_for_source(source: ToolSource) -> str:
    if source in {"palette_vial", "workbench_vial", "rack_vial", "trash_vial", "gross_balance_vial"}:
        return "sample_vial_lcms"
    if source in {"palette_storage_jar", "workbench_storage_jar", "trash_storage_jar"}:
        return "hdpe_storage_jar_2l"
    if source == "basket_bag":
        return "sealed_sampling_bag"
    raise AssertionError(f"Unhandled source: {source}")


def _prepare_target(service: ExperimentService, experiment_id: str, target: ToolTarget) -> None:
    if target == "occupied_workbench":
        service.place_tool_on_workbench(experiment_id, "station_2", "sample_vial_lcms")
        return
    if target == "occupied_rack":
        service.place_tool_in_rack_slot(experiment_id, "rack_slot_2", "sample_vial_lcms")


def _prepare_source(service: ExperimentService, experiment_id: str, source: ToolSource) -> str | None:
    tool_id = _tool_id_for_source(source)
    if source.startswith("palette_"):
        return None
    if source == "basket_bag":
        return None
    if source.startswith("workbench_"):
        service.place_tool_on_workbench(experiment_id, "station_1", tool_id)
        return None
    if source == "rack_vial":
        service.place_tool_in_rack_slot(experiment_id, "rack_slot_1", tool_id)
        return None
    if source.startswith("trash_"):
        service.place_tool_on_workbench(experiment_id, "station_1", tool_id)
        discarded = service.discard_workbench_tool(experiment_id, "station_1")
        return discarded.trash.tools[0].id
    if source == "gross_balance_vial":
        service.place_tool_on_gross_balance(experiment_id, tool_id)
        return None
    raise AssertionError(f"Unhandled source: {source}")


def _execute_drop(
    service: ExperimentService,
    experiment_id: str,
    source: ToolSource,
    target: ToolTarget,
    trash_tool_id: str | None,
):
    tool_id = _tool_id_for_source(source)
    if target in {"empty_workbench", "occupied_workbench"}:
        if source.startswith("palette_"):
            return service.place_tool_on_workbench(experiment_id, "station_2", tool_id)
        if source == "basket_bag":
            return service.place_received_bag_on_workbench(experiment_id, "station_2")
        if source.startswith("workbench_"):
            return service.move_tool_between_workbench_slots(experiment_id, "station_1", "station_2")
        if source == "rack_vial":
            return service.remove_rack_tool_to_workbench_slot(experiment_id, "rack_slot_1", "station_2")
        if source.startswith("trash_"):
            assert trash_tool_id is not None
            return service.restore_trashed_tool_to_workbench_slot(experiment_id, trash_tool_id, "station_2")
        if source == "gross_balance_vial":
            return service.move_gross_balance_tool_to_workbench(experiment_id, "station_2")
    if target in {"empty_rack", "occupied_rack"}:
        if source.startswith("palette_"):
            return service.place_tool_in_rack_slot(experiment_id, "rack_slot_2", tool_id)
        if source == "workbench_vial":
            return service.place_workbench_tool_in_rack_slot(experiment_id, "station_1", "rack_slot_2")
        if source == "rack_vial":
            return service.move_rack_tool_between_slots(experiment_id, "rack_slot_1", "rack_slot_2")
        if source == "trash_vial":
            assert trash_tool_id is not None
            return service.restore_trashed_tool_to_rack_slot(experiment_id, trash_tool_id, "rack_slot_2")
        if source == "gross_balance_vial":
            return service.move_gross_balance_tool_to_rack(experiment_id, "rack_slot_2")
    if target == "gross_balance":
        if source.startswith("palette_"):
            return service.place_tool_on_gross_balance(experiment_id, tool_id)
        if source == "basket_bag":
            return service.move_basket_tool_to_gross_balance(experiment_id)
        if source.startswith("workbench_"):
            return service.move_workbench_tool_to_gross_balance(experiment_id, "station_1")
        if source == "rack_vial":
            return service.move_rack_tool_to_gross_balance(experiment_id, "rack_slot_1")
        if source.startswith("trash_"):
            assert trash_tool_id is not None
            return service.restore_trashed_tool_to_gross_balance(experiment_id, trash_tool_id)
    if target == "trash":
        if source.startswith("palette_"):
            return service.discard_tool_from_palette(experiment_id, tool_id)
        if source == "basket_bag":
            return service.discard_basket_tool(experiment_id)
        if source.startswith("workbench_"):
            return service.discard_workbench_tool(experiment_id, "station_1")
        if source == "rack_vial":
            return service.discard_rack_tool(experiment_id, "rack_slot_1")
        if source == "gross_balance_vial":
            return service.discard_gross_balance_tool(experiment_id)
    raise ValueError(f"Unsupported tool drop: {source} -> {target}")


@pytest.mark.parametrize(
    ("source", "target", "allowed"),
    [(case.source, case.target, case.allowed) for case in TOOL_DND_CASES],
    ids=[f"{case.source}_to_{case.target}_{'allow' if case.allowed else 'reject'}" for case in TOOL_DND_CASES],
)
def test_tool_dnd_matrix(source: ToolSource, target: ToolTarget, allowed: bool) -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    _prepare_target(service, experiment.id, target)
    trash_tool_id = _prepare_source(service, experiment.id, source)

    if not allowed:
        with pytest.raises(ValueError):
            _execute_drop(service, experiment.id, source, target, trash_tool_id)
        return

    updated = _execute_drop(service, experiment.id, source, target, trash_tool_id)

    if target in {"empty_workbench", "occupied_workbench"}:
        assert next(slot for slot in updated.workbench.slots if slot.id == "station_2").tool is not None
        return
    if target in {"empty_rack", "occupied_rack"}:
        assert next(slot for slot in updated.rack.slots if slot.id == "rack_slot_2").tool is not None
        return
    if target == "gross_balance":
        gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
        assert gross_balance.tool is not None
        return
    if target == "trash":
        assert updated.trash.tools
