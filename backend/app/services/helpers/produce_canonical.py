from __future__ import annotations

from collections.abc import Iterable

from app.domain.models import (
    Experiment,
    ProduceFraction,
    ProduceLot,
    ProduceMaterialState,
    TrashProduceLotEntry,
)


def sync_canonical_produce_model(experiment: Experiment) -> None:
    state_ids_by_signature: dict[tuple[object, ...], str] = {}
    material_states: list[ProduceMaterialState] = []
    state_index = 0

    def ensure_material_state_id(produce_lot: ProduceLot, *, force_ground: bool = False) -> str:
        nonlocal state_index
        signature = (
            produce_lot.id,
            "ground" if force_ground else produce_lot.cut_state,
            produce_lot.temperature_c,
            produce_lot.grind_quality_label,
            produce_lot.homogeneity_score,
            produce_lot.residual_co2_mass_g,
            produce_lot.grinding_elapsed_seconds,
            produce_lot.grinding_temperature_integral,
        )
        existing_id = state_ids_by_signature.get(signature)
        if existing_id is not None:
            return existing_id

        state_index += 1
        state_id = f"produce_state_{state_index}"
        state_ids_by_signature[signature] = state_id
        material_states.append(
            ProduceMaterialState(
                id=state_id,
                produce_lot_id=produce_lot.id,
                cut_state="ground" if force_ground else produce_lot.cut_state,
                temperature_c=produce_lot.temperature_c,
                grind_quality_label=produce_lot.grind_quality_label,
                homogeneity_score=produce_lot.homogeneity_score,
                residual_co2_mass_g=produce_lot.residual_co2_mass_g,
                grinding_elapsed_seconds=produce_lot.grinding_elapsed_seconds,
                grinding_temperature_integral=produce_lot.grinding_temperature_integral,
            )
        )
        return state_id

    produce_lots_by_id = _collect_produce_lots(experiment)

    if experiment.basket_tool is not None:
        experiment.basket_tool.produce_fractions = _build_tool_produce_fractions(
            experiment.basket_tool.produce_lots,
            ensure_material_state_id,
            location_kind="basket_tool",
            location_id=experiment.basket_tool.id,
            container_id=experiment.basket_tool.id,
            container_label=experiment.basket_tool.label,
        )

    for slot in experiment.workbench.slots:
        slot.surface_produce_fractions = _build_surface_produce_fractions(
            slot.surface_produce_lots,
            ensure_material_state_id,
            location_kind="workbench_surface",
            location_id=slot.id,
            container_label=slot.label,
        )
        if slot.tool is None:
            continue
        slot.tool.produce_fractions = _build_tool_produce_fractions(
            slot.tool.produce_lots,
            ensure_material_state_id,
            location_kind="workbench_tool",
            location_id=slot.id,
            container_id=slot.tool.id,
            container_label=slot.tool.label,
        )
        slot.tool.produce_fractions.extend(
            _build_powder_fractions(
                slot.tool.powder_fractions,
                produce_lots_by_id,
                ensure_material_state_id,
                location_kind="workbench_tool",
                location_id=slot.id,
                container_id=slot.tool.id,
                container_label=slot.tool.label,
            )
        )

    for slot in experiment.rack.slots:
        if slot.tool is None:
            continue
        slot.tool.produce_fractions = _build_tool_produce_fractions(
            slot.tool.produce_lots,
            ensure_material_state_id,
            location_kind="rack_tool",
            location_id=slot.id,
            container_id=slot.tool.id,
            container_label=slot.tool.label,
        )
        slot.tool.produce_fractions.extend(
            _build_powder_fractions(
                slot.tool.powder_fractions,
                produce_lots_by_id,
                ensure_material_state_id,
                location_kind="rack_tool",
                location_id=slot.id,
                container_id=slot.tool.id,
                container_label=slot.tool.label,
            )
        )

    for widget in experiment.workspace.widgets:
        widget.produce_fractions = _build_tool_produce_fractions(
            widget.produce_lots,
            ensure_material_state_id,
            location_kind="workspace_widget",
            location_id=widget.id,
            container_id=widget.tool.id if widget.tool is not None else None,
            container_label=widget.label,
        )
        if widget.tool is not None:
            widget.tool.produce_fractions = _build_tool_produce_fractions(
                widget.tool.produce_lots,
                ensure_material_state_id,
                location_kind="workspace_widget_tool",
                location_id=widget.id,
                container_id=widget.tool.id,
                container_label=widget.tool.label,
            )
            widget.tool.produce_fractions.extend(
                _build_powder_fractions(
                    widget.tool.powder_fractions,
                    produce_lots_by_id,
                    ensure_material_state_id,
                    location_kind="workspace_widget_tool",
                    location_id=widget.id,
                    container_id=widget.tool.id,
                    container_label=widget.tool.label,
                )
            )

    experiment.workspace.produce_basket_fractions = _build_surface_produce_fractions(
        experiment.workspace.produce_basket_lots,
        ensure_material_state_id,
        location_kind="produce_basket",
        location_id="basket",
        container_label="Produce basket",
    )

    for entry in experiment.trash.produce_lots:
        entry.produce_fraction = _build_trash_produce_fraction(entry, ensure_material_state_id)

    experiment.produce_material_states = material_states


