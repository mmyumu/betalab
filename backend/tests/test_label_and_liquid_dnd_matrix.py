from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pytest

from app.services.domain_services.reception import (
    ApplyPrintedLimsLabelRequest,
    ApplyPrintedLimsLabelService,
    CreateLimsReceptionRequest,
    CreateLimsReceptionService,
    DiscardPrintedLimsLabelService,
    EmptyReceptionRequest,
    PrintLimsLabelRequest,
    PrintLimsLabelService,
)
from app.services.domain_services.workbench import (
    AddLiquidToWorkbenchToolRequest,
    AddLiquidToWorkbenchToolService,
    ApplySampleLabelToWorkbenchToolService,
    CloseWorkbenchToolService,
    DiscardSampleLabelFromPaletteRequest,
    DiscardSampleLabelFromPaletteService,
    DiscardSampleLabelFromWorkbenchToolService,
    MoveSampleLabelBetweenWorkbenchToolsRequest,
    MoveSampleLabelBetweenWorkbenchToolsService,
    PlaceToolOnWorkbenchRequest,
    PlaceToolOnWorkbenchService,
    RestoreTrashedSampleLabelToWorkbenchToolRequest,
    RestoreTrashedSampleLabelToWorkbenchToolService,
    WorkbenchSampleLabelRequest,
    WorkbenchSlotRequest,
)
from app.services.domain_services.workspace import (
    AddLiquidToWorkspaceWidgetRequest,
    AddLiquidToWorkspaceWidgetService,
    RemoveLiquidFromWorkspaceWidgetService,
    WorkspaceWidgetLiquidRequest,
)
from app.services.experiment_service import ExperimentService

LabelSource = Literal["palette_sample_label", "workbench_sample_label", "trash_sample_label", "lims_ticket"]
LabelTarget = Literal["workbench_tool", "empty_workbench", "trash"]
LiquidSource = Literal["palette_standard_liquid", "palette_dry_ice", "grinder_liquid"]
LiquidTarget = Literal["open_tube", "sealed_tube", "storage_jar", "grinder", "trash"]


@dataclass(frozen=True)
class LabelDndCase:
    source: LabelSource
    target: LabelTarget
    allowed: bool


@dataclass(frozen=True)
class LiquidDndCase:
    source: LiquidSource
    target: LiquidTarget
    allowed: bool


LABEL_DND_CASES: tuple[LabelDndCase, ...] = (
    LabelDndCase("palette_sample_label", "workbench_tool", True),
    LabelDndCase("palette_sample_label", "empty_workbench", False),
    LabelDndCase("palette_sample_label", "trash", True),
    LabelDndCase("workbench_sample_label", "workbench_tool", True),
    LabelDndCase("workbench_sample_label", "empty_workbench", False),
    LabelDndCase("workbench_sample_label", "trash", True),
    LabelDndCase("trash_sample_label", "workbench_tool", True),
    LabelDndCase("trash_sample_label", "empty_workbench", False),
    LabelDndCase("lims_ticket", "workbench_tool", True),
    LabelDndCase("lims_ticket", "empty_workbench", False),
    LabelDndCase("lims_ticket", "trash", True),
)

LIQUID_DND_CASES: tuple[LiquidDndCase, ...] = (
    LiquidDndCase("palette_standard_liquid", "open_tube", True),
    LiquidDndCase("palette_standard_liquid", "sealed_tube", False),
    LiquidDndCase("palette_standard_liquid", "storage_jar", False),
    LiquidDndCase("palette_standard_liquid", "grinder", False),
    LiquidDndCase("palette_standard_liquid", "trash", False),
    LiquidDndCase("palette_dry_ice", "open_tube", False),
    LiquidDndCase("palette_dry_ice", "sealed_tube", False),
    LiquidDndCase("palette_dry_ice", "storage_jar", False),
    LiquidDndCase("palette_dry_ice", "grinder", True),
    LiquidDndCase("palette_dry_ice", "trash", False),
    LiquidDndCase("grinder_liquid", "open_tube", False),
    LiquidDndCase("grinder_liquid", "sealed_tube", False),
    LiquidDndCase("grinder_liquid", "storage_jar", False),
    LiquidDndCase("grinder_liquid", "grinder", False),
    LiquidDndCase("grinder_liquid", "trash", True),
)


def _prepare_label_target(service: ExperimentService, experiment_id: str, target: LabelTarget) -> None:
    if target == "workbench_tool":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_2", tool_id="sealed_sampling_bag")
        )


