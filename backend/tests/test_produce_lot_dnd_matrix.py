from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pytest

from app.services.experiment_service import ExperimentService

SourceKind = Literal["basket", "workbench_surface", "workbench_tool", "grinder", "trash", "gross_balance"]
TargetKind = Literal[
    "workbench_surface",
    "open_sample_bag",
    "sealed_sample_bag",
    "open_storage_jar",
    "sealed_storage_jar",
    "cutting_board",
    "empty_grinder",
    "occupied_grinder",
    "empty_gross_balance",
    "gross_balance_bag",
    "sealed_gross_balance_bag",
    "trash",
]


@dataclass(frozen=True)
class ProduceLotDndCase:
    source: SourceKind
    target: TargetKind
    allowed: bool


PRODUCE_LOT_DND_CASES: tuple[ProduceLotDndCase, ...] = (
    ProduceLotDndCase("basket", "workbench_surface", True),
    ProduceLotDndCase("basket", "open_sample_bag", True),
    ProduceLotDndCase("basket", "sealed_sample_bag", False),
    ProduceLotDndCase("basket", "open_storage_jar", True),
    ProduceLotDndCase("basket", "sealed_storage_jar", False),
    ProduceLotDndCase("basket", "cutting_board", True),
    ProduceLotDndCase("basket", "empty_grinder", True),
    ProduceLotDndCase("basket", "occupied_grinder", False),
    ProduceLotDndCase("basket", "empty_gross_balance", True),
    ProduceLotDndCase("basket", "gross_balance_bag", True),
    ProduceLotDndCase("basket", "sealed_gross_balance_bag", False),
    ProduceLotDndCase("basket", "trash", True),
    ProduceLotDndCase("workbench_surface", "workbench_surface", True),
    ProduceLotDndCase("workbench_surface", "open_sample_bag", True),
    ProduceLotDndCase("workbench_surface", "sealed_sample_bag", False),
    ProduceLotDndCase("workbench_surface", "open_storage_jar", True),
    ProduceLotDndCase("workbench_surface", "sealed_storage_jar", False),
    ProduceLotDndCase("workbench_surface", "cutting_board", True),
    ProduceLotDndCase("workbench_surface", "empty_grinder", True),
    ProduceLotDndCase("workbench_surface", "occupied_grinder", False),
    ProduceLotDndCase("workbench_surface", "empty_gross_balance", True),
    ProduceLotDndCase("workbench_surface", "gross_balance_bag", True),
    ProduceLotDndCase("workbench_surface", "sealed_gross_balance_bag", False),
    ProduceLotDndCase("workbench_surface", "trash", True),
    ProduceLotDndCase("workbench_tool", "workbench_surface", True),
    ProduceLotDndCase("workbench_tool", "open_sample_bag", True),
    ProduceLotDndCase("workbench_tool", "sealed_sample_bag", False),
    ProduceLotDndCase("workbench_tool", "open_storage_jar", True),
    ProduceLotDndCase("workbench_tool", "sealed_storage_jar", False),
    ProduceLotDndCase("workbench_tool", "cutting_board", True),
    ProduceLotDndCase("workbench_tool", "empty_grinder", True),
    ProduceLotDndCase("workbench_tool", "occupied_grinder", False),
    ProduceLotDndCase("workbench_tool", "empty_gross_balance", True),
    ProduceLotDndCase("workbench_tool", "gross_balance_bag", True),
    ProduceLotDndCase("workbench_tool", "sealed_gross_balance_bag", False),
    ProduceLotDndCase("workbench_tool", "trash", True),
    ProduceLotDndCase("grinder", "workbench_surface", True),
    ProduceLotDndCase("grinder", "open_sample_bag", True),
    ProduceLotDndCase("grinder", "sealed_sample_bag", False),
    ProduceLotDndCase("grinder", "open_storage_jar", True),
    ProduceLotDndCase("grinder", "sealed_storage_jar", False),
    ProduceLotDndCase("grinder", "cutting_board", True),
    ProduceLotDndCase("grinder", "empty_gross_balance", True),
    ProduceLotDndCase("grinder", "gross_balance_bag", True),
    ProduceLotDndCase("grinder", "sealed_gross_balance_bag", False),
    ProduceLotDndCase("grinder", "trash", True),
    ProduceLotDndCase("trash", "workbench_surface", True),
    ProduceLotDndCase("trash", "open_sample_bag", True),
    ProduceLotDndCase("trash", "sealed_sample_bag", False),
    ProduceLotDndCase("trash", "open_storage_jar", True),
    ProduceLotDndCase("trash", "sealed_storage_jar", False),
    ProduceLotDndCase("trash", "cutting_board", True),
    ProduceLotDndCase("trash", "empty_grinder", True),
    ProduceLotDndCase("trash", "occupied_grinder", False),
    ProduceLotDndCase("trash", "empty_gross_balance", True),
    ProduceLotDndCase("trash", "gross_balance_bag", True),
    ProduceLotDndCase("trash", "sealed_gross_balance_bag", False),
    ProduceLotDndCase("gross_balance", "workbench_surface", True),
    ProduceLotDndCase("gross_balance", "open_sample_bag", True),
    ProduceLotDndCase("gross_balance", "sealed_sample_bag", False),
    ProduceLotDndCase("gross_balance", "open_storage_jar", True),
    ProduceLotDndCase("gross_balance", "sealed_storage_jar", False),
    ProduceLotDndCase("gross_balance", "cutting_board", True),
    ProduceLotDndCase("gross_balance", "empty_grinder", True),
    ProduceLotDndCase("gross_balance", "occupied_grinder", False),
    ProduceLotDndCase("gross_balance", "trash", True),
)


