from __future__ import annotations

from dataclasses import asdict
from typing import Callable, TypeVar

from app.domain.models import Experiment
from app.schemas.experiment import ExperimentSchema
from app.services.command_handlers.rack import (
    move_rack_tool_between_slots,
    place_tool_in_rack_slot,
    place_workbench_tool_in_rack_slot,
    remove_rack_tool_to_workbench_slot,
)
from app.services.command_handlers.trash import (
    discard_sample_label_from_palette,
    discard_tool_from_palette,
    discard_rack_tool,
    discard_workbench_tool,
    restore_trashed_produce_lot_to_workbench_tool,
    restore_trashed_tool_to_rack_slot,
    restore_trashed_tool_to_workbench_slot,
)
from app.services.command_handlers.workbench import (
    add_workbench_slot,
    apply_sample_label_to_workbench_tool,
    add_produce_lot_to_workbench_tool,
    add_liquid_to_workbench_tool,
    discard_sample_label_from_workbench_tool,
    discard_produce_lot_from_workbench_tool,
    cut_workbench_produce_lot,
    move_sample_label_between_workbench_tools,
    move_produce_lot_between_workbench_tools,
    move_tool_between_workbench_slots,
    place_tool_on_workbench,
    remove_workbench_slot,
    remove_liquid_from_workbench_tool,
    restore_trashed_sample_label_to_workbench_tool,
    update_workbench_tool_sample_label_text,
    update_workbench_liquid_volume,
)
from app.services.command_handlers.workspace import (
    add_liquid_to_workspace_widget,
    add_workspace_produce_lot_to_widget,
    add_workspace_widget,
    advance_workspace_cryogenics,
    create_produce_lot,
    complete_grinder_cycle,
    discard_widget_produce_lot,
    discard_workspace_produce_lot,
    move_widget_produce_lot_to_workbench_tool,
    discard_workspace_widget,
    move_workbench_produce_lot_to_widget,
    move_workspace_widget,
    remove_liquid_from_workspace_widget,
    restore_trashed_produce_lot_to_widget,
    update_workspace_widget_liquid_volume,
)
from app.services.commands import (
    AddLiquidToWorkbenchToolCommand,
    AddLiquidToWorkspaceWidgetCommand,
    AddProduceLotToWorkbenchToolCommand,
    AddWorkspaceProduceLotToWidgetCommand,
    AdvanceWorkspaceCryogenicsCommand,
    ApplySampleLabelToWorkbenchToolCommand,
    CreateProduceLotCommand,
    DiscardSampleLabelFromPaletteCommand,
    DiscardToolFromPaletteCommand,
    DiscardWidgetProduceLotCommand,
    DiscardWorkspaceProduceLotCommand,
    MoveProduceLotBetweenWorkbenchToolsCommand,
    MoveRackToolBetweenSlotsCommand,
    MoveWorkbenchProduceLotToWidgetCommand,
    MoveSampleLabelBetweenWorkbenchToolsCommand,
    MoveToolBetweenWorkbenchSlotsCommand,
    MoveWidgetProduceLotToWorkbenchToolCommand,
    PlaceToolOnWorkbenchCommand,
    PlaceWorkbenchToolInRackSlotCommand,
    RackSlotCommand,
    RackSlotToolCommand,
    RemoveRackToolToWorkbenchSlotCommand,
    RestoreTrashedProduceLotToWidgetCommand,
    RestoreTrashedProduceLotToWorkbenchToolCommand,
    RestoreTrashedSampleLabelToWorkbenchToolCommand,
    RestoreTrashedToolToRackSlotCommand,
    RestoreTrashedToolToWorkbenchSlotCommand,
    UpdateWorkbenchLiquidVolumeCommand,
    UpdateWorkbenchToolSampleLabelTextCommand,
    UpdateWorkspaceWidgetLiquidVolumeCommand,
    WorkbenchLiquidCommand,
    WorkbenchProduceLotCommand,
    WorkbenchSlotCommand,
    WorkspaceWidgetCommand,
    WorkspaceWidgetLayoutCommand,
    WorkspaceWidgetLiquidCommand,
)
from app.services.experiment_factory import build_experiment

