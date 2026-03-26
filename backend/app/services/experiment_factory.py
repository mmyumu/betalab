from __future__ import annotations

from app.domain.models import (
    Experiment,
    ExperimentStatus,
    Rack,
    RackSlot,
    Trash,
    Workspace,
    WorkspaceWidget,
    Workbench,
    WorkbenchSlot,
    new_id,
)


def build_experiment() -> Experiment:
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
                    id="workbench",
                    widget_type="workbench",
                    label="Workbench",
                    x=234,
                    y=0,
                    is_present=True,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="trash",
                    widget_type="trash",
                    label="Trash",
                    x=1530,
                    y=0,
                    is_present=True,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="rack",
                    widget_type="autosampler_rack",
                    label="Autosampler rack",
                    x=234,
                    y=886,
                    is_present=False,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="instrument",
                    widget_type="lc_msms_instrument",
                    label="LC-MS/MS",
                    x=812,
                    y=886,
                    is_present=False,
                    is_trashed=False,
                ),
                WorkspaceWidget(
                    id="basket",
                    widget_type="produce_basket",
                    label="Produce basket",
                    x=1460,
                    y=248,
                    is_present=True,
                    is_trashed=False,
                ),
            ],
            produce_lots=[],
        ),
        audit_log=[
            "Experiment created",
            "Start by dragging an extraction tool onto the bench.",
        ],
    )