def _create_basket_lot(service: ExperimentService, experiment_id: str) -> str:
    created = service.create_produce_lot(experiment_id, "apple")
    return created.workspace.produce_basket_lots[0].id


def _prepare_target(service: ExperimentService, experiment_id: str, target: TargetKind) -> None:
    if target == "open_sample_bag":
        service.place_tool_on_workbench(experiment_id, "station_2", "sealed_sampling_bag")
        return
    if target == "sealed_sample_bag":
        service.place_tool_on_workbench(experiment_id, "station_2", "sealed_sampling_bag")
        service.close_workbench_tool(experiment_id, "station_2")
        return
    if target == "open_storage_jar":
        service.place_tool_on_workbench(experiment_id, "station_2", "hdpe_storage_jar_2l")
        return
    if target == "sealed_storage_jar":
        service.place_tool_on_workbench(experiment_id, "station_2", "hdpe_storage_jar_2l")
        service.close_workbench_tool(experiment_id, "station_2")
        return
    if target == "cutting_board":
        service.place_tool_on_workbench(experiment_id, "station_2", "cutting_board_hdpe")
        return
    if target == "occupied_grinder":
        occupying_lot_id = _create_basket_lot(service, experiment_id)
        service.add_workspace_produce_lot_to_widget(experiment_id, "grinder", occupying_lot_id)
        return
    if target == "gross_balance_bag":
        service.place_tool_on_gross_balance(experiment_id, "sealed_sampling_bag")
        return
    if target == "sealed_gross_balance_bag":
        service.place_tool_on_gross_balance(experiment_id, "sealed_sampling_bag")
        service.close_gross_balance_tool(experiment_id)


def _prepare_source(service: ExperimentService, experiment_id: str, source: SourceKind) -> tuple[str, str | None]:
    produce_lot_id = _create_basket_lot(service, experiment_id)

    if source == "basket":
        return produce_lot_id, None
    if source == "workbench_surface":
        service.add_produce_lot_to_workbench_tool(experiment_id, "station_1", produce_lot_id)
        return produce_lot_id, None
    if source == "workbench_tool":
        service.place_tool_on_workbench(experiment_id, "station_1", "cutting_board_hdpe")
        service.add_produce_lot_to_workbench_tool(experiment_id, "station_1", produce_lot_id)
        return produce_lot_id, None
    if source == "grinder":
        service.add_workspace_produce_lot_to_widget(experiment_id, "grinder", produce_lot_id)
        return produce_lot_id, None
    if source == "trash":
        discarded = service.discard_workspace_produce_lot(experiment_id, produce_lot_id)
        return produce_lot_id, discarded.trash.produce_lots[0].id
    if source == "gross_balance":
        service.move_workspace_produce_lot_to_gross_balance(experiment_id, produce_lot_id)
        return produce_lot_id, None

    raise AssertionError(f"Unhandled source kind: {source}")