CommandT = TypeVar("CommandT")


class ExperimentNotFoundError(KeyError):
    pass


class ExperimentService:
    def __init__(self) -> None:
        self._experiments: dict[str, Experiment] = {}

    def create_experiment(self) -> ExperimentSchema:
        experiment = build_experiment()
        self._experiments[experiment.id] = experiment
        return self._to_schema(experiment)

    def get_experiment(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)
        return self._to_schema(experiment)

    def add_workbench_slot(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._require_experiment(experiment_id)
        add_workbench_slot(experiment)
        return self._to_schema(experiment)

    def remove_workbench_slot(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            remove_workbench_slot,
            WorkbenchSlotCommand(slot_id=slot_id),
        )

    def place_tool_on_workbench(self, experiment_id: str, slot_id: str, tool_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            place_tool_on_workbench,
            PlaceToolOnWorkbenchCommand(slot_id=slot_id, tool_id=tool_id),
        )

    def move_tool_between_workbench_slots(self, experiment_id: str, source_slot_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_tool_between_workbench_slots,
            MoveToolBetweenWorkbenchSlotsCommand(
                source_slot_id=source_slot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def discard_workbench_tool(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_workbench_tool,
            WorkbenchSlotCommand(slot_id=slot_id),
        )

    def discard_tool_from_palette(self, experiment_id: str, tool_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_tool_from_palette,
            DiscardToolFromPaletteCommand(tool_id=tool_id),
        )

    def discard_sample_label_from_palette(self, experiment_id: str, sample_label_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_sample_label_from_palette,
            DiscardSampleLabelFromPaletteCommand(sample_label_id=sample_label_id),
        )

    def restore_trashed_tool_to_workbench_slot(self, experiment_id: str, trash_tool_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_tool_to_workbench_slot,
            RestoreTrashedToolToWorkbenchSlotCommand(
                trash_tool_id=trash_tool_id,
                target_slot_id=target_slot_id,
            ),
        )

    def add_workspace_widget(self, experiment_id: str, widget_id: str, anchor: str, offset_x: int, offset_y: int) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_workspace_widget,
            WorkspaceWidgetLayoutCommand(
                widget_id=widget_id,
                anchor=anchor,
                offset_x=offset_x,
                offset_y=offset_y,
            ),
        )

    def move_workspace_widget(self, experiment_id: str, widget_id: str, anchor: str, offset_x: int, offset_y: int) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_workspace_widget,
            WorkspaceWidgetLayoutCommand(
                widget_id=widget_id,
                anchor=anchor,
                offset_x=offset_x,
                offset_y=offset_y,
            ),
        )

    def discard_workspace_widget(self, experiment_id: str, widget_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_workspace_widget,
            WorkspaceWidgetCommand(widget_id=widget_id),
        )

    def add_liquid_to_workspace_widget(self, experiment_id: str, widget_id: str, liquid_id: str, volume_ml: float | None = None) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_liquid_to_workspace_widget,
            AddLiquidToWorkspaceWidgetCommand(
                widget_id=widget_id,
                liquid_id=liquid_id,
                volume_ml=volume_ml,
            ),
        )

    def update_workspace_widget_liquid_volume(self, experiment_id: str, widget_id: str, liquid_entry_id: str, volume_ml: float) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            update_workspace_widget_liquid_volume,
            UpdateWorkspaceWidgetLiquidVolumeCommand(
                widget_id=widget_id,
                liquid_entry_id=liquid_entry_id,
                volume_ml=volume_ml,
            ),
        )

    def remove_liquid_from_workspace_widget(self, experiment_id: str, widget_id: str, liquid_entry_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            remove_liquid_from_workspace_widget,
            WorkspaceWidgetLiquidCommand(
                widget_id=widget_id,
                liquid_entry_id=liquid_entry_id,
            ),
        )

    def complete_grinder_cycle(self, experiment_id: str, widget_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            complete_grinder_cycle,
            WorkspaceWidgetCommand(widget_id=widget_id),
        )

    def advance_workspace_cryogenics(self, experiment_id: str, elapsed_ms: float) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            advance_workspace_cryogenics,
            AdvanceWorkspaceCryogenicsCommand(elapsed_ms=elapsed_ms),
        )

    def add_workspace_produce_lot_to_widget(self, experiment_id: str, widget_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_workspace_produce_lot_to_widget,
            AddWorkspaceProduceLotToWidgetCommand(widget_id=widget_id, produce_lot_id=produce_lot_id),
        )

    def move_workbench_produce_lot_to_widget(self, experiment_id: str, widget_id: str, source_slot_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_workbench_produce_lot_to_widget,
            MoveWorkbenchProduceLotToWidgetCommand(
                widget_id=widget_id,
                source_slot_id=source_slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def restore_trashed_produce_lot_to_widget(self, experiment_id: str, trash_produce_lot_id: str, widget_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_produce_lot_to_widget,
            RestoreTrashedProduceLotToWidgetCommand(
                trash_produce_lot_id=trash_produce_lot_id,
                widget_id=widget_id,
            ),
        )

    def create_produce_lot(self, experiment_id: str, produce_type: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            create_produce_lot,
            CreateProduceLotCommand(produce_type=produce_type),
        )

    def discard_workspace_produce_lot(self, experiment_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_workspace_produce_lot,
            DiscardWorkspaceProduceLotCommand(produce_lot_id=produce_lot_id),
        )

    def move_widget_produce_lot_to_workbench_tool(self, experiment_id: str, widget_id: str, produce_lot_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_widget_produce_lot_to_workbench_tool,
            MoveWidgetProduceLotToWorkbenchToolCommand(
                widget_id=widget_id,
                produce_lot_id=produce_lot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def discard_widget_produce_lot(self, experiment_id: str, widget_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_widget_produce_lot,
            DiscardWidgetProduceLotCommand(widget_id=widget_id, produce_lot_id=produce_lot_id),
        )

    def place_tool_in_rack_slot(self, experiment_id: str, rack_slot_id: str, tool_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            place_tool_in_rack_slot,
            RackSlotToolCommand(rack_slot_id=rack_slot_id, tool_id=tool_id),
        )

    def place_workbench_tool_in_rack_slot(self, experiment_id: str, source_slot_id: str, rack_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            place_workbench_tool_in_rack_slot,
            PlaceWorkbenchToolInRackSlotCommand(
                source_slot_id=source_slot_id,
                rack_slot_id=rack_slot_id,
            ),
        )

    def move_rack_tool_between_slots(self, experiment_id: str, source_rack_slot_id: str, target_rack_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_rack_tool_between_slots,
            MoveRackToolBetweenSlotsCommand(
                source_rack_slot_id=source_rack_slot_id,
                target_rack_slot_id=target_rack_slot_id,
            ),
        )

    def remove_rack_tool_to_workbench_slot(self, experiment_id: str, rack_slot_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            remove_rack_tool_to_workbench_slot,
            RemoveRackToolToWorkbenchSlotCommand(
                rack_slot_id=rack_slot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def discard_rack_tool(self, experiment_id: str, rack_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_rack_tool,
            RackSlotCommand(rack_slot_id=rack_slot_id),
        )

    def restore_trashed_tool_to_rack_slot(self, experiment_id: str, trash_tool_id: str, rack_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_tool_to_rack_slot,
            RestoreTrashedToolToRackSlotCommand(
                trash_tool_id=trash_tool_id,
                rack_slot_id=rack_slot_id,
            ),
        )

    def add_liquid_to_workbench_tool(self, experiment_id: str, slot_id: str, liquid_id: str, volume_ml: float | None = None) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_liquid_to_workbench_tool,
            AddLiquidToWorkbenchToolCommand(
                slot_id=slot_id,
                liquid_id=liquid_id,
                volume_ml=volume_ml,
            ),
        )

    def add_produce_lot_to_workbench_tool(self, experiment_id: str, slot_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_produce_lot_to_workbench_tool,
            AddProduceLotToWorkbenchToolCommand(
                slot_id=slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def discard_produce_lot_from_workbench_tool(self, experiment_id: str, slot_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_produce_lot_from_workbench_tool,
            WorkbenchProduceLotCommand(slot_id=slot_id, produce_lot_id=produce_lot_id),
        )

    def cut_workbench_produce_lot(self, experiment_id: str, slot_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            cut_workbench_produce_lot,
            WorkbenchProduceLotCommand(slot_id=slot_id, produce_lot_id=produce_lot_id),
        )

    def move_produce_lot_between_workbench_tools(self, experiment_id: str, source_slot_id: str, target_slot_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_produce_lot_between_workbench_tools,
            MoveProduceLotBetweenWorkbenchToolsCommand(
                source_slot_id=source_slot_id,
                target_slot_id=target_slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def restore_trashed_produce_lot_to_workbench_tool(self, experiment_id: str, trash_produce_lot_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_produce_lot_to_workbench_tool,
            RestoreTrashedProduceLotToWorkbenchToolCommand(
                trash_produce_lot_id=trash_produce_lot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def remove_liquid_from_workbench_tool(self, experiment_id: str, slot_id: str, liquid_entry_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            remove_liquid_from_workbench_tool,
            WorkbenchLiquidCommand(slot_id=slot_id, liquid_entry_id=liquid_entry_id),
        )

    def update_workbench_liquid_volume(self, experiment_id: str, slot_id: str, liquid_entry_id: str, volume_ml: float) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            update_workbench_liquid_volume,
            UpdateWorkbenchLiquidVolumeCommand(
                slot_id=slot_id,
                liquid_entry_id=liquid_entry_id,
                volume_ml=volume_ml,
            ),
        )

    def apply_sample_label_to_workbench_tool(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            apply_sample_label_to_workbench_tool,
            ApplySampleLabelToWorkbenchToolCommand(slot_id=slot_id),
        )

    def update_workbench_tool_sample_label_text(self, experiment_id: str, slot_id: str, sample_label_text: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            update_workbench_tool_sample_label_text,
            UpdateWorkbenchToolSampleLabelTextCommand(
                slot_id=slot_id,
                sample_label_text=sample_label_text,
            ),
        )

    def move_sample_label_between_workbench_tools(self, experiment_id: str, source_slot_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_sample_label_between_workbench_tools,
            MoveSampleLabelBetweenWorkbenchToolsCommand(
                source_slot_id=source_slot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def discard_sample_label_from_workbench_tool(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_sample_label_from_workbench_tool,
            WorkbenchSlotCommand(slot_id=slot_id),
        )

    def restore_trashed_sample_label_to_workbench_tool(self, experiment_id: str, trash_sample_label_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_sample_label_to_workbench_tool,
            RestoreTrashedSampleLabelToWorkbenchToolCommand(
                trash_sample_label_id=trash_sample_label_id,
                target_slot_id=target_slot_id,
            ),
        )

    def _require_experiment(self, experiment_id: str) -> Experiment:
        experiment = self._experiments.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)
        return experiment

    def _apply_command(
        self,
        experiment_id: str,
        handler: Callable[[Experiment, CommandT], None],
        command: CommandT,
    ) -> ExperimentSchema:
        experiment = self._require_experiment(experiment_id)
        handler(experiment, command)
        return self._to_schema(experiment)

    def _to_schema(self, experiment: Experiment) -> ExperimentSchema:
        return ExperimentSchema.model_validate(
            {
                "id": experiment.id,
                "status": experiment.status.value,
                "workbench": asdict(experiment.workbench),
                "rack": asdict(experiment.rack),
                "trash": asdict(experiment.trash),
                "workspace": asdict(experiment.workspace),
                "audit_log": experiment.audit_log,
            }
        )
