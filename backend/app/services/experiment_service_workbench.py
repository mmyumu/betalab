from __future__ import annotations

from collections.abc import Callable
from typing import Protocol, TypeVar

from app.domain.models import Experiment
from app.schemas.experiment import ExperimentSchema
from app.services.command_handlers.trash import (
    discard_sample_label_from_palette,
    discard_tool_from_palette,
    restore_trashed_produce_lot_to_workbench_tool,
    restore_trashed_tool_to_workbench_slot,
)
from app.services.command_handlers.workbench import (
    add_liquid_to_workbench_tool,
    add_produce_lot_to_workbench_tool,
    add_workbench_slot,
    apply_sample_label_to_workbench_tool,
    close_workbench_tool,
    cut_workbench_produce_lot,
    discard_produce_lot_from_workbench_tool,
    discard_sample_label_from_workbench_tool,
    load_spatula_from_workbench_tool,
    move_produce_lot_between_workbench_tools,
    move_sample_label_between_workbench_tools,
    move_tool_between_workbench_slots,
    open_workbench_tool,
    place_tool_on_workbench,
    pour_spatula_into_workbench_tool,
    remove_liquid_from_workbench_tool,
    remove_workbench_slot,
    restore_trashed_sample_label_to_workbench_tool,
    update_workbench_liquid_volume,
    update_workbench_tool_sample_label_text,
)
from app.services.commands import (
    AddLiquidToWorkbenchToolCommand,
    AddProduceLotToWorkbenchToolCommand,
    ApplySampleLabelToWorkbenchToolCommand,
    CloseWorkbenchToolCommand,
    DiscardSampleLabelFromPaletteCommand,
    DiscardToolFromPaletteCommand,
    LoadSpatulaFromWorkbenchToolCommand,
    MoveProduceLotBetweenWorkbenchToolsCommand,
    MoveSampleLabelBetweenWorkbenchToolsCommand,
    MoveToolBetweenWorkbenchSlotsCommand,
    OpenWorkbenchToolCommand,
    PlaceToolOnWorkbenchCommand,
    PourSpatulaIntoWorkbenchToolCommand,
    RestoreTrashedProduceLotToWorkbenchToolCommand,
    RestoreTrashedSampleLabelToWorkbenchToolCommand,
    RestoreTrashedToolToWorkbenchSlotCommand,
    UpdateWorkbenchLiquidVolumeCommand,
    UpdateWorkbenchToolSampleLabelTextCommand,
    WorkbenchLiquidCommand,
    WorkbenchProduceLotCommand,
    WorkbenchSampleLabelCommand,
    WorkbenchSlotCommand,
)

CommandT = TypeVar("CommandT")


class ExperimentServiceWorkbenchRuntime(Protocol):
    def _apply_command(
        self,
        experiment_id: str,
        handler: Callable[[Experiment, CommandT], None],
        command: CommandT,
    ) -> ExperimentSchema: ...

    def _get_default_tool_label_id(self, experiment_id: str, slot_id: str) -> str: ...

    def _persist_mutation_and_to_schema(self, experiment: Experiment) -> ExperimentSchema: ...

    def _require_experiment(self, experiment_id: str) -> Experiment: ...

    def _advance_experiment_to_now(self, experiment: Experiment) -> bool: ...


