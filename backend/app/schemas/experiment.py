from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, computed_field, model_validator


class WorkbenchLiquidSchema(BaseModel):
    id: str
    liquid_id: str
    name: str
    volume_ml: float
    accent: str


class SpatulaStateSchema(BaseModel):
    is_loaded: bool = False
    loaded_powder_mass_g: float = 0.0
    source_tool_id: str | None = None


class ProduceLotSchema(BaseModel):
    id: str
    label: str
    produce_type: str
    total_mass_g: float
    unit_count: int | None = None
    is_contaminated: bool = False
    cut_state: str = "whole"
    temperature_c: float = 20.0
    grind_quality_label: str | None = None
    homogeneity_score: float | None = None
    residual_co2_mass_g: float = 0.0


class PrintedLabelTicketSchema(BaseModel):
    id: str
    sample_code: str
    label_text: str
    received_date: str = ""


class ContainerLabelSchema(BaseModel):
    id: str
    label_kind: str
    text: str
    sample_code: str | None = None
    received_date: str | None = None


class EntityOriginSchema(BaseModel):
    kind: str
    location_id: str | None = None
    location_label: str | None = None
    container_id: str | None = None
    container_label: str | None = None


class LimsReceptionSchema(BaseModel):
    orchard_name: str
    harvest_date: str
    indicative_mass_g: float
    id: str | None = None
    measured_gross_mass_g: float | None = None
    gross_mass_offset_g: int = 0
    measured_sample_mass_g: float | None = None
    lab_sample_code: str | None = None
    status: str
    printed_label_ticket: PrintedLabelTicketSchema | None = None


def build_default_lims_reception_schema() -> LimsReceptionSchema:
    return LimsReceptionSchema(
        orchard_name="",
        harvest_date="",
        indicative_mass_g=0.0,
        id=None,
        measured_gross_mass_g=None,
        gross_mass_offset_g=0,
        measured_sample_mass_g=None,
        lab_sample_code=None,
        status="awaiting_reception",
        printed_label_ticket=None,
    )


