from app.domain.models import ProduceLot
from app.services.experiment_factory import build_experiment
from app.services.helpers.produce_material_states import set_material_state_name
from app.services.helpers.workbench import build_workbench_tool
from app.services.transfer import (
    GrinderProduceLotSource,
    GrinderProduceLotTarget,
    ProduceLotTransferService,
    WorkbenchProduceLotSource,
    WorkbenchProduceLotTarget,
    WorkspaceProduceLotSource,
)


def test_transfer_service_moves_produce_lot_from_workbench_to_grinder() -> None:
    experiment = build_experiment()
    service = ProduceLotTransferService()
    produce_lot = ProduceLot(
        id="produce_1",
        label="Apple lot 1",
        produce_type="apple",
        total_mass_g=120.0,
        unit_count=2,
    )
    experiment.workbench.slots[0].tool = build_workbench_tool("cutting_board_hdpe")
    experiment.workbench.slots[0].tool.produce_lots.append(produce_lot)
    set_material_state_name(experiment.produce_material_states, produce_lot.id, "cut")

    result = service.transfer(
        experiment,
        WorkbenchProduceLotSource(slot_id="station_1", produce_lot_id="produce_1"),
        GrinderProduceLotTarget(widget_id="grinder"),
    )

    assert result.source_label == "Cutting board"
    assert result.target_label == "Cryogenic grinder"
    assert result.contamination_applied is False
    assert experiment.workbench.slots[0].tool.produce_lots == []
    grinder = next(widget for widget in experiment.workspace.widgets if widget.id == "grinder")
    assert [lot.id for lot in grinder.produce_lots] == ["produce_1"]
    assert experiment.workbench.slots[0].tool.produce_fractions == []
    assert len(grinder.produce_fractions) == 1
    assert grinder.produce_fractions[0].produce_lot_id == "produce_1"
    assert grinder.produce_fractions[0].location_kind == "workspace_widget"
    assert grinder.produce_fractions[0].location_id == "grinder"
    assert grinder.produce_fractions[0].container_label == "Cryogenic grinder"


def test_transfer_service_marks_surface_drop_as_contaminated() -> None:
    experiment = build_experiment()
    service = ProduceLotTransferService()
    produce_lot = ProduceLot(
        id="produce_1",
        label="Apple lot 1",
        produce_type="apple",
        total_mass_g=120.0,
        unit_count=2,
    )
    grinder = next(widget for widget in experiment.workspace.widgets if widget.id == "grinder")
    grinder.produce_lots.append(produce_lot)
    set_material_state_name(experiment.produce_material_states, produce_lot.id, "ground")

    result = service.transfer(
        experiment,
        GrinderProduceLotSource(widget_id="grinder", produce_lot_id="produce_1"),
        WorkbenchProduceLotTarget(slot_id="station_2", allowed_tool_types=frozenset({"sample_bag"})),
    )

    assert result.source_label == "Cryogenic grinder"
    assert result.target_label == "Station 2"
    assert result.location_label == "Station 2"
    assert result.contamination_applied is True
    assert grinder.produce_lots == []
    assert grinder.produce_fractions == []
    assert len(experiment.workbench.slots[1].surface_produce_fractions) == 1
    assert experiment.workbench.slots[1].surface_produce_fractions[0].is_contaminated is True
    assert experiment.workbench.slots[1].surface_produce_fractions[0].location_kind == "workbench_surface"


def test_transfer_service_moves_basket_produce_lot_to_workbench_tool() -> None:
    experiment = build_experiment()
    service = ProduceLotTransferService()
    produce_lot = ProduceLot(
        id="produce_1",
        label="Apple lot 1",
        produce_type="apple",
        total_mass_g=120.0,
        unit_count=2,
    )
    experiment.workspace.produce_basket_lots.append(produce_lot)
    experiment.workbench.slots[0].tool = build_workbench_tool("sealed_sampling_bag")

    result = service.transfer(
        experiment,
        WorkspaceProduceLotSource(produce_lot_id="produce_1"),
        WorkbenchProduceLotTarget(slot_id="station_1"),
    )

    assert result.source_label == "Produce basket"
    assert result.location_label == "Sealed sampling bag on Station 1"
    assert experiment.workspace.produce_basket_lots == []
    assert [lot.id for lot in experiment.workbench.slots[0].tool.produce_lots] == ["produce_1"]
    assert experiment.workspace.produce_basket_fractions == []
    assert len(experiment.workbench.slots[0].tool.produce_fractions) == 1
    assert experiment.workbench.slots[0].tool.produce_fractions[0].produce_lot_id == "produce_1"
    assert experiment.workbench.slots[0].tool.produce_fractions[0].location_kind == "workbench_tool"
    assert experiment.workbench.slots[0].tool.produce_fractions[0].location_id == "station_1"


def test_transfer_service_represents_ground_material_in_tool_as_canonical_fraction() -> None:
    experiment = build_experiment()
    service = ProduceLotTransferService()
    produce_lot = ProduceLot(
        id="produce_1",
        label="Apple powder",
        produce_type="apple",
        total_mass_g=120.0,
    )
    experiment.workspace.produce_basket_lots.append(produce_lot)
    set_material_state_name(experiment.produce_material_states, produce_lot.id, "ground")
    experiment.workbench.slots[0].tool = build_workbench_tool("hdpe_storage_jar_2l")

    service.transfer(
        experiment,
        WorkspaceProduceLotSource(produce_lot_id="produce_1"),
        WorkbenchProduceLotTarget(slot_id="station_1"),
    )

    tool = experiment.workbench.slots[0].tool
    assert tool is not None
    assert len(tool.produce_fractions) == 1
    assert tool.produce_fractions[0].produce_lot_id == "produce_1"
    assert tool.produce_fractions[0].location_kind == "workbench_tool"
