from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from typing import Callable, TypeVar

from app.domain.models import Experiment
from app.schemas.experiment import ExperimentListEntrySchema, ExperimentSchema
from app.services.experiment_repository import ExperimentRepository, InMemoryExperimentRepository
from app.services.command_handlers.rack import (
    move_rack_tool_between_slots,
    place_tool_in_rack_slot,
    place_workbench_tool_in_rack_slot,
    remove_rack_tool_to_workbench_slot,
)
from app.services.command_handlers.trash import (
    discard_basket_tool,
    discard_sample_label_from_palette,
    discard_tool_from_palette,
    discard_rack_tool,
    discard_workbench_tool,
    restore_trashed_produce_lot_to_workbench_tool,
    restore_trashed_tool_to_rack_slot,
    restore_trashed_tool_to_workbench_slot,
)
from app.services.command_handlers.debug import (
    create_debug_produce_lot_on_workbench,
    create_debug_produce_lot_to_widget,
)
from app.services.command_handlers.gross_balance import (
    close_gross_balance_tool,
    discard_gross_balance_produce_lot,
    discard_gross_balance_tool,
    move_basket_tool_to_gross_balance,
    place_tool_on_gross_balance,
    move_gross_balance_produce_lot_to_widget,
    move_gross_balance_produce_lot_to_workbench,
    move_gross_balance_tool_to_rack,
    move_gross_balance_tool_to_workbench,
    move_rack_tool_to_gross_balance,
    move_widget_produce_lot_to_gross_balance,
    move_workbench_produce_lot_to_gross_balance,
    move_workbench_tool_to_gross_balance,
    move_workspace_produce_lot_to_gross_balance,
    open_gross_balance_tool,
    restore_trashed_produce_lot_to_gross_balance,
    restore_trashed_tool_to_gross_balance,
)
from app.services.command_handlers.reception import (
    apply_printed_lims_label_to_gross_balance_bag,
    apply_printed_lims_label_to_basket_bag,
    apply_printed_lims_label,
    create_lims_reception,
    discard_printed_lims_label,
    place_received_bag_on_workbench,
    print_lims_label,
    record_gross_weight,
    set_gross_mass_offset,
)
from app.services.command_handlers.workbench import (
    add_workbench_slot,
    apply_sample_label_to_workbench_tool,
    add_produce_lot_to_workbench_tool,
    add_liquid_to_workbench_tool,
    close_workbench_tool,
    load_spatula_from_workbench_tool,
    open_workbench_tool,
    pour_spatula_into_workbench_tool,
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
    create_received_sampling_bag,
    create_produce_lot,
    complete_grinder_cycle,
    start_grinder_cycle,
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
    ApplyPrintedLimsLabelCommand,
    ApplyPrintedLimsLabelToGrossBalanceBagCommand,
    ApplyPrintedLimsLabelToBasketBagCommand,
    ApplySampleLabelToWorkbenchToolCommand,
    CloseGrossBalanceToolCommand,
    CloseWorkbenchToolCommand,
    CreateLimsReceptionCommand,
    CreateDebugProduceLotOnWorkbenchCommand,
    CreateDebugProduceLotToWidgetCommand,
    CreateReceivedSamplingBagCommand,
    CreateProduceLotCommand,
    DiscardBasketToolCommand,
    DiscardGrossBalanceProduceLotCommand,
    DiscardGrossBalanceToolCommand,
    DiscardPrintedLimsLabelCommand,
    DiscardSampleLabelFromPaletteCommand,
    DiscardToolFromPaletteCommand,
    DiscardWidgetProduceLotCommand,
    DiscardWorkspaceProduceLotCommand,
    MoveBasketToolToGrossBalanceCommand,
    MoveGrossBalanceProduceLotToWidgetCommand,
    MoveGrossBalanceProduceLotToWorkbenchCommand,
    MoveGrossBalanceToolToRackCommand,
    MoveGrossBalanceToolToWorkbenchCommand,
    MoveProduceLotBetweenWorkbenchToolsCommand,
    MoveRackToolBetweenSlotsCommand,
    MoveRackToolToGrossBalanceCommand,
    MoveWorkbenchProduceLotToWidgetCommand,
    MoveWorkbenchProduceLotToGrossBalanceCommand,
    MoveSampleLabelBetweenWorkbenchToolsCommand,
    MoveToolBetweenWorkbenchSlotsCommand,
    MoveWorkbenchToolToGrossBalanceCommand,
    LoadSpatulaFromWorkbenchToolCommand,
    PourSpatulaIntoWorkbenchToolCommand,
    MoveWidgetProduceLotToWorkbenchToolCommand,
    MoveWidgetProduceLotToGrossBalanceCommand,
    MoveWorkspaceProduceLotToGrossBalanceCommand,
    OpenGrossBalanceToolCommand,
    OpenWorkbenchToolCommand,
    PlaceReceivedBagOnWorkbenchCommand,
    PlaceToolOnGrossBalanceCommand,
    PlaceToolOnWorkbenchCommand,
    PlaceWorkbenchToolInRackSlotCommand,
    PrintLimsLabelCommand,
    RackSlotCommand,
    RackSlotToolCommand,
    RecordGrossWeightCommand,
    SetGrossMassOffsetCommand,
    RemoveRackToolToWorkbenchSlotCommand,
    RestoreTrashedProduceLotToGrossBalanceCommand,
    RestoreTrashedProduceLotToWidgetCommand,
    RestoreTrashedProduceLotToWorkbenchToolCommand,
    RestoreTrashedSampleLabelToWorkbenchToolCommand,
    RestoreTrashedToolToGrossBalanceCommand,
    RestoreTrashedToolToRackSlotCommand,
    RestoreTrashedToolToWorkbenchSlotCommand,
    UpdateWorkbenchLiquidVolumeCommand,
    WorkbenchSampleLabelCommand,
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
    def __init__(self, repository: ExperimentRepository | None = None) -> None:
        self._experiments: dict[str, Experiment] = {}
        self._repository = repository or InMemoryExperimentRepository()
        self._now_fn: Callable[[], datetime] = lambda: datetime.now(timezone.utc)

    def create_experiment(self) -> ExperimentSchema:
        experiment = build_experiment()
        experiment.last_simulation_at = self._now_fn()
        self._experiments[experiment.id] = experiment
        return self._persist_mutation_and_to_schema(experiment)

    def list_experiments(self) -> list[ExperimentListEntrySchema]:
        return self._repository.list()

    def delete_experiment(self, experiment_id: str) -> None:
        self._experiments.pop(experiment_id, None)
        deleted = self._repository.delete(experiment_id)
        if not deleted:
            raise ExperimentNotFoundError(experiment_id)

    def get_experiment(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._require_experiment(experiment_id)
        did_advance = self._advance_experiment_to_now(experiment)
        if did_advance:
            return self._persist_mutation_and_to_schema(experiment)
        return self._to_schema(experiment)

    def add_workbench_slot(self, experiment_id: str) -> ExperimentSchema:
        experiment = self._require_experiment(experiment_id)
        self._advance_experiment_to_now(experiment)
        add_workbench_slot(experiment)
        return self._persist_mutation_and_to_schema(experiment)

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

    def discard_basket_tool(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_basket_tool,
            DiscardBasketToolCommand(),
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

    def start_grinder_cycle(self, experiment_id: str, widget_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            start_grinder_cycle,
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
        experiment = self._require_experiment(experiment_id)
        self._advance_experiment_to_now(experiment)
        if experiment.basket_tool is None:
            create_received_sampling_bag(experiment, CreateReceivedSamplingBagCommand())
            return self._persist_mutation_and_to_schema(experiment)
        return self._apply_command(
            experiment_id,
            create_produce_lot,
            CreateProduceLotCommand(produce_type=produce_type),
        )

    def place_received_bag_on_workbench(self, experiment_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            place_received_bag_on_workbench,
            PlaceReceivedBagOnWorkbenchCommand(target_slot_id=target_slot_id),
        )

    def record_gross_weight(
        self,
        experiment_id: str,
        measured_gross_mass_g: float | None = None,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            record_gross_weight,
            RecordGrossWeightCommand(measured_gross_mass_g=measured_gross_mass_g),
        )

    def set_gross_mass_offset(
        self,
        experiment_id: str,
        gross_mass_offset_g: int,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            set_gross_mass_offset,
            SetGrossMassOffsetCommand(gross_mass_offset_g=gross_mass_offset_g),
        )

    def move_workbench_tool_to_gross_balance(self, experiment_id: str, source_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_workbench_tool_to_gross_balance,
            MoveWorkbenchToolToGrossBalanceCommand(source_slot_id=source_slot_id),
        )

    def move_basket_tool_to_gross_balance(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_basket_tool_to_gross_balance,
            MoveBasketToolToGrossBalanceCommand(),
        )

    def place_tool_on_gross_balance(self, experiment_id: str, tool_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            place_tool_on_gross_balance,
            PlaceToolOnGrossBalanceCommand(tool_id=tool_id),
        )

    def move_rack_tool_to_gross_balance(self, experiment_id: str, rack_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_rack_tool_to_gross_balance,
            MoveRackToolToGrossBalanceCommand(rack_slot_id=rack_slot_id),
        )

    def restore_trashed_tool_to_gross_balance(self, experiment_id: str, trash_tool_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_tool_to_gross_balance,
            RestoreTrashedToolToGrossBalanceCommand(trash_tool_id=trash_tool_id),
        )

    def move_gross_balance_tool_to_workbench(self, experiment_id: str, target_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_gross_balance_tool_to_workbench,
            MoveGrossBalanceToolToWorkbenchCommand(target_slot_id=target_slot_id),
        )

    def move_gross_balance_tool_to_rack(self, experiment_id: str, rack_slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_gross_balance_tool_to_rack,
            MoveGrossBalanceToolToRackCommand(rack_slot_id=rack_slot_id),
        )

    def discard_gross_balance_tool(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_gross_balance_tool,
            DiscardGrossBalanceToolCommand(),
        )

    def open_gross_balance_tool(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            open_gross_balance_tool,
            OpenGrossBalanceToolCommand(),
        )

    def close_gross_balance_tool(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            close_gross_balance_tool,
            CloseGrossBalanceToolCommand(),
        )

    def move_workspace_produce_lot_to_gross_balance(self, experiment_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_workspace_produce_lot_to_gross_balance,
            MoveWorkspaceProduceLotToGrossBalanceCommand(produce_lot_id=produce_lot_id),
        )

    def move_workbench_produce_lot_to_gross_balance(
        self,
        experiment_id: str,
        source_slot_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_workbench_produce_lot_to_gross_balance,
            MoveWorkbenchProduceLotToGrossBalanceCommand(
                source_slot_id=source_slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def move_widget_produce_lot_to_gross_balance(
        self,
        experiment_id: str,
        widget_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_widget_produce_lot_to_gross_balance,
            MoveWidgetProduceLotToGrossBalanceCommand(widget_id=widget_id, produce_lot_id=produce_lot_id),
        )

    def restore_trashed_produce_lot_to_gross_balance(
        self,
        experiment_id: str,
        trash_produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            restore_trashed_produce_lot_to_gross_balance,
            RestoreTrashedProduceLotToGrossBalanceCommand(trash_produce_lot_id=trash_produce_lot_id),
        )

    def move_gross_balance_produce_lot_to_workbench(
        self,
        experiment_id: str,
        target_slot_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_gross_balance_produce_lot_to_workbench,
            MoveGrossBalanceProduceLotToWorkbenchCommand(
                target_slot_id=target_slot_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def move_gross_balance_produce_lot_to_widget(
        self,
        experiment_id: str,
        widget_id: str,
        produce_lot_id: str,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            move_gross_balance_produce_lot_to_widget,
            MoveGrossBalanceProduceLotToWidgetCommand(
                widget_id=widget_id,
                produce_lot_id=produce_lot_id,
            ),
        )

    def discard_gross_balance_produce_lot(self, experiment_id: str, produce_lot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_gross_balance_produce_lot,
            DiscardGrossBalanceProduceLotCommand(produce_lot_id=produce_lot_id),
        )

    def create_lims_reception(
        self,
        experiment_id: str,
        orchard_name: str,
        harvest_date: str,
        indicative_mass_g: float,
        measured_gross_mass_g: float | None,
        measured_sample_mass_g: float | None = None,
        entry_id: str | None = None,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            create_lims_reception,
            CreateLimsReceptionCommand(
                orchard_name=orchard_name,
                harvest_date=harvest_date,
                indicative_mass_g=indicative_mass_g,
                measured_gross_mass_g=measured_gross_mass_g,
                measured_sample_mass_g=measured_sample_mass_g,
                entry_id=entry_id,
            ),
        )

    def print_lims_label(self, experiment_id: str, entry_id: str | None = None) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            print_lims_label,
            PrintLimsLabelCommand(entry_id=entry_id),
        )

    def discard_printed_lims_label(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            discard_printed_lims_label,
            DiscardPrintedLimsLabelCommand(),
        )

    def apply_printed_lims_label(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            apply_printed_lims_label,
            ApplyPrintedLimsLabelCommand(slot_id=slot_id),
        )

    def apply_printed_lims_label_to_basket_bag(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            apply_printed_lims_label_to_basket_bag,
            ApplyPrintedLimsLabelToBasketBagCommand(),
        )

    def apply_printed_lims_label_to_gross_balance_bag(self, experiment_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            apply_printed_lims_label_to_gross_balance_bag,
            ApplyPrintedLimsLabelToGrossBalanceBagCommand(),
        )

    def create_debug_produce_lot_on_workbench(
        self,
        experiment_id: str,
        preset_id: str,
        target_slot_id: str,
        total_mass_g: float | None = None,
        temperature_c: float | None = None,
        residual_co2_mass_g: float | None = None,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            create_debug_produce_lot_on_workbench,
            CreateDebugProduceLotOnWorkbenchCommand(
                preset_id=preset_id,
                total_mass_g=total_mass_g,
                residual_co2_mass_g=residual_co2_mass_g,
                temperature_c=temperature_c,
                target_slot_id=target_slot_id,
            ),
        )

    def create_debug_produce_lot_to_widget(
        self,
        experiment_id: str,
        preset_id: str,
        widget_id: str,
        total_mass_g: float | None = None,
        temperature_c: float | None = None,
        residual_co2_mass_g: float | None = None,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            create_debug_produce_lot_to_widget,
            CreateDebugProduceLotToWidgetCommand(
                preset_id=preset_id,
                total_mass_g=total_mass_g,
                residual_co2_mass_g=residual_co2_mass_g,
                temperature_c=temperature_c,
                widget_id=widget_id,
            ),
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

    def close_workbench_tool(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            close_workbench_tool,
            CloseWorkbenchToolCommand(slot_id=slot_id),
        )

    def open_workbench_tool(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            open_workbench_tool,
            OpenWorkbenchToolCommand(slot_id=slot_id),
        )

    def load_spatula_from_workbench_tool(self, experiment_id: str, slot_id: str) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            load_spatula_from_workbench_tool,
            LoadSpatulaFromWorkbenchToolCommand(slot_id=slot_id),
        )

    def pour_spatula_into_workbench_tool(
        self,
        experiment_id: str,
        slot_id: str,
        delta_mass_g: float,
    ) -> ExperimentSchema:
        return self._apply_command(
            experiment_id,
            pour_spatula_into_workbench_tool,
            PourSpatulaIntoWorkbenchToolCommand(slot_id=slot_id, delta_mass_g=delta_mass_g),
        )

    def update_workbench_tool_sample_label_text(
        self,
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
        self,
        experiment_id: str,
        source_slot_id: str,
        target_slot_id: str,
        label_id: str | None = None,
    ) -> ExperimentSchema:
        resolved_label_id = label_id or self._get_default_tool_label_id(experiment_id, source_slot_id)
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
        self,
        experiment_id: str,
        slot_id: str,
        label_id: str | None = None,
    ) -> ExperimentSchema:
        resolved_label_id = label_id or self._get_default_tool_label_id(experiment_id, slot_id)
        return self._apply_command(
            experiment_id,
            discard_sample_label_from_workbench_tool,
            WorkbenchSampleLabelCommand(slot_id=slot_id, label_id=resolved_label_id),
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
            experiment = self._repository.load(experiment_id)
            if experiment is not None:
                self._experiments[experiment_id] = experiment
        if experiment is None:
            raise ExperimentNotFoundError(experiment_id)
        return experiment

    def _get_default_tool_label_id(self, experiment_id: str, slot_id: str) -> str:
        experiment = self._require_experiment(experiment_id)
        slot = next((slot for slot in experiment.workbench.slots if slot.id == slot_id), None)
        if slot is None or slot.tool is None or not slot.tool.labels:
            raise ValueError("Unknown workbench tool label")
        return slot.tool.labels[0].id

    def _apply_command(
        self,
        experiment_id: str,
        handler: Callable[[Experiment, CommandT], None],
        command: CommandT,
    ) -> ExperimentSchema:
        experiment = self._require_experiment(experiment_id)
        self._advance_experiment_to_now(experiment)
        handler(experiment, command)
        return self._persist_mutation_and_to_schema(experiment)

    def _advance_experiment_to_now(self, experiment: Experiment) -> bool:
        now = self._now_fn()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        elapsed_ms = (now - experiment.last_simulation_at).total_seconds() * 1000.0
        if elapsed_ms <= 0:
            return False

        remaining_ms = elapsed_ms
        while remaining_ms > 0:
            step_ms = min(remaining_ms, 5000.0)
            advance_workspace_cryogenics(
                experiment,
                AdvanceWorkspaceCryogenicsCommand(elapsed_ms=step_ms),
            )
            remaining_ms -= step_ms

        experiment.last_simulation_at = now
        return True

    def _to_schema(self, experiment: Experiment) -> ExperimentSchema:
        return ExperimentSchema.model_validate(
            {
                "id": experiment.id,
                "status": experiment.status.value,
                "last_simulation_at": experiment.last_simulation_at,
                "snapshot_version": experiment.snapshot_version,
                "workbench": asdict(experiment.workbench),
                "rack": asdict(experiment.rack),
                "trash": asdict(experiment.trash),
                "workspace": asdict(experiment.workspace),
                "lims_reception": asdict(experiment.lims_reception),
                "lims_entries": [asdict(entry) for entry in experiment.lims_entries],
                "basket_tool": asdict(experiment.basket_tool) if experiment.basket_tool else None,
                "spatula": asdict(experiment.spatula),
                "audit_log": experiment.audit_log,
            }
        )

    def _persist_mutation_and_to_schema(self, experiment: Experiment) -> ExperimentSchema:
        experiment.snapshot_version += 1
        self._repository.save(experiment)
        return self._to_schema(experiment)