def _prepare_label_source(service: ExperimentService, experiment_id: str, source: LabelSource) -> tuple[str | None, str | None]:
    if source == "palette_sample_label":
        return None, None
    if source == "workbench_sample_label":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="sealed_sampling_bag")
        )
        labeled = ApplySampleLabelToWorkbenchToolService(service).run(
            experiment_id, WorkbenchSlotRequest(slot_id="station_1")
        )
        assert labeled.workbench.slots[0].tool is not None
        return labeled.workbench.slots[0].tool.labels[0].id, None
    if source == "trash_sample_label":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="sealed_sampling_bag")
        )
        labeled = ApplySampleLabelToWorkbenchToolService(service).run(
            experiment_id, WorkbenchSlotRequest(slot_id="station_1")
        )
        assert labeled.workbench.slots[0].tool is not None
        discarded = DiscardSampleLabelFromWorkbenchToolService(service).run(
            experiment_id,
            WorkbenchSampleLabelRequest(
                slot_id="station_1",
                label_id=labeled.workbench.slots[0].tool.labels[0].id,
            ),
        )
        return None, discarded.trash.sample_labels[0].id
    if source == "lims_ticket":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_1", tool_id="sealed_sampling_bag")
        )
        CreateLimsReceptionService(service).run(
            experiment_id,
            CreateLimsReceptionRequest(
                orchard_name="Martin Orchard",
                harvest_date="2026-03-29",
                indicative_mass_g=2500.0,
                measured_gross_mass_g=2486.0,
                measured_sample_mass_g=10.0,
            ),
        )
        PrintLimsLabelService(service).run(experiment_id, PrintLimsLabelRequest())
        return None, None
    raise AssertionError(f"Unhandled label source: {source}")


def _execute_label_drop(
    service: ExperimentService,
    experiment_id: str,
    source: LabelSource,
    target: LabelTarget,
    label_id: str | None,
    trash_label_id: str | None,
):
    if target == "workbench_tool":
        if source == "palette_sample_label":
            return ApplySampleLabelToWorkbenchToolService(service).run(
                experiment_id, WorkbenchSlotRequest(slot_id="station_2")
            )
        if source == "workbench_sample_label":
            assert label_id is not None
            return MoveSampleLabelBetweenWorkbenchToolsService(service).run(
                experiment_id,
                MoveSampleLabelBetweenWorkbenchToolsRequest(
                    source_slot_id="station_1", target_slot_id="station_2", label_id=label_id
                ),
            )
        if source == "trash_sample_label":
            assert trash_label_id is not None
            return RestoreTrashedSampleLabelToWorkbenchToolService(service).run(
                experiment_id,
                RestoreTrashedSampleLabelToWorkbenchToolRequest(
                    trash_sample_label_id=trash_label_id, target_slot_id="station_2"
                ),
            )
        if source == "lims_ticket":
            return ApplyPrintedLimsLabelService(service).run(
                experiment_id, ApplyPrintedLimsLabelRequest(slot_id="station_2")
            )
    if target == "empty_workbench":
        if source == "palette_sample_label":
            return ApplySampleLabelToWorkbenchToolService(service).run(
                experiment_id, WorkbenchSlotRequest(slot_id="station_2")
            )
        if source == "workbench_sample_label":
            assert label_id is not None
            return MoveSampleLabelBetweenWorkbenchToolsService(service).run(
                experiment_id,
                MoveSampleLabelBetweenWorkbenchToolsRequest(
                    source_slot_id="station_1", target_slot_id="station_2", label_id=label_id
                ),
            )
        if source == "trash_sample_label":
            assert trash_label_id is not None
            return RestoreTrashedSampleLabelToWorkbenchToolService(service).run(
                experiment_id,
                RestoreTrashedSampleLabelToWorkbenchToolRequest(
                    trash_sample_label_id=trash_label_id, target_slot_id="station_2"
                ),
            )
        if source == "lims_ticket":
            return ApplyPrintedLimsLabelService(service).run(
                experiment_id, ApplyPrintedLimsLabelRequest(slot_id="station_2")
            )
    if target == "trash":
        if source == "palette_sample_label":
            return DiscardSampleLabelFromPaletteService(service).run(
                experiment_id, DiscardSampleLabelFromPaletteRequest(sample_label_id="sampling_bag_label")
            )
        if source == "workbench_sample_label":
            assert label_id is not None
            return DiscardSampleLabelFromWorkbenchToolService(service).run(
                experiment_id, WorkbenchSampleLabelRequest(slot_id="station_1", label_id=label_id)
            )
        if source == "lims_ticket":
            return DiscardPrintedLimsLabelService(service).run(experiment_id, EmptyReceptionRequest())
    raise ValueError(f"Unsupported label drop: {source} -> {target}")