def _collect_produce_lots(experiment: Experiment) -> dict[str, ProduceLot]:
    produce_lots: dict[str, ProduceLot] = {}

    def add(entries: Iterable[ProduceLot]) -> None:
        for produce_lot in entries:
            produce_lots.setdefault(produce_lot.id, produce_lot)

    if experiment.basket_tool is not None:
        add(experiment.basket_tool.produce_lots)
    add(experiment.workspace.produce_basket_lots)
    for slot in experiment.workbench.slots:
        add(slot.surface_produce_lots)
        if slot.tool is not None:
            add(slot.tool.produce_lots)
    for slot in experiment.rack.slots:
        if slot.tool is not None:
            add(slot.tool.produce_lots)
    for widget in experiment.workspace.widgets:
        add(widget.produce_lots)
        if widget.tool is not None:
            add(widget.tool.produce_lots)
    add(entry.produce_lot for entry in experiment.trash.produce_lots)
    return produce_lots


def _build_tool_produce_fractions(
    produce_lots: list[ProduceLot],
    ensure_material_state_id,
    *,
    location_kind: str,
    location_id: str,
    container_id: str | None,
    container_label: str | None,
) -> list[ProduceFraction]:
    return [
        ProduceFraction(
            id=f"produce_fraction_{produce_lot.id}_{location_id}",
            produce_lot_id=produce_lot.id,
            produce_material_state_id=ensure_material_state_id(produce_lot),
            mass_g=produce_lot.total_mass_g,
            unit_count=produce_lot.unit_count,
            is_contaminated=produce_lot.is_contaminated,
            location_kind=location_kind,
            location_id=location_id,
            container_id=container_id,
            container_label=container_label,
        )
        for produce_lot in produce_lots
    ]


def _build_surface_produce_fractions(
    produce_lots: list[ProduceLot],
    ensure_material_state_id,
    *,
    location_kind: str,
    location_id: str,
    container_label: str | None,
) -> list[ProduceFraction]:
    return [
        ProduceFraction(
            id=f"produce_fraction_{produce_lot.id}_{location_id}",
            produce_lot_id=produce_lot.id,
            produce_material_state_id=ensure_material_state_id(produce_lot),
            mass_g=produce_lot.total_mass_g,
            unit_count=produce_lot.unit_count,
            is_contaminated=produce_lot.is_contaminated,
            location_kind=location_kind,
            location_id=location_id,
            container_label=container_label,
        )
        for produce_lot in produce_lots
    ]


def _build_powder_fractions(
    powder_fractions,
    produce_lots_by_id: dict[str, ProduceLot],
    ensure_material_state_id,
    *,
    location_kind: str,
    location_id: str,
    container_id: str | None,
    container_label: str | None,
) -> list[ProduceFraction]:
    produce_fractions: list[ProduceFraction] = []
    for powder_fraction in powder_fractions:
        source_lot = produce_lots_by_id.get(powder_fraction.source_lot_id)
        if source_lot is None:
            source_lot = ProduceLot(
                id=powder_fraction.source_lot_id,
                label=powder_fraction.source_lot_id,
                produce_type="apple",
                total_mass_g=powder_fraction.mass_g,
                cut_state="ground",
            )
        produce_fractions.append(
            ProduceFraction(
                id=powder_fraction.id,
                produce_lot_id=source_lot.id,
                produce_material_state_id=ensure_material_state_id(source_lot, force_ground=True),
                mass_g=powder_fraction.mass_g,
                is_contaminated=source_lot.is_contaminated,
                location_kind=location_kind,
                location_id=location_id,
                container_id=container_id,
                container_label=container_label,
            )
        )
    return produce_fractions


def _build_trash_produce_fraction(entry: TrashProduceLotEntry, ensure_material_state_id) -> ProduceFraction:
    return ProduceFraction(
        id=f"produce_fraction_{entry.produce_lot.id}_{entry.id}",
        produce_lot_id=entry.produce_lot.id,
        produce_material_state_id=ensure_material_state_id(entry.produce_lot),
        mass_g=entry.produce_lot.total_mass_g,
        unit_count=entry.produce_lot.unit_count,
        is_contaminated=entry.produce_lot.is_contaminated,
        location_kind="trash",
        location_id=entry.id,
        container_label=entry.origin_label,
    )