def _execute_drop(
    service: ExperimentService,
    experiment_id: str,
    source: SourceKind,
    target: TargetKind,
    produce_lot_id: str,
    trash_produce_lot_id: str | None,
):
    if target in {
        "workbench_surface",
        "open_sample_bag",
        "sealed_sample_bag",
        "open_storage_jar",
        "sealed_storage_jar",
        "cutting_board",
    }:
        if source == "basket":
            return service.add_produce_lot_to_workbench_tool(experiment_id, "station_2", produce_lot_id)
        if source in {"workbench_surface", "workbench_tool"}:
            return service.move_produce_lot_between_workbench_tools(
                experiment_id,
                "station_1",
                "station_2",
                produce_lot_id,
            )
        if source == "grinder":
            return service.move_widget_produce_lot_to_workbench_tool(
                experiment_id,
                "grinder",
                produce_lot_id,
                "station_2",
            )
        if source == "trash":
            assert trash_produce_lot_id is not None
            return service.restore_trashed_produce_lot_to_workbench_tool(
                experiment_id,
                trash_produce_lot_id,
                "station_2",
            )
        if source == "gross_balance":
            return service.move_gross_balance_produce_lot_to_workbench(
                experiment_id,
                "station_2",
                produce_lot_id,
            )

    if target in {"empty_grinder", "occupied_grinder"}:
        if source == "basket":
            return service.add_workspace_produce_lot_to_widget(experiment_id, "grinder", produce_lot_id)
        if source in {"workbench_surface", "workbench_tool"}:
            return service.move_workbench_produce_lot_to_widget(
                experiment_id,
                "grinder",
                "station_1",
                produce_lot_id,
            )
        if source == "trash":
            assert trash_produce_lot_id is not None
            return service.restore_trashed_produce_lot_to_widget(experiment_id, trash_produce_lot_id, "grinder")
        if source == "gross_balance":
            return service.move_gross_balance_produce_lot_to_widget(experiment_id, "grinder", produce_lot_id)

    if target in {"empty_gross_balance", "gross_balance_bag", "sealed_gross_balance_bag"}:
        if source == "basket":
            return service.move_workspace_produce_lot_to_gross_balance(experiment_id, produce_lot_id)
        if source in {"workbench_surface", "workbench_tool"}:
            return service.move_workbench_produce_lot_to_gross_balance(experiment_id, "station_1", produce_lot_id)
        if source == "grinder":
            return service.move_widget_produce_lot_to_gross_balance(experiment_id, "grinder", produce_lot_id)
        if source == "trash":
            assert trash_produce_lot_id is not None
            return service.restore_trashed_produce_lot_to_gross_balance(experiment_id, trash_produce_lot_id)

    if target == "trash":
        if source == "basket":
            return service.discard_workspace_produce_lot(experiment_id, produce_lot_id)
        if source in {"workbench_surface", "workbench_tool"}:
            return service.discard_produce_lot_from_workbench_tool(experiment_id, "station_1", produce_lot_id)
        if source == "grinder":
            return service.discard_widget_produce_lot(experiment_id, "grinder", produce_lot_id)
        if source == "gross_balance":
            return service.discard_gross_balance_produce_lot(experiment_id, produce_lot_id)

    raise AssertionError(f"Unhandled drop case: {source} -> {target}")


@pytest.mark.parametrize(
    ("source", "target", "allowed"),
    [(case.source, case.target, case.allowed) for case in PRODUCE_LOT_DND_CASES],
    ids=[f"{case.source}_to_{case.target}_{'allow' if case.allowed else 'reject'}" for case in PRODUCE_LOT_DND_CASES],
)
def test_produce_lot_dnd_matrix(source: SourceKind, target: TargetKind, allowed: bool) -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    _prepare_target(service, experiment.id, target)
    produce_lot_id, trash_produce_lot_id = _prepare_source(service, experiment.id, source)

    if not allowed:
        with pytest.raises(ValueError):
            _execute_drop(service, experiment.id, source, target, produce_lot_id, trash_produce_lot_id)
        return

    updated = _execute_drop(service, experiment.id, source, target, produce_lot_id, trash_produce_lot_id)

    if target == "trash":
        assert updated.trash.produce_lots[-1].produce_lot.id == produce_lot_id
        return

    if target in {
        "workbench_surface",
        "open_sample_bag",
        "sealed_sample_bag",
        "open_storage_jar",
        "sealed_storage_jar",
        "cutting_board",
    }:
        target_slot = next(slot for slot in updated.workbench.slots if slot.id == "station_2")
        if target == "workbench_surface":
            assert [lot.id for lot in target_slot.surface_produce_lots] == [produce_lot_id]
            return
        assert target_slot.tool is not None
        assert [lot.id for lot in target_slot.tool.produce_lots] == [produce_lot_id]
        return

    if target in {"empty_grinder", "occupied_grinder"}:
        grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
        assert [lot.id for lot in grinder.produce_lots][-1] == produce_lot_id
        return

    if target in {"empty_gross_balance", "gross_balance_bag", "sealed_gross_balance_bag"}:
        gross_balance = next(widget for widget in updated.workspace.widgets if widget.id == "gross_balance")
        if gross_balance.tool is not None:
            assert [lot.id for lot in gross_balance.tool.produce_lots] == [produce_lot_id]
            return
        assert [lot.id for lot in gross_balance.produce_lots] == [produce_lot_id]