@pytest.mark.parametrize(
    ("source", "target", "allowed"),
    [(case.source, case.target, case.allowed) for case in LABEL_DND_CASES],
    ids=[f"{case.source}_to_{case.target}_{'allow' if case.allowed else 'reject'}" for case in LABEL_DND_CASES],
)
def test_label_dnd_matrix(source: LabelSource, target: LabelTarget, allowed: bool) -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    _prepare_label_target(service, experiment.id, target)
    label_id, trash_label_id = _prepare_label_source(service, experiment.id, source)

    if not allowed:
        with pytest.raises(ValueError):
            _execute_label_drop(service, experiment.id, source, target, label_id, trash_label_id)
        return

    updated = _execute_label_drop(service, experiment.id, source, target, label_id, trash_label_id)
    if target == "workbench_tool":
        target_slot = next(slot for slot in updated.workbench.slots if slot.id == "station_2")
        assert target_slot.tool is not None
        assert target_slot.tool.labels
        return
    if target == "trash":
        assert updated.trash.sample_labels


def _prepare_liquid_target(service: ExperimentService, experiment_id: str, target: LiquidTarget) -> None:
    if target == "open_tube":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_2", tool_id="centrifuge_tube_50ml")
        )
        return
    if target == "sealed_tube":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_2", tool_id="centrifuge_tube_50ml")
        )
        CloseWorkbenchToolService(service).run(experiment_id, WorkbenchSlotRequest(slot_id="station_2"))
        return
    if target == "storage_jar":
        PlaceToolOnWorkbenchService(service).run(
            experiment_id, PlaceToolOnWorkbenchRequest(slot_id="station_2", tool_id="hdpe_storage_jar_2l")
        )


def _prepare_liquid_source(service: ExperimentService, experiment_id: str, source: LiquidSource) -> str | None:
    if source == "grinder_liquid":
        updated = AddLiquidToWorkspaceWidgetService(service).run(
            experiment_id,
            AddLiquidToWorkspaceWidgetRequest(widget_id="grinder", liquid_id="dry_ice_pellets"),
        )
        grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
        return grinder.liquids[0].id
    return None


def _execute_liquid_drop(
    service: ExperimentService,
    experiment_id: str,
    source: LiquidSource,
    target: LiquidTarget,
    liquid_entry_id: str | None,
):
    if source == "palette_standard_liquid" and target in {"open_tube", "sealed_tube", "storage_jar"}:
        return AddLiquidToWorkbenchToolService(service).run(
            experiment_id,
            AddLiquidToWorkbenchToolRequest(slot_id="station_2", liquid_id="acetonitrile_extraction"),
        )
    if source == "palette_dry_ice" and target == "grinder":
        return AddLiquidToWorkspaceWidgetService(service).run(
            experiment_id,
            AddLiquidToWorkspaceWidgetRequest(widget_id="grinder", liquid_id="dry_ice_pellets"),
        )
    if source == "grinder_liquid" and target == "trash":
        assert liquid_entry_id is not None
        return RemoveLiquidFromWorkspaceWidgetService(service).run(
            experiment_id,
            WorkspaceWidgetLiquidRequest(widget_id="grinder", liquid_entry_id=liquid_entry_id),
        )
    raise ValueError(f"Unsupported liquid drop: {source} -> {target}")


@pytest.mark.parametrize(
    ("source", "target", "allowed"),
    [(case.source, case.target, case.allowed) for case in LIQUID_DND_CASES],
    ids=[f"{case.source}_to_{case.target}_{'allow' if case.allowed else 'reject'}" for case in LIQUID_DND_CASES],
)
def test_liquid_dnd_matrix(source: LiquidSource, target: LiquidTarget, allowed: bool) -> None:
    service = ExperimentService()
    experiment = service.create_experiment()

    _prepare_liquid_target(service, experiment.id, target)
    liquid_entry_id = _prepare_liquid_source(service, experiment.id, source)

    if not allowed:
        with pytest.raises(ValueError):
            _execute_liquid_drop(service, experiment.id, source, target, liquid_entry_id)
        return

    updated = _execute_liquid_drop(service, experiment.id, source, target, liquid_entry_id)
    if target == "open_tube":
        slot = next(slot for slot in updated.workbench.slots if slot.id == "station_2")
        assert slot.tool is not None
        assert slot.tool.liquids
        return
    if target == "grinder":
        grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
        assert grinder.liquids
        return
    if target == "trash":
        grinder = next(widget for widget in updated.workspace.widgets if widget.id == "grinder")
        assert grinder.liquids == []
