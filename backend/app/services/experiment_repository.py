from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from app.domain.models import (
    Experiment,
    ExperimentStatus,
    LimsReception,
    PrintedLabelTicket,
    ProduceLot,
    Rack,
    RackSlot,
    Trash,
    TrashProduceLotEntry,
    TrashSampleLabelEntry,
    TrashToolEntry,
    Workbench,
    WorkbenchLiquid,
    WorkbenchSlot,
    WorkbenchTool,
    Workspace,
    WorkspaceWidget,
)
from app.schemas.experiment import ExperimentListEntrySchema, ExperimentSchema


class ExperimentRepository(Protocol):
    def save(self, experiment: Experiment) -> None: ...

    def load(self, experiment_id: str) -> Experiment | None: ...

    def list(self) -> list[ExperimentListEntrySchema]: ...

    def delete(self, experiment_id: str) -> bool: ...


class InMemoryExperimentRepository:
    def save(self, experiment: Experiment) -> None:
        return None

    def load(self, experiment_id: str) -> Experiment | None:
        return None

    def list(self) -> list[ExperimentListEntrySchema]:
        return []

    def delete(self, experiment_id: str) -> bool:
        return False


class SqliteExperimentRepository:
    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._ensure_parent_directory()
        self._initialize_schema()

    def save(self, experiment: Experiment) -> None:
        payload = json.dumps(_serialize_experiment(experiment), sort_keys=True)
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self._db_path) as connection:
            connection.execute(
                """
                INSERT INTO experiments (id, created_at, updated_at, snapshot_version, payload)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    updated_at = excluded.updated_at,
                    snapshot_version = excluded.snapshot_version,
                    payload = excluded.payload
                """,
                (
                    experiment.id,
                    now,
                    now,
                    experiment.snapshot_version,
                    payload,
                ),
            )
            connection.commit()

    def load(self, experiment_id: str) -> Experiment | None:
        with sqlite3.connect(self._db_path) as connection:
            row = connection.execute(
                "SELECT payload FROM experiments WHERE id = ?",
                (experiment_id,),
            ).fetchone()

        if row is None:
            return None

        payload = json.loads(row[0])
        return _deserialize_experiment(payload)

    def list(self) -> list[ExperimentListEntrySchema]:
        with sqlite3.connect(self._db_path) as connection:
            rows = connection.execute(
                """
                SELECT id, updated_at, snapshot_version, payload
                FROM experiments
                ORDER BY updated_at DESC, id DESC
                """
            ).fetchall()

        entries: list[ExperimentListEntrySchema] = []
        for experiment_id, updated_at, snapshot_version, payload_json in rows:
            payload = json.loads(payload_json)
            schema = ExperimentSchema.model_validate(payload)
            entries.append(
                ExperimentListEntrySchema(
                    id=experiment_id,
                    status=schema.status,
                    last_simulation_at=schema.last_simulation_at,
                    snapshot_version=snapshot_version,
                    updated_at=datetime.fromisoformat(updated_at),
                    last_audit_entry=schema.audit_log[-1] if schema.audit_log else None,
                )
            )
        return entries

    def delete(self, experiment_id: str) -> bool:
        with sqlite3.connect(self._db_path) as connection:
            cursor = connection.execute(
                "DELETE FROM experiments WHERE id = ?",
                (experiment_id,),
            )
            connection.commit()
        return cursor.rowcount > 0

    def _ensure_parent_directory(self) -> None:
        Path(self._db_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)

    def _initialize_schema(self) -> None:
        with sqlite3.connect(self._db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS experiments (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    snapshot_version INTEGER NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.commit()


def _serialize_experiment(experiment: Experiment) -> dict:
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
            "audit_log": experiment.audit_log,
        }
    ).model_dump(mode="json")


