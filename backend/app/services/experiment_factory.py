from __future__ import annotations

from datetime import datetime, timezone

from app.domain.models import (
    Experiment,
    ExperimentStatus,
    LimsReception,
    ProduceLot,
    Rack,
    RackSlot,
    Trash,
    WorkbenchTool,
    Workspace,
    WorkspaceWidget,
    Workbench,
    WorkbenchSlot,
    new_id,
)


def build_experiment() -> Experiment:
    produce_lot = ProduceLot(
        id=new_id("produce"),
        label="Orchard apple lot",
        produce_type="apple",
        total_mass_g=2450.0,
        unit_count=12,
    )
    basket_tool = WorkbenchTool(
        id=new_id("bench_tool"),
        tool_id="sealed_sampling_bag",
        label="Sealed sampling bag",
        subtitle="Field reception",
        accent="emerald",
        tool_type="sample_bag",
        capacity_ml=500.0,
        is_sealed=True,
        field_label_text="Martin Orchard • Harvest 2026-03-29 • Approx. 2.50 kg",
        produce_lots=[produce_lot],
    )
    return Experiment(
        id=new_id("experiment"),
        status=ExperimentStatus.PREPARING,
        workbench=Workbench(
            slots=[
                WorkbenchSlot(id="station_1", label="Station 1"),
                WorkbenchSlot(id="station_2", label="Station 2"),
            ]
        ),
        rack=Rack(
            slots=[
                RackSlot(id=f"rack_slot_{index}", label=f"Position {index}")
                for index in range(1, 13)
            ]
        ),
        trash=Trash(),
        workspace=Workspace(
            widgets=[
                WorkspaceWidget(
                    id="lims",
                    widget_type="lims_terminal",
                    label="LIMS terminal",
                    anchor="top-left",
                    offset_x=24,
                    offset_y=886,
                    is_present=True,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="gross_balance",
                    widget_type="gross_balance",
                    label="Gross balance",
                    anchor="top-left",
                    offset_x=364,
                    offset_y=886,
                    is_present=False,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="workbench",
                    widget_type="workbench",
                    label="Workbench",
                    anchor="top-left",
                    offset_x=24,
                    offset_y=24,
                    is_present=True,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="trash",
                    widget_type="trash",
                    label="Trash",
                    anchor="top-left",
                    offset_x=1276,
                    offset_y=24,
                    is_present=True,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="rack",
                    widget_type="autosampler_rack",
                    label="Autosampler rack",
                    anchor="top-left",
                    offset_x=234,
                    offset_y=886,
                    is_present=False,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="instrument",
                    widget_type="lc_msms_instrument",
                    label="LC-MS/MS",
                    anchor="top-left",
                    offset_x=812,
                    offset_y=886,
                    is_present=False,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="basket",
                    widget_type="produce_basket",
                    label="Produce basket",
                    anchor="top-left",
                    offset_x=1276,
                    offset_y=262,
                    is_present=True,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="grinder",
                    widget_type="cryogenic_grinder",
                    label="Cryogenic grinder",
                    anchor="top-left",
                    offset_x=980,
                    offset_y=886,
                    is_present=False,
                    is_trashed=False,
                ),
            ],
            produce_lots=[],
        ),
        lims_reception=LimsReception(
            orchard_name="",
            harvest_date="",
            indicative_mass_g=0.0,
        ),
        basket_tool=basket_tool,
        last_simulation_at=datetime.now(timezone.utc),
        audit_log=[
            "Experiment created",
            "Receive the grower bag, weigh it, then register it in the LIMS.",
        ],
    )