class ExperimentServiceWorkbenchMixin:
    def add_workbench_slot(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str
    ) -> ExperimentSchema:
        experiment = self._require_experiment(experiment_id)
        self._advance_experiment_to_now(experiment)
        add_workbench_slot(experiment)
        return self._persist_mutation_and_to_schema(experiment)

    def remove_workbench_slot(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, slot_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            remove_workbench_slot,
            WorkbenchSlotCommand(slot_id=slot_id),
        )

    def place_tool_on_workbench(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        tool_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            place_tool_on_workbench,
            PlaceToolOnWorkbenchCommand(slot_id=slot_id, tool_id=tool_id),
        )

    def move_tool_between_workbench_slots(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        source_slot_id: str,
        target_slot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_tool_between_workbench_slots,
            MoveToolBetweenWorkbenchSlotsCommand(
                source_slot_id=source_slot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def discard_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, slot_id: str
    ) -> ExperimentSchema:
        from app.services.command_handlers.trash import discard_workbench_tool

        return self._apply_command(
            experiment_id,
            discard_workbench_tool,
            WorkbenchSlotCommand(slot_id=slot_id),
        )

    def discard_tool_from_palette(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, tool_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_tool_from_palette,
            DiscardToolFromPaletteCommand(tool_id=tool_id),
        )

    def discard_sample_label_from_palette(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, sample_label_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_sample_label_from_palette,
            DiscardSampleLabelFromPaletteCommand(sample_label_id=sample_label_id),
        )

    def restore_trashed_tool_to_workbench_slot(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        trash_tool_id: str,
        target_slot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_tool_to_workbench_slot,
            RestoreTrashedToolToWorkbenchSlotCommand(
                trash_tool_id=trash_tool_id,
                target_slot_id=target_slot_id,
            ),
        )

    def add_liquid_to_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        liquid_id: str,
        volume_ml: float | None = None,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_liquid_to_workbench_tool,
            AddLiquidToWorkbenchToolCommand(
                slot_id=slot_id,
                liquid_id=liquid_id,
                volume_ml=volume_ml,
            ),
        )

    def add_produce_lot_to_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            add_produce_lot_to_workbench_tool,
            AddProduceLotToWorkbenchToolCommand(
                slot_id=slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def discard_produce_lot_from_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_produce_lot_from_workbench_tool,
            WorkbenchProduceLotCommand(slot_id=slot_id, produce_lot_id=produce_lot_id),
        )

    def cut_workbench_produce_lot(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            cut_workbench_produce_lot,
            WorkbenchProduceLotCommand(slot_id=slot_id, produce_lot_id=produce_lot_id),
        )

    def move_produce_lot_between_workbench_tools(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        source_slot_id: str,
        target_slot_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_produce_lot_between_workbench_tools,
            MoveProduceLotBetweenWorkbenchToolsCommand(
                source_slot_id=source_slot_id,
                target_slot_id=target_slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def restore_trashed_produce_lot_to_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        trash_produce_lot_id: str,
        target_slot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_produce_lot_to_workbench_tool,
            RestoreTrashedProduceLotToWorkbenchToolCommand(
                trash_produce_lot_id=trash_produce_lot_id,
                target_slot_id=target_slot_id,
            ),
        )

    def remove_liquid_from_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        liquid_entry_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            remove_liquid_from_workbench_tool,
            WorkbenchLiquidCommand(slot_id=slot_id, liquid_entry_id=liquid_entry_id),
        )

    def update_workbench_liquid_volume(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        liquid_entry_id: str,
        volume_ml: float,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            update_workbench_liquid_volume,
            UpdateWorkbenchLiquidVolumeCommand(
                slot_id=slot_id,
                liquid_entry_id=liquid_entry_id,
                volume_ml=volume_ml,
            ),
        )

    def apply_sample_label_to_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, slot_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            apply_sample_label_to_workbench_tool,
            ApplySampleLabelToWorkbenchToolCommand(slot_id=slot_id),
        )

    def close_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, slot_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            close_workbench_tool,
            CloseWorkbenchToolCommand(slot_id=slot_id),
        )

    def open_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, slot_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            open_workbench_tool,
            OpenWorkbenchToolCommand(slot_id=slot_id),
        )

    def load_spatula_from_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime, experiment_id: str, slot_id: str
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            load_spatula_from_workbench_tool,
            LoadSpatulaFromWorkbenchToolCommand(slot_id=slot_id),
        )

    def pour_spatula_into_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        delta_mass_g: float,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            pour_spatula_into_workbench_tool,
            PourSpatulaIntoWorkbenchToolCommand(
                slot_id=slot_id,
                delta_mass_g=delta_mass_g,
            ),
        )

    def update_workbench_tool_sample_label_text(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        label_id_or_text: str,
        sample_label_text: str | None = None,
    ) -> ExperimentSchema:
        if sample_label_text is None:
            resolved_label_id = self._get_default_tool_label_id(experiment_id, slot_id)
            resolved_sample_label_text = label_id_or_text
        else:
            resolved_label_id = label_id_or_text
            resolved_sample_label_text = sample_label_text
        return self._apply_command(
            experiment_id,
            update_workbench_tool_sample_label_text,
            UpdateWorkbenchToolSampleLabelTextCommand(
                slot_id=slot_id,
                label_id=resolved_label_id,
                sample_label_text=resolved_sample_label_text,
            ),
        )

    def move_sample_label_between_workbench_tools(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        source_slot_id: str,
        target_slot_id: str,
        label_id: str | None = None,
    ) -> ExperimentSchema:
        resolved_label_id = label_id or self._get_default_tool_label_id(
            experiment_id, source_slot_id
        )
        return self._apply_command(
            experiment_id,
            move_sample_label_between_workbench_tools,
            MoveSampleLabelBetweenWorkbenchToolsCommand(
                source_slot_id=source_slot_id,
                target_slot_id=target_slot_id,
                label_id=resolved_label_id,
            ),
        )

    def discard_sample_label_from_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        slot_id: str,
        label_id: str | None = None,
    ) -> ExperimentSchema:
        resolved_label_id = label_id or self._get_default_tool_label_id(
            experiment_id, slot_id
        )
        return self._apply_command(
            experiment_id,
            discard_sample_label_from_workbench_tool,
            WorkbenchSampleLabelCommand(slot_id=slot_id, label_id=resolved_label_id),
        )

    def restore_trashed_sample_label_to_workbench_tool(
        self: ExperimentServiceWorkbenchRuntime,
        experiment_id: str,
        trash_sample_label_id: str,
        target_slot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_sample_label_to_workbench_tool,
            RestoreTrashedSampleLabelToWorkbenchToolCommand(
                trash_sample_label_id=trash_sample_label_id,
                target_slot_id=target_slot_id,
            ),
        )