class WorkbenchToolSchema(BaseModel):
    id: str
    tool_id: str
    label: str
    subtitle: str
    accent: str
    tool_type: str
    capacity_ml: float
    is_sealed: bool = False
    closure_fault: str | None = None
    internal_pressure_bar: float = 1.0
    trapped_co2_mass_g: float = 0.0
    field_label_text: str | None = None
    labels: list[ContainerLabelSchema] = Field(default_factory=list)
    produce_lots: list[ProduceLotSchema] = Field(default_factory=list)
    liquids: list[WorkbenchLiquidSchema] = Field(default_factory=list)
    powder_mass_g: float = 0.0

    @model_validator(mode="before")
    @classmethod
    def _upgrade_legacy_sample_label_fields(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        if "labels" in value:
            return value

        sample_label_text = value.get("sample_label_text")
        sample_label_received_date = value.get("sample_label_received_date")
        if sample_label_text is None:
            value["labels"] = []
            return value

        value["labels"] = [
            {
                "id": f"{value.get('id', 'tool')}-legacy-label",
                "label_kind": "lims" if sample_label_received_date else "manual",
                "text": sample_label_text,
                "sample_code": sample_label_text if sample_label_received_date else None,
                "received_date": sample_label_received_date,
            }
        ]
        return value

    @computed_field
    def sample_label_text(self) -> str | None:
        lims_label = next((label for label in self.labels if label.label_kind == "lims"), None)
        if lims_label is not None:
            return lims_label.text
        manual_label = next((label for label in self.labels if label.label_kind == "manual"), None)
        return manual_label.text if manual_label is not None else None

    @computed_field
    def sample_label_received_date(self) -> str | None:
        lims_label = next((label for label in self.labels if label.label_kind == "lims"), None)
        return lims_label.received_date if lims_label is not None else None


class WorkbenchSlotSchema(BaseModel):
    id: str
    label: str
    tool: WorkbenchToolSchema | None = None
    surface_produce_lots: list[ProduceLotSchema]


class WorkbenchSchema(BaseModel):
    slots: list[WorkbenchSlotSchema]


class RackSlotSchema(BaseModel):
    id: str
    label: str
    tool: WorkbenchToolSchema | None = None


class RackSchema(BaseModel):
    slots: list[RackSlotSchema]


class TrashToolEntrySchema(BaseModel):
    id: str
    origin_label: str
    tool: WorkbenchToolSchema


class TrashProduceLotEntrySchema(BaseModel):
    id: str
    origin_label: str
    produce_lot: ProduceLotSchema
    origin: EntityOriginSchema | None = None


class TrashSampleLabelEntrySchema(BaseModel):
    id: str
    origin_label: str
    label: ContainerLabelSchema

    @model_validator(mode="before")
    @classmethod
    def _upgrade_legacy_sample_label_text(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        if "label" in value:
            return value

        value["label"] = {
            "id": f"{value.get('id', 'trash-sample-label')}-legacy-label",
            "label_kind": "manual",
            "text": value.get("sample_label_text", ""),
            "sample_code": None,
            "received_date": None,
        }
        return value

    @computed_field
    def sample_label_text(self) -> str:
        return self.label.text


class TrashSchema(BaseModel):
    tools: list[TrashToolEntrySchema]
    produce_lots: list[TrashProduceLotEntrySchema]
    sample_labels: list[TrashSampleLabelEntrySchema]


class WorkspaceWidgetSchema(BaseModel):
    id: str
    widget_type: str
    label: str
    anchor: str
    offset_x: int
    offset_y: int
    is_present: bool
    is_trashed: bool
    grinder_run_duration_ms: float = 0.0
    grinder_run_remaining_ms: float = 0.0
    grinder_fault: str | None = None
    tool: WorkbenchToolSchema | None = None
    produce_lots: list[ProduceLotSchema] = Field(default_factory=list)
    liquids: list[WorkbenchLiquidSchema] = Field(default_factory=list)


class WorkspaceSchema(BaseModel):
    widgets: list[WorkspaceWidgetSchema]
    produce_basket_lots: list[ProduceLotSchema]


class ExperimentSchema(BaseModel):
    id: str
    status: str
    last_simulation_at: datetime
    snapshot_version: int
    workbench: WorkbenchSchema
    rack: RackSchema
    trash: TrashSchema
    workspace: WorkspaceSchema
    lims_reception: LimsReceptionSchema = Field(default_factory=build_default_lims_reception_schema)
    lims_entries: list[LimsReceptionSchema] = Field(default_factory=list)
    basket_tool: WorkbenchToolSchema | None = None
    spatula: SpatulaStateSchema = Field(default_factory=SpatulaStateSchema)
    audit_log: list[str]


class ExperimentListEntrySchema(BaseModel):
    id: str
    status: str
    last_simulation_at: datetime
    snapshot_version: int
    updated_at: datetime
    last_audit_entry: str | None = None


class LayoutPositionSchema(BaseModel):
    anchor: str
    offset_x: int
    offset_y: int


class WorkbenchToolPlacementSchema(BaseModel):
    tool_id: str


class WorkbenchSlotReferenceSchema(BaseModel):
    slot_id: str


class TargetWorkbenchSlotSchema(BaseModel):
    target_slot_id: str


class WorkbenchToolMoveSchema(BaseModel):
    target_slot_id: str


class WorkbenchToolLiquidCreateSchema(BaseModel):
    liquid_id: str
    volume_ml: float | None = None


class WorkbenchToolLiquidUpdateSchema(BaseModel):
    volume_ml: float


class WorkbenchToolSampleLabelUpdateSchema(BaseModel):
    label_id: str | None = None
    sample_label_text: str


class WorkbenchToolSampleLabelMoveSchema(BaseModel):
    label_id: str | None = None
    target_tool_id: str


class WorkbenchToolPowderPourSchema(BaseModel):
    delta_mass_g: float


class WorkbenchToolProduceLotCreateSchema(BaseModel):
    produce_lot_id: str


class WorkbenchProduceLotMoveSchema(BaseModel):
    source_slot_id: str
    target_slot_id: str


class PaletteToolDiscardSchema(BaseModel):
    tool_id: str


class RackToolPlacementSchema(BaseModel):
    tool_id: str


class RackWorkbenchPlacementSchema(BaseModel):
    source_slot_id: str


class RackToolMoveSchema(BaseModel):
    target_rack_slot_id: str


class RackToolMoveToWorkbenchSchema(BaseModel):
    target_slot_id: str


class TrashToolRestoreToWorkbenchSchema(BaseModel):
    target_slot_id: str


class TrashToolRestoreToRackSchema(BaseModel):
    rack_slot_id: str


class RackSlotReferenceSchema(BaseModel):
    rack_slot_id: str


class TrashProduceLotRestoreToWorkbenchSchema(BaseModel):
    target_slot_id: str


class TrashProduceLotRestoreToWidgetSchema(BaseModel):
    widget_id: str


class TrashSampleLabelRestoreSchema(BaseModel):
    target_tool_id: str


class WorkspaceWidgetCreateSchema(LayoutPositionSchema):
    widget_id: str


class WorkspaceWidgetMoveSchema(LayoutPositionSchema):
    pass


class WorkspaceWidgetLiquidCreateSchema(BaseModel):
    liquid_id: str
    volume_ml: float | None = None


class WorkspaceWidgetLiquidUpdateSchema(BaseModel):
    volume_ml: float


class WorkspaceProduceLotCreateSchema(BaseModel):
    produce_type: Literal["apple"]


class DebugProducePresetSpawnToWorkbenchSchema(BaseModel):
    target_slot_id: str
    total_mass_g: float | None = None
    temperature_c: float | None = None
    residual_co2_mass_g: float | None = None


class DebugProducePresetSpawnToWidgetSchema(BaseModel):
    widget_id: str
    total_mass_g: float | None = None
    temperature_c: float | None = None
    residual_co2_mass_g: float | None = None


class WorkspaceWidgetProduceLotCreateSchema(BaseModel):
    produce_lot_id: str


class WorkspaceWidgetMoveWorkbenchProduceLotSchema(BaseModel):
    source_slot_id: str
    produce_lot_id: str


class WorkspaceWidgetMoveProduceLotToWorkbenchSchema(BaseModel):
    target_slot_id: str


class GrossBalanceMoveProduceLotToWorkbenchSchema(BaseModel):
    target_slot_id: str
    produce_lot_id: str


class ReceivedBagPlacementSchema(BaseModel):
    target_slot_id: str


class GrossWeightRecordSchema(BaseModel):
    measured_gross_mass_g: float | None = None


class GrossMassOffsetUpdateSchema(BaseModel):
    gross_mass_offset_g: int


class LimsReceptionCreateSchema(BaseModel):
    entry_id: str | None = None
    orchard_name: str
    harvest_date: str
    indicative_mass_g: float
    measured_gross_mass_g: float | None = None
    measured_sample_mass_g: float | None = None


class LimsLabelPrintSchema(BaseModel):
    entry_id: str | None = None