def _deserialize_experiment(payload: dict) -> Experiment:
    schema = ExperimentSchema.model_validate(payload)
    return Experiment(
        id=schema.id,
        status=ExperimentStatus(schema.status),
        workbench=Workbench(
            slots=[
                WorkbenchSlot(
                    id=slot.id,
                    label=slot.label,
                    tool=_deserialize_workbench_tool(slot.tool),
                    surface_produce_lots=[
                        _deserialize_produce_lot(lot) for lot in slot.surface_produce_lots
                    ],
                )
                for slot in schema.workbench.slots
            ]
        ),
        rack=Rack(
            slots=[
                RackSlot(
                    id=slot.id,
                    label=slot.label,
                    tool=_deserialize_workbench_tool(slot.tool),
                )
                for slot in schema.rack.slots
            ]
        ),
        trash=Trash(
            tools=[
                TrashToolEntry(
                    id=entry.id,
                    origin_label=entry.origin_label,
                    tool=_deserialize_workbench_tool(entry.tool),
                )
                for entry in schema.trash.tools
            ],
            produce_lots=[
                TrashProduceLotEntry(
                    id=entry.id,
                    origin_label=entry.origin_label,
                    produce_lot=_deserialize_produce_lot(entry.produce_lot),
                )
                for entry in schema.trash.produce_lots
            ],
            sample_labels=[
                TrashSampleLabelEntry(
                    id=entry.id,
                    origin_label=entry.origin_label,
                    sample_label_text=entry.sample_label_text,
                )
                for entry in schema.trash.sample_labels
            ],
        ),
        workspace=Workspace(
            widgets=[
                WorkspaceWidget(
                    id=widget.id,
                    widget_type=widget.widget_type,
                    label=widget.label,
                    anchor=widget.anchor,
                    offset_x=widget.offset_x,
                    offset_y=widget.offset_y,
                    is_present=widget.is_present,
                    is_trashed=widget.is_trashed,
                    grinder_run_duration_ms=widget.grinder_run_duration_ms,
                    grinder_run_remaining_ms=widget.grinder_run_remaining_ms,
                    grinder_fault=widget.grinder_fault,
                    tool=_deserialize_workbench_tool(widget.tool),
                    produce_lots=[
                        _deserialize_produce_lot(lot) for lot in widget.produce_lots
                    ],
                    liquids=[
                        WorkbenchLiquid(**liquid.model_dump()) for liquid in widget.liquids
                    ],
                )
                for widget in schema.workspace.widgets
            ],
            produce_lots=[
                _deserialize_produce_lot(lot) for lot in schema.workspace.produce_lots
            ],
        ),
        lims_reception=LimsReception(
            orchard_name=schema.lims_reception.orchard_name,
            harvest_date=schema.lims_reception.harvest_date,
            indicative_mass_g=schema.lims_reception.indicative_mass_g,
            id=schema.lims_reception.id,
            measured_gross_mass_g=schema.lims_reception.measured_gross_mass_g,
            lab_sample_code=schema.lims_reception.lab_sample_code,
            status=schema.lims_reception.status,
            printed_label_ticket=
                PrintedLabelTicket(**schema.lims_reception.printed_label_ticket.model_dump())
                if schema.lims_reception.printed_label_ticket is not None
                else None,
        ),
        last_simulation_at=schema.last_simulation_at,
        basket_tool=_deserialize_workbench_tool(schema.basket_tool),
        lims_entries=_deserialize_lims_entries(schema),
        snapshot_version=schema.snapshot_version,
        audit_log=list(schema.audit_log),
    )


def _deserialize_lims_entries(schema: ExperimentSchema) -> list[LimsReception]:
    if schema.lims_entries:
        return [
            LimsReception(
                orchard_name=entry.orchard_name,
                harvest_date=entry.harvest_date,
                indicative_mass_g=entry.indicative_mass_g,
                id=entry.id,
                measured_gross_mass_g=entry.measured_gross_mass_g,
                lab_sample_code=entry.lab_sample_code,
                status=entry.status,
                printed_label_ticket=
                    PrintedLabelTicket(**entry.printed_label_ticket.model_dump())
                    if entry.printed_label_ticket is not None
                    else None,
            )
            for entry in schema.lims_entries
        ]

    if schema.lims_reception.lab_sample_code is None:
        return []

    return [
        LimsReception(
            orchard_name=schema.lims_reception.orchard_name,
            harvest_date=schema.lims_reception.harvest_date,
            indicative_mass_g=schema.lims_reception.indicative_mass_g,
            id=schema.lims_reception.id,
            measured_gross_mass_g=schema.lims_reception.measured_gross_mass_g,
            lab_sample_code=schema.lims_reception.lab_sample_code,
            status=schema.lims_reception.status,
            printed_label_ticket=None,
        )
    ]


def _deserialize_workbench_tool(tool_schema) -> WorkbenchTool | None:
    if tool_schema is None:
        return None
    return WorkbenchTool(
        id=tool_schema.id,
        tool_id=tool_schema.tool_id,
        label=tool_schema.label,
        subtitle=tool_schema.subtitle,
        accent=tool_schema.accent,
        tool_type=tool_schema.tool_type,
        capacity_ml=tool_schema.capacity_ml,
        is_sealed=tool_schema.is_sealed,
        closure_fault=tool_schema.closure_fault,
        internal_pressure_bar=tool_schema.internal_pressure_bar,
        trapped_co2_mass_g=tool_schema.trapped_co2_mass_g,
        field_label_text=tool_schema.field_label_text,
        sample_label_text=tool_schema.sample_label_text,
        sample_label_received_date=tool_schema.sample_label_received_date,
        produce_lots=[_deserialize_produce_lot(lot) for lot in tool_schema.produce_lots],
        liquids=[WorkbenchLiquid(**liquid.model_dump()) for liquid in tool_schema.liquids],
    )


def _deserialize_produce_lot(lot_schema) -> ProduceLot:
    payload = lot_schema.model_dump()
    return ProduceLot(**payload)
