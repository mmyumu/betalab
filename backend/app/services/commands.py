from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PlaceToolOnWorkbenchCommand:
    slot_id: str
    tool_id: str


@dataclass(frozen=True, slots=True)
class WorkbenchSlotCommand:
    slot_id: str


@dataclass(frozen=True, slots=True)
class MoveToolBetweenWorkbenchSlotsCommand:
    source_slot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class AddLiquidToWorkbenchToolCommand:
    slot_id: str
    liquid_id: str
    volume_ml: float | None = None


@dataclass(frozen=True, slots=True)
class AddProduceLotToWorkbenchToolCommand:
    slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class ApplySampleLabelToWorkbenchToolCommand:
    slot_id: str


@dataclass(frozen=True, slots=True)
class UpdateWorkbenchToolSampleLabelTextCommand:
    slot_id: str
    sample_label_text: str


@dataclass(frozen=True, slots=True)
class CloseWorkbenchToolCommand:
    slot_id: str


@dataclass(frozen=True, slots=True)
class OpenWorkbenchToolCommand:
    slot_id: str


@dataclass(frozen=True, slots=True)
class MoveSampleLabelBetweenWorkbenchToolsCommand:
    source_slot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedSampleLabelToWorkbenchToolCommand:
    trash_sample_label_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class MoveProduceLotBetweenWorkbenchToolsCommand:
    source_slot_id: str
    target_slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class WorkbenchProduceLotCommand:
    slot_id: str
    produce_lot_id: str


@dataclass(frozen=True, slots=True)
class WorkbenchLiquidCommand:
    slot_id: str
    liquid_entry_id: str


@dataclass(frozen=True, slots=True)
class UpdateWorkbenchLiquidVolumeCommand:
    slot_id: str
    liquid_entry_id: str
    volume_ml: float


@dataclass(frozen=True, slots=True)
class DiscardToolFromPaletteCommand:
    tool_id: str


@dataclass(frozen=True, slots=True)
class DiscardSampleLabelFromPaletteCommand:
    sample_label_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedToolToWorkbenchSlotCommand:
    trash_tool_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class RackSlotToolCommand:
    rack_slot_id: str
    tool_id: str


@dataclass(frozen=True, slots=True)
class PlaceWorkbenchToolInRackSlotCommand:
    source_slot_id: str
    rack_slot_id: str


@dataclass(frozen=True, slots=True)
class RemoveRackToolToWorkbenchSlotCommand:
    rack_slot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class MoveRackToolBetweenSlotsCommand:
    source_rack_slot_id: str
    target_rack_slot_id: str


@dataclass(frozen=True, slots=True)
class RackSlotCommand:
    rack_slot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedToolToRackSlotCommand:
    trash_tool_id: str
    rack_slot_id: str


@dataclass(frozen=True, slots=True)
class RestoreTrashedProduceLotToWorkbenchToolCommand:
    trash_produce_lot_id: str
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class WorkspaceWidgetLayoutCommand:
    widget_id: str
    anchor: str
    offset_x: int
    offset_y: int


@dataclass(frozen=True, slots=True)
class WorkspaceWidgetCommand:
    widget_id: str


@dataclass(frozen=True, slots=True)
class AddLiquidToWorkspaceWidgetCommand:
    widget_id: str
    liquid_id: str
    volume_ml: float | None = None


@dataclass(frozen=True, slots=True)
class UpdateWorkspaceWidgetLiquidVolumeCommand:
    widget_id: str
    liquid_entry_id: str
    volume_ml: float


@dataclass(frozen=True, slots=True)
class WorkspaceWidgetLiquidCommand:
    widget_id: str
    liquid_entry_id: str


@dataclass(frozen=True, slots=True)
class AdvanceWorkspaceCryogenicsCommand:
    elapsed_ms: float


@dataclass(frozen=True, slots=True)
class CreateProduceLotCommand:
    produce_type: str


@dataclass(frozen=True, slots=True)
class PlaceReceivedBagOnWorkbenchCommand:
    target_slot_id: str


@dataclass(frozen=True, slots=True)
class CreateLimsReceptionCommand:
    orchard_name: str
    harvest_date: str
    indicative_mass_g: float
    measured_gross_mass_g: float


@dataclass(frozen=True, slots=True)
class RecordGrossWeightCommand:
    pass


@dataclass(frozen=True, slots=True)
class PrintLimsLabelCommand:
    pass


@dataclass(frozen=True, slots=True)
class ApplyPrintedLimsLabelCommand:
    slot_id: str


@dataclass(frozen=True, slots=True)
class CreateDebugProduceLotOnWorkbenchCommand:
    preset_id: str
    target_slot_id: str
    total_mass_g: float | None = None
    temperature_c: float | None = None
    residual_co2_mass_g: float | None = None


@dataclass(frozen=True, slots=True)
class CreateDebugProduceLotToWidgetCommand:
    preset_id: str
    widget_id: str
    total_mass_g: float | None = None
    temperature_c: float | None = None
    residual_co2_mass_g: float | None = None


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
